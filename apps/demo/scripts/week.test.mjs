import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import sharp from 'sharp';
import {voidColor} from '../src/engine.ts';
const root=new URL('../public/week/',import.meta.url),world=JSON.parse(await readFile(new URL('world.json',root),'utf8'));
const read=async file=>JSON.parse(await readFile(new URL(file.replace('/week/',''),root),'utf8'));

test('fictional week has 1,000 isolated viewpoints, 200 ateliers and seven UTC days',async()=>{
 assert.equal(world.version,2);assert.equal(world.metadata.fictional,true);assert.equal(world.people.length,1000);assert.equal(new Set(world.people.map(person=>person.username)).size,1000);
 assert.equal(world.allRooms.length,200);assert.equal(new Set(world.allRooms.map(room=>room.code)).size,200);assert.equal(world.rooms.length,140);assert.equal(world.metadata.days.length,7);
 assert.equal(world.metadata.days.at(-1),world.lastDay);assert.equal(world.metadata.daily.reduce((sum,day)=>sum+day.posts,0),world.metadata.posts);
 assert(new Set(world.metadata.daily.map(day=>day.posts)).size>3);assert(new Set(world.metadata.daily.map(day=>day.globalPeople)).size>1);for(const day of world.metadata.daily){assert(day.activePeople<=1000);assert(day.globalPeople<=day.activePeople);assert(day.globalPeople>=800&&day.globalPeople<=1000);}assert.equal(world.metadata.globalPosts,world.metadata.daily.reduce((sum,day)=>sum+day.globalPeople,0));
 assert((await stat(new URL('world.json',root))).size<200000);
 const rooms=new Set(),memberships=new Set();for(const descriptor of world.people){const person=await read(descriptor.file);assert.equal(person.profile.username,descriptor.username);assert.equal(person.profile.canDelete,false);for(const room of person.profile.ateliers)rooms.add(room.code);memberships.add(person.profile.ateliers.length);assert((await stat(new URL(descriptor.file.replace('/week/',''),root))).size<100000);}
 assert.equal(rooms.size,200);assert(memberships.has(1));assert([...memberships].some(count=>count>=3));
});

test('genuine 256px atelier images, linked GLOBAL art, unique pixels and personal area agree',async()=>{
 const artifacts=new Set(),globals={},coordinates={};for(const [day,file] of Object.entries(world.globals)){
  coordinates[day]=new Set();
  const work=globals[day]=await read(file);assert.equal(new Set(work.positions).size,work.count);assert.equal(work.outputSize,Math.ceil(Math.sqrt(work.count)));
  const linked=work.artworks.flatMap(art=>art.positions);assert.equal(new Set(linked).size,linked.length);assert(linked.length<=work.count);assert(work.count>=800&&work.count<=1000);
  for(const art of work.artworks){assert(art.name&&art.code);artifacts.add(art.image);}
  const raw=await sharp(await readFile(new URL(work.image.replace('/week/',''),root))).ensureAlpha().raw().toBuffer();for(let position=work.count;position<work.outputSize**2;position++)assert.deepEqual([...raw.subarray(position*4,position*4+4)],[...voidColor(position%work.outputSize,Math.floor(position/work.outputSize),0,day),255]);
 }
 for(const descriptor of world.people){const person=await read(descriptor.file);assert(Object.values(person.states).every(room=>!room.canGenerate));assert.equal(person.area.global.days,Object.values(person.globals).filter(work=>work.x!==undefined).length);
  for(const [day,pixel] of Object.entries(person.globals)){assert.equal(pixel.image,undefined);if(pixel.x!==undefined){const position=pixel.y*globals[day].outputSize+pixel.x;assert(globals[day].positions.includes(position));assert(!coordinates[day].has(position));coordinates[day].add(position);}}
  for(const [key,work] of Object.entries(person.works)){assert.equal(work.outputSize,256);assert.equal(work.rects.length,person.states[key.split('/')[0]].capacity);artifacts.add(work.image);}
 }
 for(const day of Object.keys(globals))assert.equal(coordinates[day].size,globals[day].count);
 for(const image of artifacts){assert(image.startsWith('/week/art/'));const bytes=await readFile(new URL(image.replace('/week/',''),root));assert.equal(bytes.readUInt32BE(16),256);assert.equal(bytes.readUInt32BE(20),256);}
});

test('static replay exports no credentials and retains photo attribution',async()=>{
 for(const file of ['/week/world.json',...world.people.map(person=>person.file),...Object.values(world.globals)]){const value=await read(file),text=JSON.stringify(value);for(const key of ['passwordHash','passwordSalt','token','lineSubject','googleSubject','expires','sessionKey'])assert(!text.includes('"'+key+'"'),key);}
 assert(world.people.every(person=>/^example_\d{4}$/.test(person.username)));const credits=await read('/week/photos/credits.json');assert(credits.length>=24);for(const credit of credits){assert(credit.author&&credit.source.startsWith('https://unsplash.com/'));assert.equal(credit.license,'https://unsplash.com/license');assert((await stat(new URL('photos/'+credit.imageNumber+'.jpg',root))).size>0);}
});

test('every GLOBAL image is assembled from one real Schiil at each participant coordinate',async()=>{
 const thumbnailCache=new Map(),current=await read(world.globals[world.lastDay]);
 for(const [day,file] of Object.entries(world.globals)){
  const global=await read(file);assert.equal(global.schiils.length,global.count);assert.equal(new Set(global.schiils.map(tile=>tile.position)).size,global.count);
  const atlas=await sharp(await readFile(new URL(global.schiilImage.replace('/week/',''),root))).ensureAlpha().raw().toBuffer({resolveWithObject:true}),cell=global.schiilCellSize;assert.equal(atlas.info.width,global.outputSize*cell);assert.equal(atlas.info.height,atlas.info.width);
  for(let position=global.count;position<global.outputSize**2;position++){const offset=(Math.floor(position/global.outputSize)*cell*atlas.info.width+position%global.outputSize*cell)*4;assert.deepEqual([...atlas.data.subarray(offset,offset+4)],[...voidColor(position%global.outputSize*cell,Math.floor(position/global.outputSize)*cell,0,day),255]);}
  for(const tile of global.schiils){if(!thumbnailCache.has(tile.image))thumbnailCache.set(tile.image,await sharp(await readFile(new URL(tile.image.replace('/week/',''),root))).resize(cell,cell,{fit:'cover'}).ensureAlpha().raw().toBuffer());const expected=thumbnailCache.get(tile.image),x=tile.position%global.outputSize*cell,y=Math.floor(tile.position/global.outputSize)*cell;for(let row=0;row<cell;row++){const offset=((y+row)*atlas.info.width+x)*4;assert(atlas.data.subarray(offset,offset+cell*4).equals(expected.subarray(row*cell*4,(row+1)*cell*4)));}}
 }
 let globalOnly=0;for(const descriptor of world.people){const person=await read(descriptor.file),pixel=person.globals[world.lastDay];if(pixel.x===undefined)continue;const position=pixel.y*current.outputSize+pixel.x,source=current.artworks.find(art=>art.positions.includes(position)),image=current.schiils.find(tile=>tile.position===position).image;if(source)assert.equal(image,person.photos[source.code]);else{assert(image.startsWith('/week/photos/'));globalOnly++;}}assert(globalOnly>0);
});
