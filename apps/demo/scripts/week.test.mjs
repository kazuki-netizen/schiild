import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
const root=new URL('../public/week/',import.meta.url),world=JSON.parse(await readFile(new URL('world.json',root),'utf8'));
test('fictional week contains 40 distinct viewpoints, ten ateliers and seven consistent UTC days',()=>{
 assert.equal(world.metadata.fictional,true);assert.equal(world.people.length,40);assert.equal(new Set(world.people.map(person=>person.profile.username)).size,40);
 assert.equal(world.allRooms.length,10);assert.equal(new Set(world.allRooms.map(room=>room.code)).size,10);assert.equal(world.rooms.length,7);
 assert.equal(world.metadata.days.length,7);assert.equal(world.metadata.days.at(-1),world.lastDay);
 assert.equal(world.metadata.daily.reduce((sum,day)=>sum+day.posts,0),world.metadata.posts);
 assert(new Set(world.metadata.daily.map(day=>day.posts)).size>3);
 const participatingRooms=new Set(world.people.flatMap(person=>person.profile.ateliers.map(room=>room.code)));assert.equal(participatingRooms.size,10);
 assert(world.people.some(person=>person.profile.ateliers.length===1));assert(world.people.some(person=>person.profile.ateliers.length>=3));
 for(const day of world.metadata.daily){assert(day.activePeople<40);assert(day.globalPeople<=day.activePeople);}
});
test('works are genuine 256px artifacts; dated GLOBAL positions and personal totals agree',async()=>{
 const artifacts=new Set();
 for(const person of world.people){
  assert.equal(person.profile.canDelete,false);assert(Object.values(person.states).every(room=>!room.canGenerate));
  const globalDays=Object.values(person.globals).filter(work=>work.x!==undefined).length;assert.equal(person.area.global.days,globalDays);
  for(const work of Object.values(person.works)){assert.equal(work.outputSize,256);assert.equal(work.rects.length,person.states[Object.keys(person.states).find(code=>person.works[code+'/'+work.day]===work)]?.capacity);artifacts.add(work.image);}
  for(const global of Object.values(person.globals)){assert.equal(new Set(global.positions).size,global.count);assert.equal(global.outputSize,Math.ceil(Math.sqrt(global.count)));if(global.x!==undefined)assert(global.positions.includes(global.y*global.outputSize+global.x));}
 }
 for(const image of artifacts){assert(image.startsWith('/week/art/'));const bytes=await readFile(new URL(image.replace('/week/',''),root));assert.equal(bytes.readUInt32BE(16),256);assert.equal(bytes.readUInt32BE(20),256);}
});
test('exported replay contains no authentication credentials or real-account identifiers',async()=>{
 const text=await readFile(new URL('world.json',root),'utf8');for(const key of ['passwordHash','passwordSalt','token','lineSubject','googleSubject','expires','sessionKey'])assert(!text.includes('"'+key+'"'),key);
 assert(world.people.every(person=>/^example_\d{2}$/.test(person.profile.username)));
 const credits=JSON.parse(await readFile(new URL('photos/credits.json',root),'utf8'));assert(credits.length>=24);
 for(const credit of credits){assert(credit.author&&credit.source.startsWith('https://unsplash.com/'));assert.equal(credit.license,'https://unsplash.com/license');assert((await stat(new URL('photos/'+credit.imageNumber+'.jpg',root))).size>0);}
});
