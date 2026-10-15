// DEMO ONLY. One average-color pixel per participant and UTC day. No production generator.
import {createHash} from 'node:crypto';
import {ApiError} from './atelier-core.mjs';
import {listRecords} from './accounts.mjs';
import {compactGlobal} from '../src/global-layout.ts';
const digest=value=>createHash('sha256').update(value).digest('hex');
const dayKey=day=>`globals/${day}`;
export function globalService(store,{images,now=()=>Date.now()}={}){
 async function record(day,member,code,photo){
  const key=dayKey(day),source=digest(Buffer.from(photo)),color=await images.mean(photo);
  for(let attempt=0;attempt<20;attempt++){
   const row=await store.getWithMetadata(key,{type:'json'}),data=row?.data??{day,pixels:{},ateliers:[]};
   if(day!==new Date(now()).toISOString().slice(0,10))throw new ApiError(409,'window_closed');
   if(data.pixels[member]){if(data.pixels[member].source===source)return;throw new ApiError(409,'global_already_recorded');}
   if(!data.pixels[member]){
    const position=Object.values(data.pixels).reduce((last,pixel)=>Math.max(last,pixel.position),-1)+1;
    data.pixels[member]={position,color,source};
   }
   if(!data.ateliers.includes(code))data.ateliers.push(code);
   const result=await store.setJSON(key,data,row?{onlyIfMatch:row.etag}:{onlyIfNew:true});if(result.modified)return;
  }
  throw new ApiError(409,'retry');
 }
 async function view(day,member){
  const today=new Date(now()).toISOString().slice(0,10);
  if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day)||Number.isNaN(Date.parse(day+'T00:00:00Z'))||new Date(day+'T00:00:00Z').toISOString().slice(0,10)!==day||day>today)throw new ApiError(400,'invalid');
  const row=await store.getWithMetadata(dayKey(day),{type:'json'});if(!row||!Object.keys(row.data.pixels).length)return {day,image:null,count:0,outputSize:0,positions:[],ateliers:0,layout:'compact-v1',explicitRecording:true,area:{pixels:0,total:0,percent:0},final:day<today};
  const data=row.data,layout=compactGlobal(data.pixels),{outputSize}=layout,revision=digest(JSON.stringify({layout:'compact-v1',outputSize,pixels:layout.pixels.map(({position,color})=>({position,color}))})),key=`global/${day}/${revision}`;
  if(outputSize>4096)throw new ApiError(503,'global_full');
  let bytes=await store.get(key,{type:'arrayBuffer'});
  if(!bytes){const made=await images.global(layout.pixels,outputSize);await store.set(key,made,{onlyIfNew:true});bytes=await store.get(key,{type:'arrayBuffer'});}
  if(!bytes)throw new ApiError(503,'unavailable');
  const mine=layout.pixels.find(pixel=>pixel.member===member),all=await listRecords(store,'globals/'),total=outputSize*outputSize;
  return {day,image:`data:image/png;base64,${Buffer.from(bytes).toString('base64')}`,count:layout.pixels.length,outputSize,positions:layout.pixels.map(pixel=>pixel.position),ateliers:data.ateliers.length,cumulative:all.reduce((n,row)=>n+Object.keys(row.data.pixels).length,0),layout:'compact-v1',explicitRecording:true,area:{pixels:mine?1:0,total,percent:(mine?1:0)/total*100},final:day<today,...(mine?{x:mine.position%outputSize,y:Math.floor(mine.position/outputSize)}:{})};
 }
 return {record,view,async has(day,member){return Boolean((await store.getWithMetadata(dayKey(day),{type:'json'}))?.data.pixels[member]);}};
}
