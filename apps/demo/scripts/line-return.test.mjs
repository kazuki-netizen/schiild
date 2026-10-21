import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import {saveLinePending,consumeLinePending} from '../src/line-pending.ts';
import {accounts} from '../server/accounts.mjs';
import {memoryStore} from '../server/memory-store.mjs';
const state='a'.repeat(64),other='b'.repeat(64),credential='c'.repeat(64),key='schiild.line.pending';
const memory=()=>{const data=Object.create(null);return new Proxy(data,{get(target,name){if(name==='getItem')return key=>target[key]??null;if(name==='setItem')return (key,value)=>{target[key]=String(value);};if(name==='removeItem')return key=>{delete target[key];};return target[name];}});};
const denied=new Proxy({},{get(){throw Error('storage_denied');}});
test('a return into a new Chrome tab retains state proof, expires, and cannot be replayed or guessed',()=>{
 const local=memory(),originalSession=memory(),time=Date.now(),pending={state,intent:'login',startedAt:time};
 saveLinePending(pending,{local,session:originalSession});
 assert.equal(consumeLinePending(other,{local,session:memory()},time),null);
 assert.deepEqual(consumeLinePending(state,{local,session:memory()},time),pending);
 assert.equal(consumeLinePending(state,{local,session:memory()},time),null);
 assert.equal(local.getItem(key+'.'+state),null);
 saveLinePending(pending,{local,session:originalSession});
 assert.equal(consumeLinePending(state,{local,session:memory()},time+300001),null);
 assert.equal(consumeLinePending(state,{local:memory(),session:memory()},time),null);
});
test('same-tab legacy returns work, denied storage fails safely, and unrelated saved data survives',()=>{
 const local=memory(),session=memory(),time=Date.now();
 local.setItem('schiild.account.session.v2','keep');local.setItem(key+'.'+other,JSON.stringify({state:other,intent:'login',startedAt:time-300001}));
 session.setItem(key,JSON.stringify({state,intent:'delete',startedAt:time}));
 assert.equal(consumeLinePending(state,{local,session},time).intent,'delete');assert.equal(session.getItem(key),null);
 saveLinePending({state,intent:'login',startedAt:time},{local,session:denied});
 assert.equal(local.getItem('schiild.account.session.v2'),'keep');assert.equal(local.getItem(key+'.'+other),null);
 assert(consumeLinePending(state,{local,session:denied},time));
 assert.throws(()=>saveLinePending({state,intent:'login',startedAt:time},{local:denied,session:denied}),/storage_unavailable/);
});
const source=await readFile(new URL('../src/line-login.ts',import.meta.url),'utf8'),compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function client(local,session,url,request){
 const exports={},location={href:url,assign(next){location.href=next;}},history={state:null,replaceState(_state,_title,next){location.href=new URL(next,location.href).href;}};
 vm.runInNewContext(compiled,{exports,window:{location},history,URL,Date,Error,require(name){if(name==='./preview-mode.ts')return {browserStorage:()=>local,browserSessionStorage:()=>session};if(name==='./line-pending.ts')return {saveLinePending,consumeLinePending};if(name==='./shared-api')return {sharedRequest:request};if(name==='./copy')return {t:key=>key};throw Error('Unexpected module '+name);}});
 return {api:exports,location};
}
test('actual client callback completes LINE account/session in another tab; wrong browser and replay still fail',async()=>{
 const local=memory(),session=memory(),config={channelId:'1234567890',channelSecret:'f'.repeat(32),redirectUri:'https://app.example/?auth=line'};
 const auth=accounts(memoryStore(),{requireLine:true,lineConfig:config,verifyLine:async()=>({subject:'U'+'1'.repeat(32),name:'Chrome member'})});
 const request=(action,values={})=>auth.execute({action,...values},credential);
 const original=client(local,session,'https://app.example/',request);await original.api.beginLine('register');
 const callbackState=new URL(original.location.href).searchParams.get('state'),callbackUrl='https://app.example/?auth=line&code=provider-code&state='+callbackState;
 const resumed=client(local,memory(),callbackUrl,request),callback=resumed.api.takeLineCallback();assert.equal(callback.invalid,false);assert.equal(resumed.location.href,'https://app.example/');
 const result=await resumed.api.completeLine(callback);assert.equal(result.account.lineLinked,true);assert.match(result.token,/^[a-f0-9]{64}$/);
 assert.equal((await auth.execute({action:'account.me'},result.token)).account.username,result.account.username);
 await assert.rejects(resumed.api.completeLine(callback),error=>['line_expired','unauthorized'].includes(error.code));
 const wrong=client(memory(),memory(),callbackUrl,()=>{throw Error('Unbound callback reached server');});assert.equal(wrong.api.takeLineCallback().invalid,true);
 await assert.rejects(wrong.api.completeLine({code:'provider-code',state:callbackState,invalid:true}),/demo.line.expired/);
 assert(!JSON.stringify(local).includes('provider-code'));assert(!JSON.stringify(local).includes(result.token));
});

test('LINE-only deletion returns into a second tab, removes memberships and all sessions, and never restores a profile',async()=>{
 const local=memory(),session=memory(),store=memoryStore(),config={channelId:'1234567890',channelSecret:'f'.repeat(32),redirectUri:'https://app.example/?auth=line'};
 const auth=accounts(store,{requireLine:true,lineConfig:config,verifyLine:async()=>({subject:'U'+'1'.repeat(32),name:'Deletion test'})});
 let token=credential;
 const request=(action,values={})=>auth.execute({action,...values},token);
 const original=client(local,session,'https://app.example/',request);await original.api.beginLine('register');
 const firstState=new URL(original.location.href).searchParams.get('state');
 const signed=client(local,memory(),'https://app.example/?auth=line&code=signup&state='+firstState,request);
 const account=await signed.api.completeLine(signed.api.takeLineCallback());token=account.token;
 assert.equal(account.account.hasPassword,false);
 const deletion=client(local,memory(),'https://app.example/',request);await deletion.api.beginLine('delete',account.account.username);
 const deleteState=new URL(deletion.location.href).searchParams.get('state');
 // A second tab starts an ordinary sign-in while the deletion confirmation is open.
 const other=client(local,memory(),'https://app.example/',request);await other.api.beginLine('login');
 const resumed=client(local,memory(),'https://app.example/?auth=line&code=delete&state='+deleteState,request),callback=resumed.api.takeLineCallback();
 assert.equal(callback.intent,'delete');assert.equal(callback.invalid,false);
 assert.deepEqual(await resumed.api.completeLine(callback),{deleted:true});
 assert.equal((await store.listJSON('accounts/')).length,0);assert.equal((await store.listJSON('line-identities/')).length,0);
 await assert.rejects(auth.execute({action:'account.me'},token),error=>error.code==='account_deleted');
 token='d'.repeat(64);const again=client(local,memory(),'https://app.example/',request);await again.api.beginLine('login');
 const retryState=new URL(again.location.href).searchParams.get('state'),retry=client(local,memory(),'https://app.example/?auth=line&code=login&state='+retryState,request);
 await assert.rejects(retry.api.completeLine(retry.api.takeLineCallback()),error=>error.code==='line_not_registered');
});

test('a deletion callback rejects a sign-in response instead of saving its token',async()=>{
 const resumed=client(memory(),memory(),'https://app.example/',async()=>({token:'d'.repeat(64),account:{username:'old'}}));
 await assert.rejects(resumed.api.completeLine({code:'delete',state,invalid:false,intent:'delete'}),/demo.delete.failed/);
});
