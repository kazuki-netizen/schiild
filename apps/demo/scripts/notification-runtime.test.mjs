import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {realpathSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createECDH,randomBytes} from 'node:crypto';
import sharp from 'sharp';
import webpush from 'web-push';
const bundle=process.env.DEMO_WORKER_BUNDLE;
test('workerd encrypts queued Web Push through Durable Object alarms and revokes it on logout',{skip:!bundle},async()=>{
 const require=createRequire(import.meta.url),wranglerRequire=createRequire(realpathSync(require.resolve('wrangler/package.json'))),{Miniflare,convertV4MiniflareOptions}=await import(pathToFileURL(wranglerRequire.resolve('miniflare')).href);
 const config={...webpush.generateVAPIDKeys(),subject:'mailto:test@example.com'},blobs=new Map(),sent=[];
 const mf=new Miniflare(convertV4MiniflareOptions({name:'push-test',scriptPath:bundle,modules:true,compatibilityDate:'2026-10-08',compatibilityFlags:['nodejs_compat'],durableObjects:{ATELIERS:{className:'AtelierDirectory',useSQLite:true}},bindings:{ALLOWED_ORIGINS:'http://localhost:8085',XSERVER_STORAGE_URL:'https://schiild.pickleballnavi.jp/storage.php',XSERVER_STORAGE_SECRET:'f'.repeat(64),WEB_PUSH_CONFIG:JSON.stringify(config)},outboundService:async request=>{
  const url=new URL(request.url);if(url.hostname==='fcm.googleapis.com'){const bytes=Buffer.from(await request.arrayBuffer());assert.equal(request.headers.get('Content-Encoding'),'aes128gcm');assert.match(request.headers.get('Authorization'),/^vapid t=/);assert(!bytes.toString().includes('Morning'));sent.push(url.href);return new Response(null,{status:201});}
  assert.equal(url.hostname,'schiild.pickleballnavi.jp');const key=url.searchParams.get('key');if(request.method==='PUT'){if(blobs.has(key))return new Response(null,{status:200});blobs.set(key,await request.arrayBuffer());return new Response(null,{status:201});}return blobs.has(key)?new Response(blobs.get(key)):new Response(null,{status:404});
 }}));
 const call=async(action,values={},token='1'.repeat(64))=>{const response=await mf.dispatchFetch('https://api.example/api/atelier',{method:'POST',headers:{Origin:'http://localhost:8085',Authorization:'Bearer '+token},body:JSON.stringify({action,...values})});const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));return data;};
 try{
  const a=await call('account.register',{username:'runtime_first',password:'runtime-password-29'}),b=await call('account.register',{username:'runtime_second',password:'runtime-password-29'},'2'.repeat(64)),room=await call('create',{name:'Morning',capacity:2},a.token);await call('join',{code:room.code},b.token);
  assert.equal((await call('push.config',{},b.token)).publicKey,config.publicKey);const key=createECDH('prime256v1');key.generateKeys();await call('push.subscribe',{subscription:{endpoint:'https://fcm.googleapis.com/fcm/send/runtime',keys:{p256dh:key.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}},clientKey:'e'.repeat(64),language:'it'},b.token);
  const photo='data:image/jpeg;base64,'+(await sharp({create:{width:1080,height:1080,channels:3,background:'#c39582'}}).jpeg().toBuffer()).toString('base64');await call('post',{code:room.code,day:room.day,photo},a.token);
  for(let n=0;n<50&&!sent.length;n++)await new Promise(resolve=>setTimeout(resolve,100));assert.equal(sent.length,1,'alarm delivers without a public drain endpoint');
  await call('account.logout',{},b.token);await call('generate',{code:room.code,day:room.day},a.token);await new Promise(resolve=>setTimeout(resolve,1500));assert.equal(sent.length,1);
  const direct=await mf.dispatchFetch('https://api.example/api/atelier',{method:'POST',headers:{Authorization:'Bearer '+a.token},body:JSON.stringify({action:'push.drain'})});assert.equal(direct.status,400);
 }finally{await mf.dispose();}
});
