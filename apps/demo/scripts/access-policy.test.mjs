import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {accounts} from '../server/accounts.mjs';
import {actorForAction,isLineParticipant} from '../server/access-policy.mjs';
import {memoryStore} from '../server/memory-store.mjs';
import {metadataStore} from '../cloudflare/metadata-store.mjs';
import {sqliteImages} from '../cloudflare/sqlite-images.mjs';
import {createAtelierService} from '../server/atelier-core.mjs';
const first='a'.repeat(64),second='b'.repeat(64),third='c'.repeat(64),hash=value=>createHash('sha256').update(value).digest('hex');
const config={channelId:'1234567890',channelSecret:'f'.repeat(32),redirectUri:'https://app.example/?auth=line'};
const images={normalize:async bytes=>bytes,mean:async()=>[120,160,190],compose:async()=>Buffer.from('generated-public-image'),global:async()=>Buffer.from('global-image'),thumbnail:async()=>Buffer.from('thumbnail')};
function fixture(sqlite){
 let clock=Date.parse('2026-10-21T09:00:00Z'),db,store;
 if(sqlite){db=new DatabaseSync(':memory:');db.exec('CREATE TABLE rooms(key TEXT PRIMARY KEY,data TEXT NOT NULL,etag TEXT NOT NULL)');
  const storage={sql:{exec(query,...args){const statement=db.prepare(query);if(/^SELECT/.test(query))return {toArray:()=>statement.all(...args)};statement.run(...args);return {toArray:()=>[]};}},transactionSync(callback){db.exec('BEGIN');try{const value=callback();db.exec('COMMIT');return value;}catch(error){db.exec('ROLLBACK');throw error;}}};
  store=metadataStore(storage,sqliteImages(storage));
 }else store=memoryStore();
 const auth=accounts(store,{requireLine:true,images,now:()=>clock,lineConfig:config,verifyLine:async({code})=>({subject:'U'+(code==='other'?'2':'1').repeat(32),name:'Verified member'})});
 const legacy=accounts(store,{now:()=>clock});
 async function call(action,values={},credential=first){if(action.startsWith('account.'))return auth.execute({action,...values},credential);const actor=await actorForAction(auth,action,credential);return createAtelierService(store,{now:()=>clock,images,memberForCredential:()=>actor.member,publicOnly:!actor.account})({action,...values},credential);}
 async function login(credential=first,code='valid'){const start=await call('account.line.start',{},credential);return call('account.line',{state:start.state,code},credential);}
 const register=async(credential=first,code='valid')=>{const start=await call('account.line.start',{intent:'register'},credential);return call('account.line',{state:start.state,code},credential);};
 return {store,auth,legacy,call,login,register,advance:ms=>clock+=ms,close:()=>db?.close(),raw:createAtelierService(store,{now:()=>clock,images})};
}
for(const sqlite of [false,true]){
 const backend=sqlite?'SQLite':'memory';
 test(`LINE-only policy denies guest and legacy participation without mutating records (${backend})`,async()=>{
  const f=fixture(sqlite);try{
   for(const action of ['account.register','account.login','account.google'])await assert.rejects(f.call(action,{username:'test_person',password:'test-password-2026'}),e=>e.status===403&&e.code==='line_required');
   assert.deepEqual(await f.call('account.google.start'),{enabled:false});
   assert.deepEqual(await f.call('account.me'),{account:null});
   const before=await f.store.listJSON('rooms/');
   for(const action of ['create','join','leave','post','reuse','global.record','generate','draft','state','work','posts','post.photo','area','visibility.update','concept.update','push.subscribe','push.preferences','unknown.future.action'])await assert.rejects(f.call(action,{name:'Denied',capacity:2,code:'ABCDEFGH',lineLinked:true,account:{lineSubject:hash('forged')}}),e=>e.code==='line_required');
   assert.deepEqual(await f.store.listJSON('rooms/'),before);
   assert.deepEqual(await f.store.listJSON('accounts/'),[]);
   const legacy=await f.legacy.execute({action:'account.register',username:'legacy_person',password:'test-password-2026'},first);
   assert.deepEqual(await f.call('account.me',{},legacy.token),{account:null});
   await assert.rejects(f.call('create',{name:'Denied',capacity:2},legacy.token),e=>e.code==='line_required');
   await assert.rejects(f.call('account.update',{name:'Denied'},legacy.token),e=>e.code==='line_required');
   assert(!isLineParticipant({sessionKey:'fake',account:{lineLinked:true}}));
  }finally{f.close();}
 });
 test(`verified LINE sessions participate; logout and expiry revoke writes but preserve public viewing (${backend})`,async()=>{
  const f=fixture(sqlite);try{
   const signed=await f.register(),again=await f.login(second);
   assert.equal(signed.account.username,again.account.username);assert.equal(signed.account.lineLinked,true);
   const room=await f.call('create',{name:'Public atelier',capacity:2,visibility:'public'},signed.token);
   const other=await f.register(third,'other');assert.equal((await f.call('join',{code:room.code},other.token)).members,2);
   const photo='data:image/jpeg;base64,'+Buffer.from('photo').toString('base64');
   await f.call('post',{code:room.code,day:room.day,photo},signed.token);
   await f.call('global.record',{day:room.day,sourceCode:room.code},signed.token);
   await f.call('generate',{code:room.code,day:room.day},signed.token);
   assert.equal((await f.call('state',{code:room.code},again.token)).hasPhoto,true);
   await f.call('account.logout',{},signed.token);
   await assert.rejects(f.call('post',{code:room.code},signed.token),e=>e.code==='session_expired');
   assert.equal((await f.call('public.atelier',{code:room.code},signed.token)).works.length,1);
   f.advance(7*86400000);
   await assert.rejects(f.call('join',{code:room.code},again.token),e=>e.code==='session_expired');
   assert.equal((await f.call('directory',{},again.token)).ateliers.length,1);
   const global=await f.call('global',{day:room.day},again.token);assert.equal(global.area.pixels,0);assert.equal(global.x,undefined);assert.deepEqual(global.artworks,[]);
  }finally{f.close();}
 });
 test(`public completed works exclude private data and close immediately when visibility changes (${backend})`,async()=>{
  const f=fixture(sqlite);try{
   const signed=await f.register(),room=await f.call('create',{name:'Public atelier',capacity:2,visibility:'public'},signed.token),privateRoom=await f.call('create',{name:'Private atelier',capacity:2},signed.token);
   await f.call('post',{code:room.code,day:room.day,photo:'data:image/jpeg;base64,cGhvdG8='},signed.token);await f.call('generate',{code:room.code,day:room.day},signed.token);
   const overview=await f.call('public.atelier',{code:room.code},second),work=await f.call('public.work',{code:room.code,day:room.day},second);
   assert.equal(overview.works[0].day,room.day);assert(work.image.startsWith('data:image/png;base64,'));
   for(const value of [overview,work])for(const key of ['members','creator','custodian','seed','posts','photoKey','rects','area'])assert(!JSON.stringify(value).includes('"'+key+'"'));
   for(const action of ['preview','public.atelier','public.work'])await assert.rejects(f.call(action,{code:privateRoom.code,day:room.day},second),e=>e.status===404);
   assert.equal((await f.call('preview',{code:privateRoom.code},signed.token)).name,'Private atelier');
   await f.call('visibility.update',{code:room.code,visibility:'private'},signed.token);
   await assert.rejects(f.call('public.work',{code:room.code,day:room.day},second),e=>e.status===404);
   assert.deepEqual((await f.call('directory',{},second)).ateliers,[]);
  }finally{f.close();}
 });
 test(`legacy identity is hidden from public GLOBAL, then LINE verification preserves its account and membership (${backend})`,async()=>{
  const f=fixture(sqlite);try{
   const room=await f.raw({action:'create',name:'Existing atelier',capacity:2},first);
   await f.raw({action:'post',code:room.code,day:room.day,photo:'data:image/jpeg;base64,cGhvdG8='},first);
   await f.raw({action:'generate',code:room.code,day:room.day},first);
   await f.raw({action:'global.record',day:room.day,sourceCode:room.code},first);
   const guestGlobal=await f.call('global',{day:room.day},first);assert.equal(guestGlobal.x,undefined);assert.deepEqual(guestGlobal.artworks,[]);assert.equal(guestGlobal.area.pixels,0);
   const legacy=await f.legacy.execute({action:'account.register',username:'existing_person',password:'test-password-2026'},first);
   const linked=await f.login(legacy.token);assert.equal(linked.account.username,'existing_person');assert.equal(linked.account.ateliers[0].code,room.code);
   assert.equal((await f.call('state',{code:room.code},linked.token)).hasPhoto,true);
   assert.equal((await f.call('global',{day:room.day},linked.token)).area.pixels,1);
   await assert.rejects(f.call('account.login',{username:'existing_person',password:'test-password-2026'},second),e=>e.code==='line_required');
   const reauth=await f.call('account.line.start',{intent:'delete',confirmUsername:linked.account.username},linked.token);
   await f.call('account.line',{state:reauth.state,code:'valid'},linked.token);
   await assert.rejects(f.call('join',{code:room.code},linked.token),e=>e.code==='account_deleted');
   await assert.rejects(f.login(second),e=>e.code==='line_not_registered');
   const recreated=await f.register(second);assert.notEqual(recreated.account.username,linked.account.username);assert.deepEqual(recreated.account.ateliers,[]);
  }finally{f.close();}
 });
}
