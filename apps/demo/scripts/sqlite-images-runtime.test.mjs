import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {randomBytes} from 'node:crypto';
// Run against an isolated `wrangler dev --local` server configured with IMAGE_BACKEND=durable-sqlite.
const runtimeUrl=process.env.DEMO_SQLITE_WORKER_URL;
test('workerd stores, generates and restores private images entirely inside its SQLite Durable Object',{skip:!runtimeUrl},async()=>{
 assert(['127.0.0.1','localhost'].includes(new URL(runtimeUrl).hostname),'Use an isolated local test server');
 const mf={dispatchFetch:(url,init)=>fetch(new URL(new URL(url).pathname+new URL(url).search,runtimeUrl),init)};
 const first=randomBytes(32).toString('hex'),second=randomBytes(32).toString('hex');
 const call=async(action,values={},credential=first)=>{const response=await mf.dispatchFetch('https://schiild.app/api/atelier',{method:'POST',headers:{Authorization:'Bearer '+credential},body:JSON.stringify({action,...values})});const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));return result;};
  const room=await call('create',{name:'朝の窓',capacity:2});await call('join',{code:room.code},second);
  const bytes=await sharp({create:{width:1080,height:1080,channels:3,background:'#c39582'}}).jpeg().toBuffer(),photo='data:image/jpeg;base64,'+bytes.toString('base64');
  await call('post',{code:room.code,day:room.day,photo});await call('post',{code:room.code,day:room.day,photo},second);
  await call('generate',{code:room.code,day:room.day});const work=await call('work',{code:room.code,day:room.day});assert.equal(work.image,(await call('work',{code:room.code,day:room.day},second)).image);assert.equal((await sharp(Buffer.from(work.image.split(',')[1],'base64')).metadata()).width,256);
  await call('global.record',{sourceCode:room.code,day:room.day});const global=await call('global',{day:room.day});assert(global.count>=1);const schiils=await call('global.schiils',{day:room.day,positions:[global.y*global.outputSize+global.x]},second);assert.equal(schiils.schiils.length,1);assert.equal((await sharp(Buffer.from(schiils.schiils[0].image.split(',')[1],'base64')).metadata()).width,256);
  const account=await call('account.register',{username:'sqlite_'+Date.now().toString(36),password:'sqlite-test-password-29',name:'あさ'},first);assert.equal(account.account.ateliers.length,1);const login=await call('account.login',{username:account.account.username,password:'sqlite-test-password-29'},randomBytes(32).toString('hex'));assert.equal((await call('work',{code:room.code,day:room.day},login.token)).image,work.image);
  // The temporary import endpoint is unavailable without its migration secret.
  const url='https://schiild.app/api/migration/images?name='+'d'.repeat(64)+'.image';
  assert.equal((await mf.dispatchFetch(url)).status,404);
});
