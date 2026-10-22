import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {accounts} from '../server/accounts.mjs';
import {memoryStore} from '../server/memory-store.mjs';
import {metadataStore} from '../cloudflare/metadata-store.mjs';
import {sqliteImages,imageFilename} from '../cloudflare/sqlite-images.mjs';
import {createAtelierService,images} from '../server/atelier-service.mjs';
import {lineDeauthorizer,lineVerifier} from '../server/line-identity.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex'),config={channelId:'1234567890',channelSecret:'f'.repeat(32),redirectUri:'https://app.example/?auth=line'};
const first='a'.repeat(64),second='b'.repeat(64),fresh='c'.repeat(64);
const photos=await Promise.all(['#c39582','#78a4bd'].map(async color=>'data:image/jpeg;base64,'+(await sharp({create:{width:1080,height:1080,channels:3,background:color}}).jpeg().toBuffer()).toString('base64')));
function fixture(sqlite){
 let db,store,binary;
 if(sqlite){db=new DatabaseSync(':memory:');db.exec('CREATE TABLE rooms(key TEXT PRIMARY KEY,data TEXT NOT NULL,etag TEXT NOT NULL)');
  const storage={sql:{exec(query,...args){const statement=db.prepare(query),rows=query.startsWith('SELECT')?statement.all(...args):(statement.run(...args),[]);return {toArray:()=>rows};}},transactionSync(callback){db.exec('BEGIN');try{const value=callback();db.exec('COMMIT');return value;}catch(error){db.exec('ROLLBACK');throw error;}}};binary=sqliteImages(storage);store=metadataStore(storage,binary);
 }else store=memoryStore();
 const unlinked=[];let unlinkFails=false;
 const auth=accounts(store,{requireLine:true,images,lineConfig:config,verifyLine:async({code})=>({subject:'U'+(code==='other'?'2':'1').repeat(32),name:'LINE private old name',deauthorize:async()=>{if(unlinkFails)throw Error('provider_unavailable');unlinked.push(code);}})});
 async function line(token,values={},code='valid'){const start=await auth.execute({action:'account.line.start',...values},token);return auth.execute({action:'account.line',state:start.state,code},token);}
 async function call(action,values,token){const actor=await auth.identity(token);return createAtelierService(store,{memberForCredential:()=>actor.member})({action,...values},token);}
 return {auth,store,db,binary,line,call,unlinked,setUnlinkFailure:value=>unlinkFails=value};
}
for(const sqlite of [false,true])test(`live LINE deletion removes originals and private data; rendered shared works survive and signup starts blank (${sqlite?'SQLite':'memory'})`,async()=>{
 const f=fixture(sqlite);
 try{
  const a=await f.line(first,{intent:'register'}),b=await f.line(second,{intent:'register'},'other');assert.equal(a.account.name,'');
  await f.auth.execute({action:'account.update',name:'Private old display name'},a.token);
  const room=await f.call('create',{name:'Shared work',capacity:2},a.token);await f.call('join',{code:room.code},b.token);
  await f.call('post',{code:room.code,day:room.day,photo:photos[0]},a.token);await f.call('post',{code:room.code,day:room.day,photo:photos[1]},b.token);
  await f.call('generate',{code:room.code,day:room.day},a.token);const work=await f.call('work',{code:room.code,day:room.day},b.token);
  await f.call('global.record',{sourceCode:room.code,day:room.day},a.token);await f.call('global.record',{sourceCode:room.code,day:room.day},b.token);
  const overview=await f.call('global',{day:room.day},a.token),member=(await f.auth.identity(a.token)).member,ownPosition=overview.y*overview.outputSize+overview.x;
  const before=(await f.store.getWithMetadata('rooms/'+room.code)).data,own=before.days[room.day].posts[0],other=before.days[room.day].posts[1],orphan=`photos/${member}/${room.day}/${'d'.repeat(64)}`;
  await f.store.set(orphan,Buffer.from('unreferenced private upload'));
  await f.line(a.token,{intent:'delete',confirmUsername:a.account.username});assert.equal(f.unlinked.length,1);
  for(const key of [own,orphan]){assert.equal(await f.store.get(key,{type:'arrayBuffer'}),null);if(sqlite){assert.equal(f.binary.info(imageFilename(key)),null);assert.equal(f.db.prepare('SELECT count(*) AS n FROM image_chunks WHERE name=?').get(imageFilename(key)).n,0);}}
  assert(await f.store.get(other,{type:'arrayBuffer'}));if(sqlite)assert.equal(f.db.prepare('SELECT count(*) AS n FROM photo_members WHERE member=?').get(member).n,0);
  assert.equal((await f.call('work',{code:room.code,day:room.day},b.token)).image,work.image);
  const after=await f.call('global',{day:room.day},b.token);assert.equal(after.image,overview.image);assert.equal(after.layoutRevision,overview.layoutRevision);
  assert((await f.call('global.schiils',{day:room.day,positions:[ownPosition],layoutRevision:after.layoutRevision},b.token)).schiils[0].image);
  assert.equal((await f.store.set(own,Buffer.from('late private upload'))).modified,false);assert.equal(await f.store.get(own),null);
  const metadata=JSON.stringify(await f.store.listJSON(''));assert(!metadata.includes('Private old display name'));assert(!metadata.includes(a.account.username));
  await assert.rejects(f.auth.identity(a.token),error=>error.code==='account_deleted');
  await assert.rejects(f.line(fresh),error=>error.code==='line_not_registered');const next=await f.line(fresh,{intent:'register'});assert.equal(next.account.name,'');assert.notEqual(next.account.username,a.account.username);assert.deepEqual(next.account.ateliers,[]);assert.deepEqual(next.account.custody,[]);
  assert.equal((await f.call('area',{},next.token)).global.pixels,0);
 }finally{f.db?.close();}
});
test('a failed LINE unlink does not claim deletion or erase the local account',async()=>{
 const f=fixture(false),a=await f.line(first,{intent:'register'});f.setUnlinkFailure(true);await assert.rejects(f.line(a.token,{intent:'delete',confirmUsername:a.account.username}));assert((await f.auth.execute({action:'account.me'},a.token)).account);assert.equal(f.unlinked.length,0);
});
test('SQLite photo purge and account erasure roll back together if deleting image chunks fails',async()=>{
 const f=fixture(true);try{
  const a=await f.line(first,{intent:'register'}),room=await f.call('create',{name:'Atomic erasure',capacity:2},a.token);await f.call('post',{code:room.code,day:room.day,photo:photos[0]},a.token);
  const before=(await f.store.getWithMetadata('rooms/'+room.code)).data,key=before.days[room.day].posts[0];
  f.db.exec("CREATE TRIGGER fail_photo_delete BEFORE DELETE ON image_chunks BEGIN SELECT RAISE(ABORT,'disk_failure'); END;");
  await assert.rejects(f.line(a.token,{intent:'delete',confirmUsername:a.account.username}));
  assert((await f.auth.execute({action:'account.me'},a.token)).account);assert(await f.store.get(key,{type:'arrayBuffer'}));assert.deepEqual((await f.store.getWithMetadata('rooms/'+room.code)).data,before);
 }finally{f.db.close();}
});
test('an unfinished shared work can still generate after its departed contributor’s original is erased',async()=>{
 const f=fixture(false),a=await f.line(first,{intent:'register'}),b=await f.line(second,{intent:'register'},'other'),room=await f.call('create',{name:'Still open',capacity:2},a.token);
 await f.call('join',{code:room.code},b.token);await f.call('post',{code:room.code,day:room.day,photo:photos[0]},a.token);await f.call('post',{code:room.code,day:room.day,photo:photos[1]},b.token);
 await f.line(a.token,{intent:'delete',confirmUsername:a.account.username});assert.deepEqual((await f.call('state',{code:room.code},b.token)).postedSlots,[0,1]);
 await f.call('generate',{code:room.code,day:room.day},b.token);assert((await f.call('work',{code:room.code,day:room.day},b.token)).image);
});
test('LINE unlink uses fresh server-only channel/user tokens and refuses provider failure',async()=>{
 const requests=[];let status=204;
 const unlink=lineDeauthorizer(config,'private-user-token',{fetcher:async(url,options)=>{
  requests.push({url,options});const request=new Request(url,options);
  if(url.endsWith('/v3/token')){assert.equal(request.headers.get('content-type'),'application/x-www-form-urlencoded');return Response.json({access_token:'private-channel-token'});}
  // Match LINE's actual wire contract: form data fails with HTTP 415.
  if(request.headers.get('content-type')!=='application/json')return new Response(null,{status:415});
  assert.deepEqual(await request.json(),{userAccessToken:'private-user-token'});return new Response(null,{status});
 }});
 await unlink();assert.equal(requests[0].url,'https://api.line.me/oauth2/v3/token');assert.equal(requests[0].options.body.get('client_secret'),config.channelSecret);assert.equal(requests[1].options.headers.Authorization,'Bearer private-channel-token');assert.equal(requests[1].options.redirect,'manual');status=503;await assert.rejects(unlink(),error=>error.code==='line_unavailable');
});

test('full LINE callback unlinks via JSON, invalidates every session and permits only an empty explicit signup',async()=>{
 const proofs=new Map();let unlinkRequests=0;
 const verify=lineVerifier(config,{fetcher:async(url,options)=>{
  const request=new Request(url,options),path=new URL(url).pathname;
  if(path==='/user/v1/deauthorize'){
   if(request.headers.get('content-type')!=='application/json')return new Response(null,{status:415});
   assert.equal(request.headers.get('authorization'),'Bearer channel-test-token');
   assert.deepEqual(await request.json(),{userAccessToken:'user-test-token'});unlinkRequests++;return new Response(null,{status:204});
  }
  assert.equal(request.headers.get('content-type'),'application/x-www-form-urlencoded');
  const body=new URLSearchParams(await request.text());assert.equal(body.get('client_id'),config.channelId);
  if(path==='/oauth2/v3/token'){assert.equal(body.get('grant_type'),'client_credentials');return Response.json({access_token:'channel-test-token'});}
  if(path==='/oauth2/v2.1/token'){
   const proof=proofs.get(body.get('code'));assert(proof);assert.equal(hash(body.get('code_verifier')),proof.verifierHash);assert.equal(body.get('redirect_uri'),config.redirectUri);
   return Response.json({access_token:'user-test-token',id_token:body.get('code')});
  }
  assert.equal(path,'/oauth2/v2.1/verify');const proof=proofs.get(body.get('id_token'));assert(proof);assert.equal(body.get('nonce'),proof.nonce);
  const seconds=Math.floor(Date.now()/1000);return Response.json({iss:'https://access.line.me',aud:config.channelId,sub:'U'+'1'.repeat(32),nonce:proof.nonce,iat:seconds,exp:seconds+3600,name:'Old LINE display name'});
 }});
 const store=memoryStore(),auth=accounts(store,{requireLine:true,images,lineConfig:config,verifyLine:verify});let sequence=0;
 async function line(token,intent='login',confirmUsername){
  const start=await auth.execute({action:'account.line.start',intent,confirmUsername},token),params=new URL(start.url).searchParams,code='test-code-'+(++sequence);
  // Find the server-held verifier to validate the provider exchange in this fixture.
  const challenge=(await store.listJSON('line-challenges/')).find(row=>row.data.stateHash===hash(start.state)).data;
  proofs.set(code,{nonce:params.get('nonce'),verifierHash:hash(challenge.verifier)});
  return auth.execute({action:'account.line',code,state:start.state,expectedIntent:intent},token);
 }
 const a=await line(first,'register'),otherSession=await line(second);
 await auth.execute({action:'account.update',name:'Private profile'},a.token);
 assert.deepEqual(await line(a.token,'delete',a.account.username),{deleted:true});assert.equal(unlinkRequests,1);
 for(const token of [a.token,otherSession.token])await assert.rejects(auth.execute({action:'account.me'},token),error=>error.code==='account_deleted');
 await assert.rejects(line(fresh),error=>error.code==='line_not_registered');const next=await line(fresh,'register');
 assert.notEqual(next.account.username,a.account.username);assert.equal(next.account.name,'');assert.deepEqual(next.account.ateliers,[]);assert.deepEqual(next.account.custody,[]);
});
