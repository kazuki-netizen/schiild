// DEMO ONLY. Read-only replay of a fictional week, generated with the demo engine.
// No application API, authentication service or shared storage is contacted here.
import {t} from './copy';
import type {Account,SharedState,DirectoryAtelier} from './shared-api';
import type {Work} from './model';
import type {Draft} from './draft';
import type {AreaSummary} from './area';
type Person={profile:Account;area:AreaSummary;states:Record<string,SharedState>;works:Record<string,Work>;globals:Record<string,unknown>;drafts:Record<string,Draft>;photos:Record<string,string>};
type World={version:2;lastDay:string;rooms:DirectoryAtelier[];allRooms:DirectoryAtelier[];people:{username:string;name:string;file:string}[];globals:Record<string,string>};
let pending:Promise<World>|undefined;
const files=new Map<string,Promise<unknown>>();
async function load<T>(file:string):Promise<T>{if(!files.has(file))files.set(file,fetch(file,{credentials:'omit',cache:'no-cache'}).then(async response=>{if(!response.ok)throw Error(t('demo.shared.unavailable'));return response.json();}).catch(error=>{files.delete(file);throw error;}));return await files.get(file) as T;}
async function world(){
 pending??=load<World>('/week/world.json').then(value=>{if(value.version!==2||value.lastDay!=='2026-10-19')throw Error(t('demo.shared.unavailable'));return value;}).catch(error=>{pending=undefined;throw error;});
 return pending;
}
export async function weekRequest<T>(action:string,values:Record<string,unknown>,signal?:AbortSignal):Promise<T>{
 if(signal?.aborted)throw new DOMException('Aborted','AbortError');
 const snapshot=await world();if(signal?.aborted)throw new DOMException('Aborted','AbortError');
 const selected=new URLSearchParams(location.search).get('person')??'',person=snapshot.people.find(person=>person.username===selected)??snapshot.people[0],data=await load<Person>(person.file);
 const code=String(values.code??''),day=String(values.day??snapshot.lastDay);let result:unknown;
 if(action==='account.me')result={account:data.profile};
 else if(action==='account.line.config'||action==='account.google.start')result={enabled:false};
 else if(action==='area')result=data.area;
 else if(action==='state')result=data.states[code];
 else if(action==='work')result=data.works[code+'/'+day];
 else if(action==='draft')result=data.drafts[code];
 else if(action==='global')result=snapshot.globals[day]?{...await load<object>(snapshot.globals[day]),...data.globals[day] as object}:{day,image:null,count:0,ateliers:0,final:true};
 else if(action==='global.archive')result={days:Object.keys(snapshot.globals).sort().reverse().map((day,index)=>({day,index:index+1}))};
 else if(action==='global.schiils'){const global=snapshot.globals[day]?await load<{schiils?:{position:number;image:string}[]}>(snapshot.globals[day]):null;result={schiils:(values.positions as number[]).map(position=>({position,image:global?.schiils?.find(item=>item.position===position)?.image??null}))};}
 else if(action==='preview'){const room=snapshot.allRooms.find(room=>room.code===code);if(room)result={...room,online:true};}
 else if(action==='directory'){
  const query=String(values.query??'').normalize('NFKC').trim().toLowerCase();
  const matches=snapshot.rooms.filter(room=>room.code>String(values.cursor??'')&&[room.name,room.concept,room.code].some(value=>value.normalize('NFKC').toLowerCase().includes(query))).sort((a,b)=>a.code.localeCompare(b.code)),page=matches.slice(0,24);
  result={ateliers:page,nextCursor:matches.length>24?page.at(-1)!.code:null};
 }else if(action==='posts')result={day:snapshot.lastDay,sources:Object.values(data.states).filter(room=>room.hasPhoto).map(room=>({code:room.code,name:room.name,day:snapshot.lastDay})),targets:Object.values(data.states).map(room=>({code:room.code,name:room.name,concept:room.concept,posted:room.hasPhoto,status:room.status})),freeConceptOnly:true,globalRecorded:true};
 else if(action==='post.photo'){const photo=data.photos[String(values.sourceCode??'')];if(photo)result={day:snapshot.lastDay,photo};}
 else throw Error(t('demo.week.read_only'));
 if(result===undefined)throw Error(t('demo.shared.unavailable'));
 return structuredClone(result) as T;
}
export async function weekPeople(){return (await world()).people.map(person=>({username:person.username,name:person.name}));}
