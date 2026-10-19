// DEMO ONLY. One logical pixel per participant/day, with the recorded Schiil on zoom.
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
   // Keep only the explicitly selected GLOBAL photo, independently of atelier membership.
   // The opaque storage key is never sent to the browser and survives anonymization.
   const photoKey=`photos/${digest('global-schiil/'+source)}/${day}/${source}`;
   if(!await store.get(photoKey,{type:'arrayBuffer'}))await store.set(photoKey,photo,{onlyIfNew:true});
   if(!data.pixels[member]){
    const position=Object.values(data.pixels).reduce((last,pixel)=>Math.max(last,pixel.position),-1)+1;
    data.pixels[member]={position,color,source,code,photoKey};
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
  const data=row.data,layout=compactGlobal(data.pixels),{outputSize}=layout,revision=digest(JSON.stringify({layout:'compact-v1',background:'white-v2',outputSize,pixels:layout.pixels.map(({position,color})=>({position,color}))})),key=`global/${day}/${revision}`;
  if(outputSize>4096)throw new ApiError(503,'global_full');
  let bytes=await store.get(key,{type:'arrayBuffer'});
  if(!bytes){const made=await images.global(layout.pixels,outputSize);await store.set(key,made,{onlyIfNew:true});bytes=await store.get(key,{type:'arrayBuffer'});}
  if(!bytes)throw new ApiError(503,'unavailable');
  const mine=layout.pixels.find(pixel=>pixel.member===member),all=await listRecords(store,'globals/'),total=outputSize*outputSize,artworks=[];
  // A GLOBAL pixel is public; an atelier work still requires current membership.
  // Source photos and private works from other ateliers must never be serialized.
  for(const {data:room} of await listRecords(store,'rooms/')){
   const record=room.days[day];if(!room.members.includes(member)||record?.status!=='ready')continue;
   const positions=layout.pixels.filter(pixel=>{const original=data.pixels[pixel.member];return original.code?original.code===room.code:Object.values(record.posts).some(key=>key.endsWith('/'+original.source));}).map(pixel=>pixel.position);
   if(!positions.length)continue;const image=await store.get(`works/${room.code}/${day}`,{type:'arrayBuffer'});if(image)artworks.push({code:room.code,name:room.name,day,image:`data:image/png;base64,${Buffer.from(image).toString('base64')}`,provisional:false,positions});
  }
  return {day,image:`data:image/png;base64,${Buffer.from(bytes).toString('base64')}`,count:layout.pixels.length,outputSize,positions:layout.pixels.map(pixel=>pixel.position),ateliers:data.ateliers.length,cumulative:all.reduce((n,row)=>n+Object.keys(row.data.pixels).length,0),layout:'compact-v1',explicitRecording:true,area:{pixels:mine?1:0,total,percent:(mine?1:0)/total*100},final:day<today,artworks,...(mine?{x:mine.position%outputSize,y:Math.floor(mine.position/outputSize)}:{})};
 }
 async function schiils(day,positions){
  const today=new Date(now()).toISOString().slice(0,10);
  if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day+'T00:00:00Z'))||new Date(day+'T00:00:00Z').toISOString().slice(0,10)!==day||day>today||!Array.isArray(positions)||!positions.length||positions.length>9||new Set(positions).size!==positions.length||positions.some(position=>!Number.isInteger(position)||position<0||position>=4096*4096))throw new ApiError(400,'invalid');
  const row=await store.getWithMetadata(dayKey(day),{type:'json'});if(!row)return {schiils:positions.map(position=>({position,image:null}))};
  const data=row.data,layout=compactGlobal(data.pixels),rooms=[];
  // Older explicit GLOBAL records can reuse their exact retained source photo.
  // Never infer GLOBAL membership from unrelated atelier submissions.
  let loadedRooms=false;const result=[];
  for(const position of positions){
   const pixel=layout.pixels[position],original=pixel?data.pixels[pixel.member]:null;if(!original){result.push({position,image:null});continue;}
   const thumbnailKey=`global/${day}/${digest('schiil-thumb-v1/'+original.source)}`;let bytes=await store.get(thumbnailKey,{type:'arrayBuffer'});
   if(!bytes){let photo=original.photoKey?await store.get(original.photoKey,{type:'arrayBuffer'}):null;
    if(!photo){if(!loadedRooms){rooms.push(...await listRecords(store,'rooms/'));loadedRooms=true;}for(const {data:room} of rooms){if(original.code&&original.code!==room.code)continue;const key=Object.values(room.days[day]?.posts??{}).find(key=>key.endsWith('/'+original.source));if(key){const candidate=await store.get(key,{type:'arrayBuffer'});if(candidate&&digest(Buffer.from(candidate))===original.source){photo=candidate;break;}}}}
    if(photo){bytes=await images.thumbnail(photo);await store.set(thumbnailKey,bytes,{onlyIfNew:true});}
   }
   result.push({position,image:bytes?`data:image/png;base64,${Buffer.from(bytes).toString('base64')}`:null});
  }
  return {schiils:result};
 }
 return {record,view,schiils,async has(day,member){return Boolean((await store.getWithMetadata(dayKey(day),{type:'json'}))?.data.pixels[member]);}};
}
