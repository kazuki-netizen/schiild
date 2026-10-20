import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createECDH,randomBytes} from 'node:crypto';
import webpush from 'web-push';
import sharp from 'sharp';
import {accounts} from '../server/accounts.mjs';
import {memoryStore} from '../server/memory-store.mjs';
import {metadataStore} from '../cloudflare/metadata-store.mjs';
import {createAtelierService,images} from '../server/atelier-service.mjs';
import {notificationService,readPushConfig} from '../server/notifications.mjs';
import {pushDigest} from '../server/notification-events.mjs';
const config={...webpush.generateVAPIDKeys(),subject:'mailto:test@example.com'},password='notification-password-29';
const photo='data:image/jpeg;base64,'+(await sharp({create:{width:1080,height:1080,channels:3,background:'#c39582'}}).jpeg().toBuffer()).toString('base64');
const subscription=(name='device')=>{const key=createECDH('prime256v1');key.generateKeys();return {endpoint:'https://fcm.googleapis.com/fcm/send/'+name,keys:{p256dh:key.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}};};
function fixture(sqlite=false){
 let time=Date.parse('2026-10-19T03:00:00Z'),store,db;const now=()=>time;
 if(sqlite){db=new DatabaseSync(':memory:');db.exec('CREATE TABLE rooms(key TEXT PRIMARY KEY,data TEXT NOT NULL,etag TEXT NOT NULL)');const blobs=memoryStore();store=metadataStore({sql:{exec(query,...args){const statement=db.prepare(query),rows=query.startsWith('SELECT')?statement.all(...args):(statement.run(...args),[]);return {toArray:()=>rows};}},transactionSync(callback){db.exec('BEGIN');try{const result=callback();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}}},blobs,{notificationEvents:true,now});}
 else store=memoryStore({notificationEvents:true,now});
 const auth=accounts(store,{now}),sent=[],push=notificationService(store,{config,images,now,send:async(sub,payload)=>{sent.push({sub,payload});return {status:201};}});
 const call=async(action,values={},token)=>{const actor=await auth.identity(token);return action.startsWith('push.')?push.execute({action,...values},actor):createAtelierService(store,{now,memberForCredential:()=>actor.member})({action,...values},token);};
 const register=async(name,n)=>auth.execute({action:'account.register',username:name,password},String(n).repeat(64));
 const subscribe=(token,name='device',language='it')=>call('push.subscribe',{subscription:subscription(name),clientKey:'f'.repeat(64),language},token);
 return {db,store,auth,push,call,register,subscribe,sent,now,setTime:value=>time=Date.parse(value),advance:ms=>time+=ms};
}
for(const sqlite of [false,true])test(`post/ready/GLOBAL notifications, independent preferences, privacy and no replay (${sqlite?'SQLite':'memory'})`,async()=>{
 const f=fixture(sqlite),a=await f.register('first_member',1),b=await f.register('second_member',2),room=await f.call('create',{name:'Morning',capacity:2},a.token);await f.call('join',{code:room.code},b.token);
 await f.subscribe(a.token,'a','en');await f.subscribe(b.token,'b');f.advance(1);
 await f.call('post',{code:room.code,day:room.day,photo},a.token);await f.call('post',{code:room.code,day:room.day,photo},a.token);await f.push.drain();
 assert.equal(f.sent.length,1);assert.match(f.sent[0].sub.endpoint,/\/b$/);assert.equal(f.sent[0].payload.title,'Un nuovo schiil nel tuo atelier');assert(!JSON.stringify(f.sent[0].payload).includes(a.account.username));assert(!JSON.stringify(f.sent[0].payload).includes('data:image'));assert(!JSON.stringify(f.sent).includes(a.token));
 await f.call('push.preferences',{preferences:{atelierReady:false,globalReady:false,post:true}},b.token);f.advance(1);
 await f.call('generate',{code:room.code,day:room.day},a.token);await f.push.drain();assert.equal(f.sent.length,2);assert.match(f.sent[1].sub.endpoint,/\/a$/);assert.equal(f.sent[1].payload.title,'Your schiild is ready');
 await f.call('push.preferences',{preferences:{atelierReady:true,globalReady:true,post:true}},b.token);await f.push.drain();assert.equal(f.sent.length,2,'enabling later does not replay old events');
 await f.call('global.record',{sourceCode:room.code,day:room.day},a.token);f.setTime('2026-10-20T00:14:59Z');await f.push.finalizeGlobal();assert.equal((await f.store.listJSON('push-events/')).filter(row=>row.data.kind==='globalReady').length,0);
 f.setTime('2026-10-20T00:15:00Z');await f.push.finalizeGlobal();await f.push.finalizeGlobal();await f.push.drain();assert.equal(f.sent.length,4);assert.equal(f.sent[2].payload.title,'GLOBAL SCHIILD is ready');assert.equal(new URL(f.sent[2].payload.url,'https://test.example').searchParams.get('day'),room.day);await f.push.drain();assert.equal(f.sent.length,4);
 const late=await f.auth.execute({action:'account.login',username:'second_member',password},'3'.repeat(64));await f.subscribe(late.token,'late');await f.push.drain();assert.equal(f.sent.length,4,'new device does not replay');
 assert.equal((await f.call('push.config',{},late.token)).preferences.globalReady,true);assert.equal((await f.store.listJSON('push-events/')).filter(row=>row.data.kind==='globalReady').length,1);f.db?.close();
});
test('preferences, logout, leave, unsubscribe and session expiry suppress queued delivery',async()=>{
 for(const revoke of ['preference','logout','leave','unsubscribe','expiry']){
  const f=fixture(),a=await f.register('first_member',1),b=await f.register('second_member',2),room=await f.call('create',{name:'Morning',capacity:2},a.token);await f.call('join',{code:room.code},b.token);
  const sub=subscription();await f.call('push.subscribe',{subscription:sub,clientKey:'f'.repeat(64),language:'en'},b.token);f.advance(1);await f.call('post',{code:room.code,day:room.day,photo},a.token);
  if(revoke==='preference')await f.call('push.preferences',{preferences:{atelierReady:true,globalReady:true,post:false}},b.token);
  if(revoke==='logout')await f.auth.execute({action:'account.logout'},b.token);
  if(revoke==='leave')await f.call('leave',{code:room.code},b.token);
  if(revoke==='unsubscribe'){await f.call('push.unsubscribe',{endpoint:sub.endpoint,clientKey:'f'.repeat(64)},b.token);assert.equal((await f.call('push.state',{endpoint:sub.endpoint,clientKey:'f'.repeat(64)},b.token)).active,false);}
  if(revoke==='expiry')f.advance(7*86400000);
  await f.push.drain();assert.equal(f.sent.length,0,revoke);
 }
});
for(const sqlite of [false,true])test(`account deletion purges push metadata and rejects stale resurrection (${sqlite?'SQLite':'memory'})`,async()=>{
 const f=fixture(sqlite),a=await f.register('delete_member',1),b=await f.register('second_member',2),room=await f.call('create',{name:'Morning',capacity:2},b.token);await f.call('join',{code:room.code},a.token);await f.subscribe(a.token);f.advance(1);await f.call('post',{code:room.code,day:room.day,photo},b.token);
 const stale=(await f.store.listJSON('push-subscriptions/'))[0],member=stale.data.member;
 await f.auth.execute({action:'account.delete',confirmUsername:'delete_member',password},a.token);await f.push.drain();assert.equal(f.sent.length,0);
 assert.equal((await f.store.listJSON('push-subscriptions/')).length,0);assert.equal((await f.store.listJSON('push-preferences/')).length,0);assert((await f.store.listJSON('push-events/')).every(row=>!row.data.recipients.includes(member)));
 assert.equal((await f.store.setJSON(stale.key,stale.data,{onlyIfNew:true})).modified,false);f.db?.close();
});
test('endpoint validation, account/device proof and paused configuration',async()=>{
 const f=fixture(),a=await f.register('first_member',1),b=await f.register('second_member',2),sub=subscription();
 for(const endpoint of ['http://fcm.googleapis.com/push','https://localhost/','https://fcm.googleapis.com.evil.example/','https://fcm.googleapis.com:8443/','https://user:pass@fcm.googleapis.com/'])await assert.rejects(f.call('push.subscribe',{subscription:{...sub,endpoint},clientKey:'f'.repeat(64),language:'en'},a.token),error=>error.code==='push_invalid');
 await f.call('push.subscribe',{subscription:sub,clientKey:'f'.repeat(64),language:'en'},a.token);
 await assert.rejects(f.call('push.subscribe',{subscription:sub,clientKey:'f'.repeat(64),language:'en'},b.token),error=>error.status===403);
 await assert.rejects(f.call('push.unsubscribe',{endpoint:sub.endpoint,clientKey:'e'.repeat(64)},a.token),error=>error.status===403);
 assert.equal((await f.call('push.state',{endpoint:sub.endpoint,clientKey:'f'.repeat(64)},b.token)).active,false);
 const actor=await f.auth.identity(a.token),paused=notificationService(f.store,{config:null});assert.equal((await paused.execute({action:'push.config'},actor)).enabled,false);await assert.rejects(paused.execute({action:'push.subscribe',subscription:sub,clientKey:'f'.repeat(64),language:'en'},actor),error=>error.code==='push_unavailable');assert.equal(readPushConfig('not-json'),null);
});
test('retry backoff, expired subscriptions and concurrent drain leases',async()=>{
 const f=fixture(),a=await f.register('first_member',1),b=await f.register('second_member',2),room=await f.call('create',{name:'Morning',capacity:2},a.token);await f.call('join',{code:room.code},b.token);await f.subscribe(b.token);f.advance(1);await f.call('post',{code:room.code,day:room.day,photo},a.token);
 let attempts=0,status=503,release;const push=notificationService(f.store,{config,now:f.now,send:async()=>{attempts++;if(release)await new Promise(resolve=>{release.resolve=resolve;});return {status};}});
 await push.drain();await push.drain();assert.equal(attempts,1);f.advance(60000);status=201;release={};const first=push.drain();while(!release.resolve)await new Promise(resolve=>setImmediate(resolve));await push.drain();release.resolve();await first;assert.equal(attempts,2);await push.drain();assert.equal(attempts,2);
 const row=(await f.store.listJSON('push-events/'))[0];assert(row.data.complete);assert.equal((await f.store.listJSON('push-deliveries/'))[0].data.done,true);
 const expired={...row.data,eventId:pushDigest('expired'),complete:false,createdAt:f.now(),expiresAt:f.now()+1000};await f.store.setJSON(`push-events/${expired.eventId}`,expired,{onlyIfNew:true});status=410;release=null;await push.drain();assert((await f.store.listJSON('push-subscriptions/'))[0].data.disabled);f.advance(1001);await push.drain();assert.equal((await f.store.listJSON('push-events/')).some(row=>row.data.eventId===expired.eventId),false);
});
test('real Web Push encryption uses VAPID and never sends plaintext JSON',async()=>{
 const f=fixture(),a=await f.register('first_member',1),b=await f.register('second_member',2),room=await f.call('create',{name:'Morning',capacity:2},a.token);await f.call('join',{code:room.code},b.token);await f.subscribe(b.token);f.advance(1);await f.call('post',{code:room.code,day:room.day,photo},a.token);
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async(url,options)=>{calls++;assert.match(url,/^https:\/\/fcm\.googleapis\.com\//);assert.equal(options.redirect,'manual');assert.match(options.headers.Authorization,/^vapid t=/);assert.equal(options.headers['Content-Encoding'],'aes128gcm');assert(!Buffer.from(options.body).toString().includes('Morning'));return new Response(null,{status:201});};
 try{await notificationService(f.store,{config,now:f.now}).drain();assert.equal(calls,1);}finally{globalThis.fetch=original;}
});
test('bounded batches resume without dropping devices or repeating notifications',async()=>{
 const f=fixture(),a=await f.register('first_member',1),b=await f.register('second_member',2),room=await f.call('create',{name:'Morning',capacity:2},a.token);await f.call('join',{code:room.code},b.token);
 for(const [label,token] of [['a',a.token],['b',b.token]])for(let n=0;n<18;n++)await f.subscribe(token,label+n);
 f.advance(1);await f.call('post',{code:room.code,day:room.day,photo},a.token);await f.call('generate',{code:room.code,day:room.day},a.token);
 assert.equal(await f.push.drain(),f.now()+1000);assert.equal(f.sent.length,30);f.advance(1000);assert.equal(await f.push.drain(),null);assert.equal(f.sent.length,54);
 const pairs=f.sent.map(({sub,payload})=>sub.endpoint+payload.tag);assert.equal(new Set(pairs).size,54);await f.push.drain();assert.equal(f.sent.length,54);
});
test('failed or provisional images do not create ready notifications',async()=>{
 const f=fixture(),a=await f.register('first_member',1),b=await f.register('second_member',2),room=await f.call('create',{name:'Morning',capacity:2},a.token);await f.call('join',{code:room.code},b.token);await f.subscribe(b.token);f.advance(1);await f.call('post',{code:room.code,day:room.day,photo},a.token);await f.call('draft',{code:room.code,day:room.day},a.token);assert((await f.store.listJSON('push-events/')).every(row=>row.data.kind==='post'));
 await f.call('global.record',{sourceCode:room.code,day:room.day},a.token);f.setTime('2026-10-20T00:15:00Z');const failing=notificationService(f.store,{config,now:f.now,images:{...images,global:async()=>{throw Error('storage_unavailable');}}});await assert.rejects(failing.finalizeGlobal());assert((await f.store.listJSON('push-events/')).every(row=>row.data.kind!=='globalReady'));
 await f.push.finalizeGlobal();assert.equal((await f.store.listJSON('push-events/')).filter(row=>row.data.kind==='globalReady').length,1);
});
