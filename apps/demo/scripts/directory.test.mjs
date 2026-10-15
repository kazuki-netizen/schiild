import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import sharp from 'sharp';
import {createAtelierService} from '../server/atelier-service.mjs';
import {memoryStore} from '../server/memory-store.mjs';
import {metadataStore} from '../cloudflare/metadata-store.mjs';
const first='a'.repeat(64),second='b'.repeat(64),outside='c'.repeat(64);
function fixture(kind){
 if(kind==='memory')return {store:memoryStore(),close:()=>{}};
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE rooms(key TEXT PRIMARY KEY,data TEXT NOT NULL,etag TEXT NOT NULL)');
 const storage={sql:{exec(query,...args){const statement=db.prepare(query),rows=query.startsWith('SELECT')?statement.all(...args):(statement.run(...args),[]);return {toArray:()=>rows};}},transactionSync(callback){db.exec('BEGIN');try{const result=callback();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}}};
 const binary=new Map();return {store:metadataStore(storage,{get:async key=>binary.get(key),set:async(key,value)=>{binary.set(key,value);return {modified:true};}}),close:()=>db.close()};
}
for(const kind of ['memory','SQLite']){
 test(`directory requires explicit publication and only the current creator may change visibility (${kind})`,async()=>{
  const {store,close}=fixture(kind),call=createAtelierService(store);
  try{
   const legacy=await call({action:'create',name:'Legacy secret',capacity:5},first),hidden=await call({action:'create',name:'Private secret',capacity:5,visibility:'private'},first),room=await call({action:'create',name:'Public window',concept:'朝の光',capacity:5,visibility:'public'},first);
   const row=await store.getWithMetadata('rooms/'+legacy.code);delete row.data.visibility;await store.setJSON('rooms/'+legacy.code,row.data);
   assert.equal((await call({action:'state',code:legacy.code},first)).visibility,'private');assert.equal(hidden.visibility,'private');
   let page=await call({action:'directory'},outside);assert.deepEqual(page.ateliers.map(item=>item.code),[room.code]);assert.deepEqual(Object.keys(page.ateliers[0]).sort(),['capacity','code','concept','members','name','total']);assert.equal(page.nextCursor,null);
   assert.equal((await call({action:'directory',query:legacy.code},outside)).ateliers.length,0);assert.equal((await call({action:'directory',query:'secret'},outside)).ateliers.length,0);
   await assert.rejects(call({action:'visibility.update',code:room.code,visibility:'private'},outside),error=>error.status===403);
   await call({action:'join',code:room.code},second);await assert.rejects(call({action:'visibility.update',code:room.code,visibility:'private'},second),error=>error.code==='visibility_forbidden');
   await call({action:'visibility.update',code:room.code,visibility:'private'},first);assert.equal((await call({action:'directory'},outside)).ateliers.length,0);
   assert.equal((await call({action:'preview',code:room.code},outside)).name,room.name);await call({action:'join',code:room.code},outside);
   await call({action:'leave',code:room.code},first);await assert.rejects(call({action:'visibility.update',code:room.code,visibility:'public'},first),error=>error.status===403);
   const published=await call({action:'visibility.update',code:room.code,visibility:'public'},second);assert.equal(published.visibility,'public');assert.equal((await call({action:'directory'},outside)).ateliers[0].members,2);
   for(const visibility of [null,false,1,'listed',{}]){await assert.rejects(call({action:'create',name:'Invalid',capacity:2,visibility},first),error=>error.code==='visibility_invalid');await assert.rejects(call({action:'visibility.update',code:room.code,visibility},second),error=>error.code==='visibility_invalid');}
  }finally{close();}
 });
 test(`directory searches normalized names/themes/codes and paginates without private metadata (${kind})`,async()=>{
  const {store,close}=fixture(kind),call=createAtelierService(store);
  try{
   const rooms=[];for(let n=0;n<30;n++)rooms.push(await call({action:'create',name:n===0?'Ｃａｆé의 창':`Window ${n}`,concept:'朝の光',capacity:2,visibility:'public'},first));
   const hidden=await call({action:'create',name:'Ｃａｆé의 창 secret',capacity:2},first),codes=[];let cursor;
   do{const page=await call({action:'directory',...(cursor?{cursor}:{})},outside);assert(page.ateliers.length<=24);codes.push(...page.ateliers.map(item=>item.code));cursor=page.nextCursor;}while(cursor);
   assert.equal(codes.length,30);assert.equal(new Set(codes).size,30);assert(!codes.includes(hidden.code));assert.deepEqual([...codes].sort(),codes);
   for(const query of ['café','의 창',rooms[0].code.toLowerCase()])assert.deepEqual((await call({action:'directory',query},outside)).ateliers.map(item=>item.code),[rooms[0].code]);
   assert.equal((await call({action:'directory',query:'朝の光'},outside)).ateliers.length,24);assert.equal((await call({action:'directory',query:"%' OR 1=1"},outside)).ateliers.length,0);
   for(const values of [{query:null},{query:[]},{query:'x'.repeat(81)},{cursor:'../../rooms'},{cursor:42}])await assert.rejects(call({action:'directory',...values},outside),error=>error.code==='invalid');
  }finally{close();}
 });
}
test('visibility changes preserve recorded photos, completed works and concurrent theme changes',async()=>{
 const store=memoryStore(),call=createAtelierService(store),room=await call({action:'create',name:'Archive',capacity:2},first);
 const photo='data:image/jpeg;base64,'+(await sharp({create:{width:1080,height:1080,channels:3,background:'#87a6b0'}}).jpeg().toBuffer()).toString('base64');
 await call({action:'post',code:room.code,day:room.day,photo},first);await call({action:'generate',code:room.code,day:room.day},first);
 const before=await call({action:'work',code:room.code,day:room.day},first),record=(await store.getWithMetadata('rooms/'+room.code)).data.days;
 await Promise.all([call({action:'visibility.update',code:room.code,visibility:'public'},first),call({action:'concept.update',code:room.code,day:room.day,concept:'Tomorrow'},first)]);
 const state=await call({action:'state',code:room.code},first);assert.equal(state.visibility,'public');assert.equal(state.defaultConcept,'Tomorrow');assert.equal(state.hasPhoto,true);assert.equal((await call({action:'directory'},outside)).ateliers[0].concept,before.concept);assert.equal((await call({action:'directory',query:'Tomorrow'},outside)).ateliers.length,0);assert.deepEqual((await store.getWithMetadata('rooms/'+room.code)).data.days,record);assert.equal((await call({action:'work',code:room.code,day:room.day},first)).image,before.image);
});
