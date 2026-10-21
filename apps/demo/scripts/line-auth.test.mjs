import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {lineVerifier,validLineConfig,readLineConfig} from '../server/line-identity.mjs';
import {accounts} from '../server/accounts.mjs';
import {memoryStore} from '../server/memory-store.mjs';
import {metadataStore} from '../cloudflare/metadata-store.mjs';
import {createAtelierService} from '../server/atelier-core.mjs';
const config={channelId:'1234567890',channelSecret:'f'.repeat(32),redirectUri:'https://app.example/?auth=line'},first='a'.repeat(64),second='b'.repeat(64),third='c'.repeat(64),subject='U'+'1'.repeat(32),otherSubject='U'+'2'.repeat(32),hash=value=>createHash('sha256').update(value).digest('hex');
function sqliteStore(){const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE rooms(key TEXT PRIMARY KEY,data TEXT NOT NULL,etag TEXT NOT NULL)');const storage={sql:{exec(query,...args){const statement=db.prepare(query);if(/^SELECT/.test(query))return {toArray:()=>statement.all(...args)};statement.run(...args);return {toArray:()=>[]};}},transactionSync(callback){db.exec('BEGIN');try{const result=callback();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}}};return {store:metadataStore(storage,{}),close:()=>db.close()};}
function fixture(store=memoryStore()){
 let clock=Date.parse('2026-10-15T09:00:00Z'),calls=[];
 const verifyLine=async value=>{calls.push(value);return {subject:value.code==='other'?otherSubject:subject,name:'LINE member'};};
 const auth=accounts(store,{lineConfig:config,now:()=>clock,verifyLine});
 const start=(credential=first,values={})=>auth.execute({action:'account.line.start',...values},credential);
 const finish=(start,credential=first,code='valid')=>auth.execute({action:'account.line',code,state:start.state},credential);
 return {auth,store,start,finish,calls,advance:ms=>clock+=ms};
}
test('LINE discovery is disabled without complete server configuration and exposes no secrets',async()=>{
 const auth=accounts(memoryStore());assert.deepEqual(await auth.execute({action:'account.line.config'},first),{enabled:false});await assert.rejects(auth.execute({action:'account.line.start'},first),e=>e.code==='line_unavailable');
 assert.equal(readLineConfig('{}'),null);assert.equal(validLineConfig({...config,redirectUri:'http://app.example/?auth=line'}),false);assert.equal(validLineConfig({...config,channelSecret:''}),false);assert.equal(validLineConfig(config),true);
 const f=fixture();assert.deepEqual(await f.auth.execute({action:'account.line.config'},first),{enabled:true});const value=await f.start(),url=new URL(value.url);
 assert.equal(url.origin,'https://access.line.me');assert.equal(url.searchParams.get('scope'),'openid profile');assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert(!JSON.stringify(value).includes(config.channelSecret));assert(!JSON.stringify(value).includes('code_verifier'));
});
test('paused LINE configuration hides discovery and refuses authentication without deleting existing accounts',async()=>{
 const store=memoryStore(),enabled=accounts(store,{lineConfig:config});
 const signed=await enabled.execute({action:'account.register',username:'paused_line_user',password:'test-password-2026'},first);
 const auth=accounts(store,{lineConfig:{...config,paused:true}});
 assert.equal(readLineConfig(JSON.stringify({...config,paused:true})),null);
 assert.deepEqual(await auth.execute({action:'account.line.config'},first),{enabled:false});
 for(const action of ['account.line.start','account.line'])await assert.rejects(auth.execute({action},first),error=>error.code==='line_unavailable');
 assert.equal((await auth.execute({action:'account.me'},signed.token)).account.username,'paused_line_user');
 const logged=await auth.execute({action:'account.login',username:'paused_line_user',password:'test-password-2026'},second);
 assert.equal(logged.account.username,'paused_line_user');
});
test('LINE code exchange uses server secret, PKCE and nonce and rejects forged/expired/wrong-app claims',async()=>{
 const clock=Date.now(),nonce='n'.repeat(64),requests=[];let overrides={},failure=0;
 const verify=lineVerifier(config,{now:()=>clock,fetcher:async(url,options)=>{const body=new URLSearchParams(options.body);requests.push({url,body});if(failure)return new Response('{}',{status:failure});if(url.endsWith('/token'))return Response.json({id_token:'signed-token',access_token:'never-stored'});return Response.json({iss:'https://access.line.me',aud:config.channelId,sub:subject,nonce,iat:clock/1000-1,exp:clock/1000+3600,auth_time:clock/1000-1,...overrides});}});
 const input={code:'one-time-code',verifier:'v'.repeat(64),nonce};assert.equal((await verify(input)).subject,subject);assert.equal(requests[0].body.get('client_secret'),config.channelSecret);assert.equal(requests[0].body.get('code_verifier'),input.verifier);assert.equal(requests[1].body.get('nonce'),nonce);
 for(const value of [{iss:'https://evil.example'},{aud:'wrong'},{nonce:'wrong'},{sub:'invalid'},{exp:clock/1000-1},{iat:clock/1000+120}]){overrides=value;await assert.rejects(verify(input),e=>e.code==='line_invalid');}
 overrides={auth_time:clock/1000-600};await assert.rejects(verify({...input,reauth:true}),e=>e.code==='line_invalid');overrides={};failure=400;await assert.rejects(verify(input),e=>e.code==='line_invalid');failure=503;await assert.rejects(verify(input),e=>e.code==='line_unavailable');
});
test('LINE challenges bind browser/state, expire and allow only one concurrent exchange',async()=>{
 const f=fixture(),start=await f.start(first,{intent:'register'});await f.start(second);
 await assert.rejects(f.finish(start,second),e=>e.code==='line_expired');await assert.rejects(f.auth.execute({action:'account.line',code:'valid',state:'0'.repeat(64)},first),e=>e.code==='line_expired');assert.equal(f.calls.length,0);
 const results=await Promise.allSettled([f.finish(start),f.finish(start)]);assert.equal(results.filter(value=>value.status==='fulfilled').length,1);assert.equal(f.calls.length,1);
 const expired=await f.start(third);f.advance(300001);await assert.rejects(f.finish(expired,third),e=>e.code==='line_expired');
});
for(const sqlite of [false,true])test(`LINE creates/restores accounts, links only authenticated accounts and deletes via fresh same-LINE proof (${sqlite?'SQLite':'memory'})`,async()=>{
 const storage=sqlite?sqliteStore():{store:memoryStore(),close(){}},f=fixture(storage.store);
 try{
  const room=await createAtelierService(f.store)({action:'create',name:'LINE atelier',capacity:2},first);
  const signed=await f.finish(await f.start(first,{intent:'register'}));assert.equal(signed.account.lineLinked,true);assert.equal(signed.account.hasPassword,false);assert.equal(signed.account.canDelete,true);assert.equal(signed.account.ateliers[0].code,room.code);
  const again=await f.finish(await f.start(second),second);assert.equal(again.account.username,signed.account.username);assert.equal((await f.auth.identity(again.token)).member,(await f.auth.identity(signed.token)).member);
  const password=await f.auth.execute({action:'account.register',username:'line_link_user',password:'line-test-password-29'},third);const conflict=await f.start(password.token);await assert.rejects(f.finish(conflict,password.token),e=>e.code==='line_conflict');
  const linked=await f.finish(await f.start(password.token),password.token,'other');assert.equal(linked.account.username,password.account.username);assert.equal(linked.account.hasPassword,true);
  await assert.rejects(f.auth.execute({action:'account.delete',confirmUsername:signed.account.username,password:'anything'},signed.token),e=>e.code==='delete_requires_password');
  const wrong=await f.start(signed.token,{intent:'delete',confirmUsername:signed.account.username});assert.equal(new URL(wrong.url).searchParams.get('max_age'),'0');await assert.rejects(f.finish(wrong,signed.token,'other'),e=>e.code==='line_invalid');assert((await f.auth.execute({action:'account.me'},signed.token)).account);
  const deletion=await f.start(signed.token,{intent:'delete',confirmUsername:signed.account.username});assert.deepEqual(await f.finish(deletion,signed.token),{deleted:true});assert.equal(f.calls.at(-1).reauth,true);
  await assert.rejects(f.auth.identity(again.token),e=>e.code==='account_deleted');assert.equal((await f.store.listJSON('line-identities/')).length,1);assert.equal((await f.store.listJSON('line-challenges/')).filter(row=>row.data.member===hash(first)).length,0);
  const restoredRoom=(await f.store.getWithMetadata('rooms/'+room.code)).data;assert(!restoredRoom.members.includes(hash(first)));
  await assert.rejects(f.finish(await f.start('d'.repeat(64)),'d'.repeat(64)),e=>e.code==='line_not_registered');
  const recreated=await f.finish(await f.start('d'.repeat(64),{intent:'register'}),'d'.repeat(64));assert.notEqual(recreated.account.username,signed.account.username);assert.deepEqual(recreated.account.ateliers,[]);
 }finally{storage.close();}
});
test('LINE registration and pending challenges cannot revive a deleted identity',async()=>{
 const f=fixture(),signed=await f.auth.execute({action:'account.register',username:'line_race',password:'line-test-password-29'},first),pending=await f.start(signed.token);
 await f.auth.execute({action:'account.delete',confirmUsername:'line_race',password:'line-test-password-29'},signed.token);
 await assert.rejects(f.finish(pending,signed.token),e=>e.code==='account_deleted');const mapping=await f.store.registerLine({username:'new_line_account',member:hash(first),lineSubject:hash(subject)});assert.equal(mapping.modified,false);
 assert.equal((await f.store.setJSON('line-challenges/'+hash(first),{member:hash(first)})).modified,false);
});

for(const sqlite of [false,true])test(`login never recreates a deleted LINE account; only explicit signup creates an empty account (${sqlite?'SQLite':'memory'})`,async()=>{
 const storage=sqlite?sqliteStore():{store:memoryStore(),close(){}},f=fixture(storage.store),fresh='d'.repeat(64);
 try{
  const missing=await f.start();
  await assert.rejects(f.auth.execute({action:'account.line',state:missing.state,code:'valid',intent:'register'},first),e=>e.code==='line_not_registered');
  assert.equal((await f.store.listJSON('accounts/')).length,0);assert.equal((await f.store.listJSON('sessions/')).length,0);
  const signed=await f.finish(await f.start(first,{intent:'register'}));
  const existing=await f.start(second,{intent:'register'});
  await assert.rejects(f.finish(existing,second),e=>e.code==='line_registered');
  assert.equal((await f.store.listJSON('accounts/')).length,1);
  const again=await f.finish(await f.start(second),second),pending=await f.start(again.token);
  const deletion=await f.start(signed.token,{intent:'delete',confirmUsername:signed.account.username});
  await f.finish(deletion,signed.token);
  for(const token of [signed.token,again.token])await assert.rejects(f.auth.identity(token),e=>e.code==='account_deleted');
  await assert.rejects(f.finish(pending,again.token),e=>e.code==='account_deleted');
  const before=await f.store.listJSON('accounts/');
  await assert.rejects(f.finish(await f.start(fresh),fresh),e=>e.code==='line_not_registered');
  assert.deepEqual(await f.store.listJSON('accounts/'),before);
  assert.equal((await f.store.listJSON('line-identities/')).length,0);
  const recreated=await f.finish(await f.start(fresh,{intent:'register'}),fresh);
  assert.notEqual(recreated.account.username,signed.account.username);assert.deepEqual(recreated.account.ateliers,[]);assert.deepEqual(recreated.account.custody,[]);
  assert.notEqual((await f.auth.identity(recreated.token)).member,(await f.store.getWithMetadata('sessions/'+hash(signed.token))).data.member);
 }finally{storage.close();}
});

test('concurrent explicit LINE registrations cannot create duplicates or overwrite an existing account',async()=>{
 const f=fixture(),starts=await Promise.all([f.start(first,{intent:'register'}),f.start(second,{intent:'register'})]);
 const results=await Promise.allSettled([f.finish(starts[0]),f.finish(starts[1],second)]);
 assert.equal(results.filter(row=>row.status==='fulfilled').length,1);
 assert.equal(results.filter(row=>row.status==='rejected'&&row.reason.code==='line_registered').length,1);
 assert.equal((await f.store.listJSON('accounts/')).length,1);assert.equal((await f.store.listJSON('line-identities/')).length,1);
});
