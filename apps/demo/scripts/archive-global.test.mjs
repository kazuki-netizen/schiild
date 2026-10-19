import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {createAtelierService,images} from '../server/atelier-service.mjs';
import {memoryStore} from '../server/memory-store.mjs';
import {voidColor} from '../src/engine.ts';
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

test('native and Worker codecs keep GLOBAL padding white and share the same quiet void mosaic',async()=>{
 const versions=[];
 for(const codec of [images,workerImages]){
  const png=await codec.global([{position:0,color:[20,30,40]},{position:1,color:[50,60,70]}],2),pixels=await sharp(png).ensureAlpha().raw().toBuffer();
  assert.deepEqual([...pixels.subarray(8)],[255,255,255,255,255,255,255,255]);
  const empty=await codec.compose([{x:0,y:0,w:128,h:128,slot:0}],async()=>null,3,256),raw=await sharp(empty).ensureAlpha().raw().toBuffer();assert(raw.every(value=>value>=246));versions.push(raw);
 }
 assert.deepEqual(versions[0],versions[1]);
});

test('native and Worker daily backgrounds agree in GLOBAL padding and atelier void cells',async()=>{
 const versions=[];for(const day of ['2026-10-19','2026-10-20'])for(const codec of [images,workerImages]){
  const global=await codec.global([{position:0,color:[20,30,40]}],2,day),pixels=await sharp(global).ensureAlpha().raw().toBuffer();assert.deepEqual([...pixels.subarray(0,4)],[20,30,40,255]);for(let position=1;position<4;position++)assert.deepEqual([...pixels.subarray(position*4,position*4+4)],[...voidColor(position%2,Math.floor(position/2),0,day),255]);
  const empty=await codec.compose([{x:0,y:0,w:128,h:128,slot:0}],async()=>null,3,256,day),raw=await sharp(empty).ensureAlpha().raw().toBuffer();assert.deepEqual([...raw.subarray(0,4)],[...voidColor(0,0,3,day),255]);versions.push(raw);
 }assert.deepEqual(versions[0],versions[1]);assert.deepEqual(versions[2],versions[3]);assert.notDeepEqual(versions[0],versions[2]);
});
