import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {compactGlobal} from '../src/global-layout.ts';
import {globalService} from '../server/global-service.mjs';
import {memoryStore} from '../server/memory-store.mjs';
import {workerImages} from '../cloudflare/images.mjs';
import {createAtelierService} from '../server/atelier-service.mjs';

test('dense square layout uses every preceding cell without collisions or cropping',()=>{
 for(const count of [1,2,3,4,5,8,9,10,25,100,257,65537]){const input=Object.fromEntries(Array.from({length:count},(_,n)=>['member-'+n,{position:n*17,color:[n%256,12,34]}])),before=JSON.stringify(input),layout=compactGlobal(input);assert.equal(layout.outputSize,Math.ceil(Math.sqrt(count)));assert.equal(layout.pixels.length,count);assert.deepEqual(layout.pixels.map(pixel=>pixel.position),Array.from({length:count},(_,n)=>n));assert.equal(new Set(layout.pixels.map(pixel=>pixel.position)).size,count);assert.equal(JSON.stringify(input),before);}
 assert.deepEqual(compactGlobal({a:{position:7,color:[1,2,3]},b:{position:7,color:[4,5,6]}}).pixels.map(pixel=>pixel.position),[0,1]);
});
test('concurrent opt-in pixels across ateliers are unique, compact and unchanged after anonymization',async()=>{
 const store=memoryStore(),day='2026-10-15',service=globalService(store,{now:()=>Date.parse(day+'T03:00:00Z'),images:{...workerImages,mean:async photo=>[photo[0],120,90]}});
 for(let start=0;start<25;start+=5)await Promise.all(Array.from({length:5},(_,n)=>service.record(day,'member-'+(start+n),'ROOM'+n,Buffer.from([start+n]))));
 const result=await service.view(day,'member-0');assert.equal(result.outputSize,5);assert.equal(result.count,25);assert.equal(new Set(result.positions).size,25);assert.equal(result.area.total,25);assert.equal((await sharp(Buffer.from(result.image.split(',')[1],'base64')).metadata()).width,5);
 await service.record(day,'member-0','OTHER',Buffer.from([0]));await assert.rejects(service.record(day,'member-0','OTHER',Buffer.from([99])),error=>error.code==='global_already_recorded');assert.equal((await service.view(day,'member-0')).count,25);
 const row=await store.getWithMetadata('globals/'+day);row.data.pixels.anonymous=row.data.pixels['member-0'];delete row.data.pixels['member-0'];await store.setJSON('globals/'+day,row.data);assert.equal((await service.view(day,'anonymous')).image,result.image);
});
test('legacy sparse coordinates compact without modifying stored colors or reconstructing unselected posts',async()=>{
 const store=memoryStore(),day='2026-10-15',data={day,ateliers:['LEGACY01'],pixels:{first:{position:65000,color:[20,30,40]},second:{position:100,color:[50,60,70]}}};await store.setJSON('globals/'+day,data);
 const service=globalService(store,{images:workerImages,now:()=>Date.parse(day+'T03:00:00Z')}),result=await service.view(day,'first');assert.equal(result.outputSize,2);assert.deepEqual([result.x,result.y],[1,0]);assert.equal(result.area.total,4);assert.deepEqual((await store.getWithMetadata('globals/'+day)).data,data);
});
test('two devices selecting different GLOBAL photos concurrently cannot create a second daily pixel',async()=>{
 const store=memoryStore(),day='2026-10-15',service=globalService(store,{now:()=>Date.parse(day+'T03:00:00Z'),images:{...workerImages,mean:async photo=>[photo[0],120,90]}}),results=await Promise.allSettled([1,2].map(color=>service.record(day,'same-member','ROOM0001',Buffer.from([color]))));
 assert.equal(results.filter(result=>result.status==='fulfilled').length,1);assert.equal(results.find(result=>result.status==='rejected').reason.code,'global_already_recorded');const work=await service.view(day,'same-member');assert.equal(work.count,1);assert.equal(work.outputSize,1);
});
test('atelier recording does not enter GLOBAL; explicit selection is immutable, idempotent and renewed next UTC day',async()=>{
 const store=memoryStore();let clock=Date.parse('2026-10-15T03:00:00Z');const call=(body,credential='a'.repeat(64))=>createAtelierService(store,{now:()=>clock})(body,credential),photo=async color=>'data:image/jpeg;base64,'+(await sharp({create:{width:1080,height:1080,channels:3,background:color}}).jpeg().toBuffer()).toString('base64');
 const red=await photo('#c39582'),blue=await photo('#87a6b0'),room=await call({action:'create',name:'Source',capacity:2}),other=await call({action:'create',name:'Other',capacity:2}),day=room.day;
 await call({action:'post',code:room.code,day,photo:red});await call({action:'post',code:other.code,day,photo:blue});assert.equal((await call({action:'global',day})).image,null);assert.equal((await call({action:'area'})).global.pixels,0);assert.equal((await call({action:'posts'})).globalRecorded,false);
 await call({action:'global.record',sourceCode:room.code,day});await call({action:'global.record',sourceCode:room.code,day});assert.equal((await call({action:'posts'})).globalRecorded,true);assert.equal((await call({action:'global',day})).outputSize,1);assert.equal((await call({action:'area'})).global.pixels,1);
 await assert.rejects(call({action:'global.record',sourceCode:other.code,day}),error=>error.code==='global_already_recorded');await assert.rejects(call({action:'global.record',sourceCode:room.code,day},'b'.repeat(64)),error=>error.code==='source_forbidden');clock+=86400000;await assert.rejects(call({action:'global.record',sourceCode:room.code,day}),error=>error.code==='window_closed');assert.equal((await call({action:'posts'})).globalRecorded,false);
 const today=new Date(clock).toISOString().slice(0,10);await call({action:'global.record',day:today,photo:blue});assert.equal((await call({action:'global',day:today})).count,1);assert.equal((await call({action:'area'})).global.pixels,2);
});
