// DEMO ONLY. Generate an explicitly fictional, read-only week with the demo services.
// No public API, credential store, production generator or shared database is accessed.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {memoryStore} from '../server/memory-store.mjs';
import {createAtelierService} from '../server/atelier-service.mjs';
import {accounts} from '../server/accounts.mjs';
const root=new URL('../public/week/',import.meta.url),lastDay='2026-10-19',first=Date.parse(lastDay+'T00:00:00Z')-6*86400000;
const days=Array.from({length:7},(_,n)=>new Date(first+n*86400000).toISOString().slice(0,10));
let clock=first+9*3600000;
const store=memoryStore(),auth=accounts(store,{now:()=>clock}),execute=createAtelierService(store,{now:()=>clock});
const digest=value=>createHash('sha256').update(value).digest('hex'),chance=(...parts)=>parseInt(digest(parts.join('/')).slice(0,8),16)/0xffffffff;
const names=['あお','はる','ゆい','りく','そら','なつ','まい','れん','なお','みお','けい','あき','さき','ゆう','かい','えま','しお','ひな','こう','りお','なぎ','つむぎ','ふう','たく','うた','せな','いと','はな','そう','るか','あん','ちひろ','みな','とわ','りん','かな','よう','まこ','ほの','あさ'];
const credentials=names.map((_,n)=>digest('fictional-week-browser-'+n)),people=[],tokens=[];
for(let n=0;n<40;n++){const result=await auth.execute({action:'account.register',username:'example_'+String(n+1).padStart(2,'0'),password:digest('fictional-not-published-password-'+n),name:names[n]},credentials[n]);people.push(result.account);tokens.push(result.token);}
const definitions=[
 {name:'日々のかけら',concept:'',capacity:12,members:[0,1,2,3,4,9,17,26],visibility:'public'},
 {name:'窓際の5人',concept:'今日見つけた光',capacity:5,members:[4,5,6,7,11],visibility:'private'},
 {name:'いつもの散歩道',concept:'外で見つけたもの',capacity:12,members:[8,9,10,11,2,22],visibility:'public'},
 {name:'小さな机',concept:'手元の風景',capacity:5,members:[12,13,14,15,0],visibility:'public'},
 {name:'朝の余白',concept:'',capacity:12,members:[16,17,18,19,5,27,31],visibility:'public'},
 {name:'遠くの友だち',concept:'',capacity:5,members:[20,21,22,23],visibility:'private'},
 {name:'週末のよりみち',concept:'',capacity:12,members:[24,25,26,27,0,6],visibility:'public'},
 {name:'帰りみち',concept:'今日見つけた色',capacity:5,members:[28,29,30,31,8],visibility:'public'},
 {name:'緑のある日',concept:'外で見つけたもの',capacity:12,members:[32,33,34,35,13,23],visibility:'public'},
 {name:'いつもの仲間',concept:'',capacity:12,members:[36,37,38,39,7,19,29],visibility:'private'},
];
const credits=JSON.parse(await readFile(new URL('photos/credits.json',root),'utf8'));
const photoNumbers=credits.map(value=>value.imageNumber),desk=photoNumbers.filter(n=>n<10||[20,23,24,30,42,48,60,63].includes(n)),outside=photoNumbers.filter(n=>n>=10&&n<=19||[25,27,28,29,33].includes(n));
const photos=new Map(await Promise.all(photoNumbers.map(async number=>[number,'data:image/jpeg;base64,'+(await readFile(new URL('photos/'+number+'.jpg',root))).toString('base64')])));
const rooms=[],plan=[],daily=[];
const joinDay=(room,person)=>room===0&&person===26?2:room===3&&person===0?1:room===6&&person===0?3:person===38?3:person===39?4:0;
for(let dayIndex=0;dayIndex<7;dayIndex++){
 const day=days[dayIndex],weekend=[0,6].includes(new Date(day+'T12:00:00Z').getUTCDay());clock=Date.parse(day+'T09:30:00Z');
 if(dayIndex===0)for(let r=0;r<10;r++){
  const definition=definitions[r],room=await execute({action:'create',name:definition.name,concept:definition.concept,capacity:definition.capacity,visibility:definition.visibility},credentials[definition.members[0]]);rooms.push(room);
 }
 for(let r=0;r<10;r++)for(const person of definitions[r].members.slice(1))if(joinDay(r,person)===dayIndex)await execute({action:'join',code:rooms[r].code},credentials[person]);
 const globalPeople=new Set(),active=new Set(),posted=[];
 for(let r=0;r<10;r++){
  const definition=definitions[r],room=rooms[r],completeToday=[3,5].includes(r);if(r===5&&dayIndex===2)continue;
  for(const person of definition.members){
   if(joinDay(r,person)>dayIndex)continue;
   const primary=Math.floor(person/4)===r;
   const available=person===0?[true,true,false,true,true,true,true][dayIndex]:dayIndex===person%7||chance('present',person,dayIndex)<(weekend?.78:.68);
   const wants=available&&(primary||chance('overlap',person,dayIndex,r)<.68);
   const post=dayIndex===6&&completeToday||person===0&&available||wants;
   if(!post)continue;
   const pool=r===3?desk:[2,8].includes(r)?outside:photoNumbers;
   const number=pool[Math.floor(chance('photo',person,dayIndex,r)*pool.length)%pool.length];
   await execute({action:'post',code:room.code,day,photo:photos.get(number)},credentials[person]);
   active.add(person);posted.push({person,code:room.code,photoNumber:number});plan.push({day,room:r,person,photoNumber:number});
   if(!globalPeople.has(person)&&(person===0||chance('global',person,dayIndex)<.82)){
    await execute({action:'global.record',day,sourceCode:room.code},credentials[person]);globalPeople.add(person);
   }
  }
  // Keep one genuine missing day, instead of pretending every room finishes daily.
  const state=await execute({action:'state',code:room.code},credentials[definition.members[0]]);
  if(state.postedSlots.length&&(dayIndex<6||completeToday))await execute({action:'generate',code:room.code,day},credentials[definition.members[0]]);
 }
 daily.push({day,activePeople:active.size,globalPeople:globalPeople.size,posts:posted.length});
}
clock=Date.parse(lastDay+'T14:00:00Z');
await mkdir(new URL('art/',root),{recursive:true});
const assetCache=new Map();
async function asset(key,image){
 if(assetCache.has(key))return assetCache.get(key);
 const file=digest(key).slice(0,24)+'.png';await writeFile(new URL('art/'+file,root),Buffer.from(image.split(',')[1],'base64'));const url='/week/art/'+file;assetCache.set(key,url);return url;
}
const examplePeople=[];
for(let person=0;person<40;person++){
 const profile=(await auth.execute({action:'account.me'},tokens[person])).account;
 profile.canDelete=false;for(const room of profile.ateliers)room.canGenerate=false;
 const states={},works={},globals={},drafts={},sourcePhotos={};
 for(const room of profile.ateliers){
  const state=await execute({action:'state',code:room.code},credentials[person]);state.canGenerate=false;states[room.code]=state;
  for(const item of state.works){const work=await execute({action:'work',code:room.code,day:item.day},credentials[person]);work.image=await asset(room.code+'/'+item.day,work.image);works[room.code+'/'+item.day]=work;}
  if(state.status==='open'&&state.postedSlots.length){const draft=await execute({action:'draft',code:room.code,day:lastDay},credentials[person]);draft.image=await asset('draft/'+room.code,draft.image);drafts[room.code]=draft;}
  const own=plan.find(item=>item.day===lastDay&&item.person===person&&rooms[item.room].code===room.code);
  if(own)sourcePhotos[room.code]='/week/photos/'+own.photoNumber+'.jpg';
 }
 for(const day of days){const global=await execute({action:'global',day},credentials[person]);if(global.image)global.image=await asset('global/'+day,global.image);globals[day]=global;}
 const area=await execute({action:'area'},credentials[person]);
 examplePeople.push({profile,states,works,globals,drafts,photos:sourcePhotos,area});
}
const directory=await execute({action:'directory'},credentials[0]),allRooms=[];
for(let r=0;r<10;r++)allRooms.push(await execute({action:'preview',code:rooms[r].code},credentials[definitions[r].members[0]]));
const completedWorks=(await store.listJSON('rooms/')).reduce((sum,row)=>sum+Object.values(row.data.days).filter(day=>day.status==='ready').length,0);
const metadata={fictional:true,people:40,ateliers:10,days,firstDay:days[0],lastDay,posts:plan.length,completedWorks,daily,memberships:examplePeople.map(person=>person.profile.ateliers.length),publicAteliers:directory.ateliers.length};
// Export only UI responses, never the memory store, passwords, credentials or sessions.
const world={version:1,lastDay,metadata,rooms:directory.ateliers,allRooms,people:examplePeople};
await writeFile(new URL('world.json',root),JSON.stringify(world));
await writeFile(new URL('scenario.json',root),JSON.stringify({metadata,definitions:definitions.map(({members,...room})=>({...room,participants:members.length})),credits:'photos/credits.json'},null,2)+'\n');
console.log(JSON.stringify({people:40,ateliers:10,publicAteliers:directory.ateliers.length,days,posts:plan.length,artifacts:assetCache.size,daily}));
