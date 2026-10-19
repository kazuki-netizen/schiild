// DEMO ONLY. Fictional local population. No real API, credentials or accounts.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {memoryStore} from '../server/memory-store.mjs';
import {createAtelierService} from '../server/atelier-core.mjs';
import {images as codec} from '../server/atelier-service.mjs';
const root=new URL('../public/week/',import.meta.url),lastDay='2026-10-19',population=1000,roomCount=200;
const first=Date.parse(lastDay+'T00:00:00Z')-6*86400000,days=Array.from({length:7},(_,n)=>new Date(first+n*86400000).toISOString().slice(0,10));
const digest=value=>createHash('sha256').update(value).digest('hex'),chance=(...parts)=>parseInt(digest(parts.join('/')).slice(0,8),16)/0xffffffff;
let clock=first;const store=memoryStore(),meanCache=new Map(),images={...codec,async mean(bytes){const key=digest(Buffer.from(bytes));if(!meanCache.has(key))meanCache.set(key,await codec.mean(bytes));return meanCache.get(key);}},execute=createAtelierService(store,{now:()=>clock,images});
const names=['あお','はる','ゆい','りく','そら','なつ','まい','れん','なお','みお','けい','あき','さき','ゆう','かい','えま','しお','ひな','こう','りお','なぎ','つむぎ','ふう','たく','うた','せな','いと','はな','そう','るか','あん','ちひろ','みな','とわ','りん','かな','よう','まこ','ほの','あさ'];
const people=Array.from({length:population},(_,n)=>({username:'example_'+String(n+1).padStart(4,'0'),name:names[n%names.length]+' '+String(n+1).padStart(3,'0')})),credentials=people.map((_,n)=>digest('fictional-1000-person-'+n)),members=credentials.map(digest);
const templates=[['日々のかけら',''],['窓際のひととき','今日見つけた光'],['いつもの散歩道','外で見つけたもの'],['小さな机','手元の風景'],['朝の余白',''],['遠くの友だち',''],['週末のよりみち',''],['帰りみち','今日見つけた色'],['緑のある日','外で見つけたもの'],['いつもの仲間','']];
const definitions=Array.from({length:roomCount},(_,r)=>({code:'WK'+String(r+1).padStart(6,'0'),name:templates[r%10][0]+(r<10?'':' '+String(Math.floor(r/10)+1).padStart(2,'0')),concept:templates[r%10][1],capacity:12,visibility:r%10<7?'public':'private',people:Array.from({length:5},(_,n)=>r*5+n)}));
for(let person=0;person<population;person++){const destinations=person===0?[3,6]:chance('second',person)<.45?[(Math.floor(person/5)+7+person%19)%roomCount]:[];if(person&&chance('third',person)<.07)destinations.push((Math.floor(person/5)+43+person%11)%roomCount);for(const r of destinations)if(!definitions[r].people.includes(person))definitions[r].people.push(person);}
const joinDay=(r,person)=>Math.floor(person/5)===r?0:person===0?r===3?1:3:1+person%3;
for(let r=0;r<roomCount;r++)definitions[r].people.sort((a,b)=>joinDay(r,a)-joinDay(r,b)||a-b);
const credits=JSON.parse(await readFile(new URL('photos/credits.json',root),'utf8')),photoNumbers=credits.map(value=>value.imageNumber),desk=photoNumbers.filter(n=>n<10||[20,23,24,30,42,48,60,63].includes(n)),outside=photoNumbers.filter(n=>n>=10&&n<=19||[25,27,28,29,33].includes(n)),photoKeys=new Map();
for(const number of photoNumbers){const bytes=await codec.normalize(await readFile(new URL('photos/'+number+'.jpg',root))),key='photos/week/'+digest(bytes);await store.set(key,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));photoKeys.set(number,key);}
const daily=[],sources={},photoPlan=new Map();let posts=0;
for(let d=0;d<7;d++){
 const day=days[d],weekend=[0,6].includes(new Date(day+'T12:00:00Z').getUTCDay());clock=Date.parse(day+'T14:00:00Z');sources[day]={};const active=new Set(),globalPeople=new Set();let dayPosts=0;
 for(let r=0;r<roomCount;r++){
  const definition=definitions[r],row=await store.getWithMetadata('rooms/'+definition.code),room=row?.data??{...definition,creator:members[r*5],members:[],seed:Math.floor(chance('seed',r)*2147483647),days:{}};delete room.people;
  const joined=definition.people.filter(person=>joinDay(r,person)<=d);room.members=joined.map(person=>members[person]);
  const record={day,seed:parseInt(digest(definition.code+'/'+day+'/'+room.seed).slice(0,7),16),members:[...room.members],posts:{},status:'open',concept:room.concept,outputSize:256};
  for(let slot=0;slot<joined.length;slot++){
   const person=joined[slot],primary=Math.floor(person/5)===r,available=person===0?[true,true,false,true,true,true,true][d]:d===person%7||chance('present',person,d)<(weekend?.78:.68);
   if(r===5&&d===2||!(d===6&&[3,5].includes(r)||person===0&&available||available&&(primary||chance('overlap',person,d,r)<.68)))continue;
   const pool=r%10===3?desk:[2,8].includes(r%10)?outside:photoNumbers,number=pool[Math.floor(chance('photo',person,d,r)*pool.length)%pool.length];
   record.posts[slot]=photoKeys.get(number);photoPlan.set(person+'/'+day+'/'+room.code,number);active.add(person);dayPosts++;
  }
  room.days[day]=record;await store.setJSON('rooms/'+room.code,room,row?{onlyIfMatch:row.etag}:{onlyIfNew:true});
  for(const slot of Object.keys(record.posts).map(Number)){const person=joined[slot];if(!globalPeople.has(person)&&(person===0||chance('global',person,d)<.82)){await execute({action:'global.record',day,sourceCode:room.code},credentials[person]);globalPeople.add(person);sources[day][person]=room.code;}}
  if(Object.keys(record.posts).length&&(d<6||[3,5].includes(r)))await execute({action:'generate',code:room.code,day},credentials[r*5]);
 }
 posts+=dayPosts;daily.push({day,activePeople:active.size,globalPeople:globalPeople.size,posts:dayPosts});console.log(JSON.stringify({generatedDay:day,...daily.at(-1)}));
}
clock=Date.parse(lastDay+'T14:00:00Z');await Promise.all(['art','people','globals'].map(folder=>mkdir(new URL(folder+'/',root),{recursive:true})));
const assetCache=new Map(),commonGlobals={},globalPixels={};
async function asset(key,image){if(assetCache.has(key))return assetCache.get(key);const file=digest('white-v2/'+key).slice(0,24)+'.png';await writeFile(new URL('art/'+file,root),Buffer.from(image.split(',')[1],'base64'));const url='/week/art/'+file;assetCache.set(key,url);return url;}
for(const day of days){
 const global=await execute({action:'global',day},credentials[0]);global.image=await asset('global/'+day,global.image);delete global.x;delete global.y;delete global.area;global.artworks=[];
 const raw=(await store.getWithMetadata('globals/'+day)).data;globalPixels[day]=raw.pixels;
 for(let r=0;r<roomCount;r++){
  const room=(await store.getWithMetadata('rooms/'+definitions[r].code)).data,record=room.days[day];if(!Object.keys(record.posts).length)continue;
  const work=await execute({action:record.status==='ready'?'work':'draft',code:room.code,day},credentials[r*5]),positions=Object.entries(sources[day]).filter(([,code])=>code===room.code).map(([person])=>raw.pixels[members[Number(person)]].position);if(!positions.length)continue;
  global.artworks.push({code:room.code,name:room.name,day,image:await asset((record.status==='ready'?'':'draft/')+room.code+'/'+day,work.image),provisional:record.status!=='ready',positions});
 }
 const file='globals/'+day+'.json';await writeFile(new URL(file,root),JSON.stringify(global));commonGlobals[day]='/week/'+file;
}
const roomRows=await store.listJSON('rooms/'),allRooms=roomRows.map(({data:room})=>({code:room.code,name:room.name,capacity:room.capacity,concept:room.concept,members:room.members.length,total:Object.values(room.days).filter(record=>record.status==='ready').length})),directory=allRooms.filter((_,r)=>definitions[r].visibility==='public'),descriptors=[];
for(let person=0;person<population;person++){
 const owned=roomRows.filter(({data:room})=>room.members.includes(members[person])),profile={...people[person],since:days[0],canDelete:false,ateliers:owned.map(({data:room})=>({code:room.code,name:room.name,capacity:room.capacity,canGenerate:false})),custody:owned.flatMap(({data:room})=>Object.values(room.days).filter(record=>record.status==='ready'&&record.custodian===members[person]).map(record=>({code:room.code,name:room.name,day:record.day,index:record.index})))};
 const states={},works={},globals={},drafts={},photos={};
 for(const {data:room} of owned){
  const state=await execute({action:'state',code:room.code},credentials[person]);state.canGenerate=false;states[room.code]=state;
  for(const item of state.works){const work=await execute({action:'work',code:room.code,day:item.day},credentials[person]);work.image=await asset(room.code+'/'+item.day,work.image);works[room.code+'/'+item.day]=work;}
  if(state.status==='open'&&state.postedSlots.length){const draft=await execute({action:'draft',code:room.code,day:lastDay},credentials[person]);draft.image=await asset('draft/'+room.code+'/'+lastDay,draft.image);drafts[room.code]=draft;}
  const photo=photoPlan.get(person+'/'+lastDay+'/'+room.code);if(photo!==undefined)photos[room.code]='/week/photos/'+photo+'.jpg';
 }
 for(const day of days){const pixel=globalPixels[day][members[person]],size=Math.ceil(Math.sqrt(Object.keys(globalPixels[day]).length));globals[day]=pixel?{x:pixel.position%size,y:Math.floor(pixel.position/size)}:{};}
 const area=await execute({action:'area'},credentials[person]),file='people/'+people[person].username+'.json';await writeFile(new URL(file,root),JSON.stringify({profile,states,works,globals,drafts,photos,area}));descriptors.push({...people[person],file:'/week/'+file});if(person%200===0)console.log('Exported '+person+' viewpoints');
}
const metadata={fictional:true,people:population,ateliers:roomCount,days,firstDay:days[0],lastDay,posts,completedWorks:allRooms.reduce((sum,room)=>sum+room.total,0),daily,publicAteliers:directory.length};
await writeFile(new URL('world.json',root),JSON.stringify({version:2,lastDay,metadata,rooms:directory,allRooms,people:descriptors,globals:commonGlobals}));await writeFile(new URL('scenario.json',root),JSON.stringify({metadata,credits:'photos/credits.json'},null,2)+'\n');console.log(JSON.stringify(metadata));
