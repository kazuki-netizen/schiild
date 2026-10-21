import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {createAtelierService} from '../server/atelier-core.mjs';
import {memoryStore} from '../server/memory-store.mjs';
import {workerImages} from '../cloudflare/images.mjs';
import {visibleSchiils} from '../src/global-schiils.ts';
import {boundView} from '../src/global-view.ts';
const first='a'.repeat(64),second='b'.repeat(64),stranger='c'.repeat(64),digest=value=>createHash('sha256').update(value).digest('hex');
const photo=async color=>'data:image/jpeg;base64,'+(await sharp({create:{width:1080,height:1080,channels:3,background:color}}).jpeg().toBuffer()).toString('base64');
test('only explicitly recorded GLOBAL photos are shown at their exact compact coordinate, even outside the source atelier',async()=>{
 const store=memoryStore(),day='2026-10-19',call=createAtelierService(store,{images:workerImages,now:()=>Date.parse(day+'T12:00:00Z')}),room=await call({action:'create',name:'Source',capacity:2},first),red=await photo('#d05030'),blue=await photo('#709fc0');
 await call({action:'join',code:room.code},second);await call({action:'post',code:room.code,day,photo:red},first);await call({action:'post',code:room.code,day,photo:blue},second);
 assert.deepEqual((await call({action:'global.schiils',day,positions:[0,1]},stranger)).schiils.map(tile=>tile.image),[null,null]);
 await call({action:'global.record',sourceCode:room.code,day},first);const view=await call({action:'global',day},first),position=view.y*view.outputSize+view.x,tiles=await call({action:'global.schiils',day,positions:[position,position+1]},stranger);assert(tiles.schiils[0].image);assert.equal(tiles.schiils[1].image,null);
 const bytes=Buffer.from(tiles.schiils[0].image.split(',')[1],'base64'),image=await sharp(bytes).ensureAlpha().raw().toBuffer();assert.equal((await sharp(bytes).metadata()).width,256);assert(image[0]>image[2]*2);
 const serialized=JSON.stringify(tiles);for(const value of [first,digest(first),room.code,'photoKey','source','member'])assert(!serialized.includes(value));
 await call({action:'leave',code:room.code},first);assert.equal((await call({action:'global.schiils',day,positions:[position]},stranger)).schiils[0].image,tiles.schiils[0].image);
 await call({action:'global.record',day,photo:blue},second);const secondView=await call({action:'global',day},second),secondPosition=secondView.y*secondView.outputSize+secondView.x;const updatedFirst=await call({action:'global',day},first);assert.notEqual(secondPosition,updatedFirst.y*updatedFirst.outputSize+updatedFirst.x);assert((await call({action:'global.schiils',day,positions:[secondPosition]},stranger)).schiils[0].image);
 for(const positions of [[],Array.from({length:10},(_,n)=>n),[0,0],[-1],[.5],['0']])await assert.rejects(call({action:'global.schiils',day,positions},first),error=>error.code==='invalid');
 await assert.rejects(call({action:'global.schiils',day:'2026-02-30',positions:[0]},first),error=>error.code==='invalid');
});
test('retained legacy GLOBAL photos can be recovered exactly; a missing source never becomes fake art',async()=>{
 const store=memoryStore(),day='2026-10-19',call=createAtelierService(store,{images:workerImages,now:()=>Date.parse(day+'T12:00:00Z')}),room=await call({action:'create',name:'Legacy',capacity:2},first);await call({action:'post',code:room.code,day,photo:await photo('#70a0c0')},first);
 const saved=(await store.getWithMetadata('rooms/'+room.code)).data,key=saved.days[day].posts[0],source=key.split('/').at(-1);await store.setJSON('globals/'+day,{day,ateliers:[room.code],pixels:{[digest(first)]:{position:123,color:[70,100,120],source}}});
 assert((await call({action:'global.schiils',day,positions:[0]},stranger)).schiils[0].image);await store.setJSON('globals/'+day,{day,ateliers:[],pixels:{other:{position:0,color:[1,2,3],source:'f'.repeat(64)}}});assert.equal((await call({action:'global.schiils',day,positions:[0]},stranger)).schiils[0].image,null);
});
test('zoom requests only visible unique cells, and every occupied coordinate remains reachable',()=>{
 const resolution=26,positions=Array.from({length:665},(_,n)=>n),size=288;assert.deepEqual(visibleSchiils({scale:1,x:0,y:0},size,resolution,positions),[]);
 for(const position of positions){const x=position%resolution,y=Math.floor(position/resolution),scale=32,view=boundView({scale,x:(.5-(x+.5)/resolution)*size*scale,y:(.5-(y+.5)/resolution)*size*scale},size),tiles=visibleSchiils(view,size,resolution,positions);assert(tiles.some(tile=>tile.position===position));assert(tiles.length<10);assert.equal(new Set(tiles.map(tile=>tile.position)).size,tiles.length);}
 assert(visibleSchiils({scale:2,x:0,y:0},size,resolution,positions).length<256);
});

test('thumbnail requests reject a stale layout instead of showing another photo at the old coordinate',async()=>{
 const store=memoryStore(),day='2026-10-19',call=createAtelierService(store,{images:workerImages,now:()=>Date.parse(day+'T12:00:00Z')});
 await call({action:'global.record',day,photo:await photo('#d05030')},first);
 const before=await call({action:'global',day},first);assert.match(before.layoutRevision,/^[a-f0-9]{64}$/);
 assert((await call({action:'global.schiils',day,positions:[0],layoutRevision:before.layoutRevision},stranger)).schiils[0].image);
 await call({action:'global.record',day,photo:await photo('#709fc0')},second);
 await assert.rejects(call({action:'global.schiils',day,positions:[0],layoutRevision:before.layoutRevision},stranger),e=>e.code==='retry');
 const after=await call({action:'global',day},first),position=after.y*after.outputSize+after.x;
 assert.notEqual(after.layoutRevision,before.layoutRevision);
 const tile=(await call({action:'global.schiils',day,positions:[position],layoutRevision:after.layoutRevision},stranger)).schiils[0];
 const bytes=await sharp(Buffer.from(tile.image.split(',')[1],'base64')).raw().toBuffer();assert(bytes[0]>bytes[2]*2);
});
