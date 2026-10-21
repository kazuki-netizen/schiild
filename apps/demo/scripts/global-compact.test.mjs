import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {compactGlobal} from '../src/global-layout.ts';
import {globalService} from '../server/global-service.mjs';
import {memoryStore} from '../server/memory-store.mjs';
import {workerImages} from '../cloudflare/images.mjs';
import {createAtelierService} from '../server/atelier-service.mjs';

test('dense square layout uses every preceding cell without collisions or cropping',()=>{
 for(const count of [1,2,3,4,5,8,9,10,25,100,257,65537]){const input=Object.fromEntries(Array.from({length:count},(_,n)=>['member-'+n,{position:n*17,orderKey:createHash('sha256').update('rank-'+n).digest('hex').slice(0,32),color:[n%256,12,34]}])),before=JSON.stringify(input),layout=compactGlobal(input);assert.equal(layout.outputSize,Math.ceil(Math.sqrt(count)));assert.equal(layout.pixels.length,count);assert.deepEqual(layout.pixels.map(pixel=>pixel.position),Array.from({length:count},(_,n)=>n));assert.equal(new Set(layout.pixels.map(pixel=>pixel.position)).size,count);assert.equal(JSON.stringify(input),before);}
 assert.throws(()=>compactGlobal({a:{position:7,color:[1,2,3]}}),/global_layout_uninitialized/);
});

test('saved random rank determines placement independently of posting order, member IDs or object enumeration',()=>{
 const a={position:0,orderKey:'f'.repeat(32),color:[1,2,3]},b={position:2,orderKey:'1'.repeat(32),color:[4,5,6]},c={position:1,orderKey:'8'.repeat(32),color:[7,8,9]};
 const expected=[[4,5,6],[7,8,9],[1,2,3]];
 for(const input of [{a,b,c},{z:c,x:a,y:b},{third:b,first:c,second:a}])assert.deepEqual(compactGlobal(input).pixels.map(pixel=>pixel.color),expected);
});

test('live GLOBAL saves unique random ranks and expands to the smallest square as records arrive',async()=>{
 const store=memoryStore(),day='2026-10-21',service=globalService(store,{now:()=>Date.parse(day+'T03:00:00Z'),images:{...workerImages,mean:async photo=>[photo[0],120,90]}});
 for(let n=0;n<64;n++){
  await service.record(day,'member-'+String(n).padStart(3,'0'),'ROOM0001',Buffer.from([n]));
  if([1,2,4,5,9,10,16,17,64].includes(n+1)){
   const view=await service.view(day,'member-000');assert.equal(view.count,n+1);assert.equal(view.outputSize,Math.ceil(Math.sqrt(n+1)));assert.equal(view.area.total,view.outputSize**2);
   assert.equal(view.positions.length,n+1);assert.equal(new Set(view.positions).size,n+1);
   assert.equal((await sharp(Buffer.from(view.image.split(',')[1],'base64')).metadata()).width,view.outputSize);
  }
 }
 const data=(await store.getWithMetadata('globals/'+day)).data,layout=compactGlobal(data.pixels);
 assert.equal(new Set(Object.values(data.pixels).map(pixel=>pixel.orderKey)).size,64);
 assert.notDeepEqual(layout.pixels.map(pixel=>pixel.member),Object.keys(data.pixels));
 assert.notDeepEqual(layout.pixels.map(pixel=>pixel.member),Object.keys(data.pixels).sort());
 const copies=await Promise.all(Array.from({length:4},()=>service.view(day,'member-000')));assert(copies.every(copy=>copy.image===copies[0].image&&copy.x===copies[0].x&&copy.y===copies[0].y));
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
 const service=globalService(store,{images:workerImages,now:()=>Date.parse(day+'T03:00:00Z')}),result=await service.view(day,'first');assert.equal(result.outputSize,2);assert(Number.isInteger(result.x)&&Number.isInteger(result.y));assert.equal(result.area.total,4);const saved=(await store.getWithMetadata('globals/'+day)).data;for(const member of ['first','second']){assert.match(saved.pixels[member].orderKey,/^[a-f0-9]{32}$/);const {orderKey,...original}=saved.pixels[member];assert.deepEqual(original,data.pixels[member]);}assert.equal((await service.view(day,'first')).image,result.image);
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
