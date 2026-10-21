import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const source=await readFile(new URL('../src/shared-api.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function fixture(){
 const data=new Map([['schiild.account.session.v2','a'.repeat(64)]]),events=[],exports={};let complete;
 const storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
 vm.runInNewContext(compiled,{exports,process:{env:{}},Event,window:{dispatchEvent:event=>events.push(event.type)},fetch:()=>new Promise(resolve=>complete=resolve),require(name){if(name==='./preview-mode.ts')return {isWeekPreview:false,browserStorage:()=>storage};if(name==='./copy')return {t:key=>key};throw Error('Unexpected module '+name);}});
 return {api:exports,events,storage,fail(error){complete({ok:false,json:async()=>({error})});}};
}
test('a delayed deleted/expired response for an old session cannot erase a freshly signed-in account',async()=>{
 for(const code of ['account_deleted','session_expired','unauthorized','line_required']){
  const f=fixture(),pending=f.api.sharedRequest('account.me');
  f.api.saveSession('b'.repeat(64));f.fail(code);await assert.rejects(pending);
  assert.deepEqual(f.events,[]);assert.equal(f.api.currentSession(),'b'.repeat(64));
 }
});
test('deletion of the current session still invalidates the browser exactly once',async()=>{
 const f=fixture();for(let n=0;n<2;n++){const pending=f.api.sharedRequest('account.me');f.fail('account_deleted');await assert.rejects(pending);}
 assert.deepEqual(f.events,['schiild:account-deleted']);
});
