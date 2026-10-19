import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {createAtelierService,images} from '../server/atelier-service.mjs';
import {memoryStore} from '../server/memory-store.mjs';
import {workerImages} from '../cloudflare/images.mjs';

test('GLOBAL archive lists recorded days only; linked atelier art requires membership',async()=>{
 const store=memoryStore();let now=Date.parse('2026-10-18T03:00:00Z');const run=createAtelierService(store,{now:()=>now}),first='a'.repeat(64),other='b'.repeat(64);
 const room=await run({action:'create',name:'Shared work',capacity:2},first),photo='data:image/jpeg;base64,'+(await sharp({create:{width:1080,height:1080,channels:3,background:'#87a6b0'}}).jpeg().toBuffer()).toString('base64');
 await run({action:'post',code:room.code,day:room.day,photo},first);assert.deepEqual((await run({action:'global.archive'},first)).days,[]);
 await run({action:'global.record',sourceCode:room.code,day:room.day},first);await run({action:'generate',code:room.code,day:room.day},first);
 const view=await run({action:'global',day:room.day},first),work=await run({action:'work',code:room.code,day:room.day},first);
 assert.equal(view.artworks.length,1);assert.equal(view.artworks[0].image,work.image);assert.deepEqual(view.artworks[0].positions,[0]);
 const stranger=await run({action:'global',day:room.day},other);assert.equal(stranger.image,view.image);assert.deepEqual(stranger.artworks,[]);
 now+=86400000;await run({action:'global.record',day:'2026-10-19',photo},other);assert.deepEqual((await run({action:'global.archive'},first)).days.map(entry=>entry.day),['2026-10-19','2026-10-18']);
});

test('native and Worker codecs keep empty GLOBAL cells and unposted atelier regions white',async()=>{
 for(const codec of [images,workerImages]){
  const png=await codec.global([{position:0,color:[20,30,40]},{position:1,color:[50,60,70]}],2),pixels=await sharp(png).ensureAlpha().raw().toBuffer();
  assert.deepEqual([...pixels.subarray(8)],[255,255,255,255,255,255,255,255]);
  const empty=await codec.compose([{x:0,y:0,w:128,h:128,slot:0}],async()=>null,3,256),raw=await sharp(empty).ensureAlpha().raw().toBuffer();assert(raw.every(value=>value===255));
 }
});
