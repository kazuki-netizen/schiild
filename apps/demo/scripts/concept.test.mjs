import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {createAtelierService} from '../server/atelier-service.mjs';
import {memoryStore} from '../server/memory-store.mjs';
const first='a'.repeat(64),second='b'.repeat(64);
const photo='data:image/jpeg;base64,'+(await sharp({create:{width:1080,height:1080,channels:3,background:'#c39582'}}).jpeg().toBuffer()).toString('base64');
function setup(){const store=memoryStore();let clock=Date.parse('2026-10-15T03:00:00Z');const execute=createAtelierService(store,{now:()=>clock});return {store,execute,nextDay:()=>clock+=86400000};}

test('optional themes retain free photography and invalid input cannot create or change an atelier',async()=>{
 const {store,execute}=setup();
 for(const concept of ['x'.repeat(81),null,42,{},[]])await assert.rejects(execute({action:'create',name:'Window',capacity:2,concept},first),error=>error.code==='concept_invalid');
 for(const concept of [undefined,'','  \n\t ']){const room=await execute({action:'create',name:'Window',capacity:2,concept},first);assert.equal(room.concept,'');assert.equal(room.defaultConcept,'');assert.equal((await execute({action:'preview',code:room.code},second)).concept,'');}
 const room=await execute({action:'create',name:'Window',capacity:2,concept:'  朝の\n光  '},first),code=room.code;assert.equal(room.concept,'朝の 光');
 const before=(await store.getWithMetadata('rooms/'+code,{type:'json'})).data;
 await assert.rejects(execute({action:'concept.update',code,day:room.day,concept:'x'.repeat(81)},first),error=>error.code==='concept_invalid');
 await execute({action:'join',code},second);
 const joined=(await store.getWithMetadata('rooms/'+code,{type:'json'})).data;
 await assert.rejects(execute({action:'concept.update',code,day:room.day,concept:'Changed'},second),error=>error.status===403&&error.code==='concept_forbidden');
 assert.deepEqual((await store.getWithMetadata('rooms/'+code,{type:'json'})).data,joined);assert.equal(before.concept,joined.concept);
});

test('creator changes sync to participants, keep image bytes unchanged and carry forward until cleared',async()=>{
 const {execute,nextDay}=setup(),room=await execute({action:'create',name:'Window',capacity:2,concept:'朝の光'},first),code=room.code,day=room.day;
 await execute({action:'join',code},second);assert.equal((await execute({action:'state',code},second)).concept,'朝の光');
 await execute({action:'post',code,day,photo,concept:'ignored'},second);
 const before=await execute({action:'draft',code,day},second);
 const changed=await execute({action:'concept.update',code,day,concept:'青いもの'},first);assert.equal(changed.concept,'青いもの');
 const draft=await execute({action:'draft',code,day},second);assert.equal(draft.concept,'青いもの');assert.equal(draft.image,before.image);assert.deepEqual(draft.area,before.area);
 await execute({action:'generate',code,day},first);const work=await execute({action:'work',code,day},second);assert.equal(work.concept,'青いもの');assert.equal(work.image,before.image);
 const scheduled=await execute({action:'concept.update',code,day,concept:'夕方の色'},first);assert.equal(scheduled.concept,'青いもの');assert.equal(scheduled.defaultConcept,'夕方の色');assert.equal(scheduled.works[0].concept,'青いもの');
 assert.equal((await execute({action:'preview',code},second)).concept,'青いもの');assert.equal((await execute({action:'work',code,day},second)).image,work.image);
 nextDay();const tomorrow=await execute({action:'state',code},second);assert.equal(tomorrow.concept,'夕方の色');assert.equal(tomorrow.defaultConcept,'夕方の色');assert.equal(tomorrow.hasPhoto,false);
 await assert.rejects(execute({action:'concept.update',code,day,concept:'stale'},first),error=>error.code==='window_closed');
 nextDay();const later=await execute({action:'state',code},first);assert.equal(later.concept,'夕方の色');const cleared=await execute({action:'concept.update',code,day:later.day,concept:'  '},first);assert.equal(cleared.concept,'');assert.equal(cleared.defaultConcept,'');
 assert.equal((await execute({action:'work',code,day},second)).concept,'青いもの');nextDay();assert.equal((await execute({action:'state',code},first)).concept,'');
});

test('a change racing with generation cannot rewrite the sealed theme',async()=>{
 const {store,execute,nextDay}=setup(),room=await execute({action:'create',name:'Window',capacity:2,concept:'Today'},first),code=room.code,day=room.day;
 await execute({action:'post',code,day,photo},first);
 let notify,release,paused=false;const reached=new Promise(resolve=>notify=resolve),gate=new Promise(resolve=>release=resolve),original=store.setJSON.bind(store);
 store.setJSON=async(key,value,options)=>{const result=await original(key,value,options);if(key==='rooms/'+code&&value.days[day]?.status==='generating'&&result.modified&&!paused){paused=true;notify();await gate;}return result;};
 const pending=execute({action:'generate',code,day},first);
 try{await reached;const next=await execute({action:'concept.update',code,day,concept:'Tomorrow'},first);assert.equal(next.concept,'Today');assert.equal(next.defaultConcept,'Tomorrow');}finally{release();}
 await pending;assert.equal((await execute({action:'work',code,day},first)).concept,'Today');nextDay();assert.equal((await execute({action:'state',code},first)).concept,'Tomorrow');
});

test('legacy completed works stay without a theme while current creator permissions can transfer',async()=>{
 const {store,execute,nextDay}=setup(),room=await execute({action:'create',name:'Legacy',capacity:2},first),code=room.code,day=room.day;
 await execute({action:'join',code},second);await execute({action:'post',code,day,photo},first);await execute({action:'generate',code,day},first);const work=await execute({action:'work',code,day},first);
 const {data}=await store.getWithMetadata('rooms/'+code,{type:'json'});delete data.concept;delete data.days[day].concept;await store.setJSON('rooms/'+code,data);
 await execute({action:'leave',code},first);const next=await execute({action:'concept.update',code,day,concept:'<img src=x onerror=alert(1)>'},second);assert.equal(next.concept,'');assert.equal(next.defaultConcept,'<img src=x onerror=alert(1)>');
 const historical=await execute({action:'work',code,day},second);assert.equal(historical.concept,'');assert.equal(historical.image,work.image);nextDay();assert.equal((await execute({action:'state',code},second)).concept,'<img src=x onerror=alert(1)>');
});
