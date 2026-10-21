import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {localizeWeekData,weekPersonName,weekAtelierName} from '../src/week-localization.ts';

const languages=['ja','en','ko','fr','nl','es','it','id','km','hi'];
const fixture=JSON.parse(await readFile(new URL('../public/week/people/example_0001.json',import.meta.url),'utf8'));
const expected={ja:['佐藤葵','日々のかけら'],en:['Alex Smith','Everyday Fragments'],ko:['김서연','일상의 조각'],fr:['Camille Martin','Fragments du quotidien'],nl:['Emma de Jong','Stukjes van elke dag'],es:['Lucía García','Pedacitos del día a día'],it:['Luca Rossi','Frammenti di ogni giorno'],'id':['Ayu Pratama','Kepingan Hari'],km:['សុខ សុភា','ចំណែកនៃរាល់ថ្ងៃ'],hi:['आरव शर्मा','रोज़ के टुकड़े']};

test('all 1,000 viewpoints and 200 distinct ateliers have local names in ten languages',()=>{
 for(const language of languages){
  const people=Array.from({length:1000},(_,i)=>weekPersonName('example_'+String(i+1).padStart(4,'0'),language));assert(people.every(Boolean));assert.equal(new Set(people).size,1000);
  const rooms=Array.from({length:200},(_,i)=>weekAtelierName('WK'+String(i+1).padStart(6,'0'),language));
  assert.equal(new Set(rooms).size,200);
  assert.deepEqual([weekPersonName('example_0001',language),rooms[0]],expected[language]);
  if(!['ja','ko'].includes(language))assert(!rooms.some(name=>/[\u3040-\u30ff\u3400-\u9fff]/u.test(name)));
 }
});

test('localization preserves identities, coordinates, artwork, participation and the source fixture',()=>{
 const before=structuredClone(fixture);
 function withoutLabels(value){if(Array.isArray(value))return value.map(withoutLabels);if(!value||typeof value!=='object')return value;return Object.fromEntries(Object.entries(value).filter(([key])=>!['name','concept','defaultConcept'].includes(key)).map(([key,value])=>[key,withoutLabels(value)]));}
 for(const language of languages){const localized=localizeWeekData(fixture,language);assert.equal(localized.profile.name,expected[language][0]);assert.equal(localized.profile.ateliers[0].name,expected[language][1]);assert.equal(localized.states.WK000001.name,expected[language][1]);assert.equal(localized.area.ateliers[0].name,expected[language][1]);assert.deepEqual(withoutLabels(localized),withoutLabels(fixture));}
 assert.deepEqual(fixture,before);
});

test('themes round-trip across languages while invitation codes and arbitrary values stay intact',()=>{
 const source={code:'WK000002',name:'窓際のひととき',concept:'今日見つけた光',defaultConcept:'今日見つけた光',image:'/week/art/example.png',x:0,y:12};
 let current=source;
 for(const language of languages){current=localizeWeekData(current,language);assert.equal(current.name,weekAtelierName(source.code,language));assert.equal(current.code,source.code);assert.equal(current.image,source.image);assert.equal(current.x,0);assert.equal(current.y,12);if(language!=='ja')assert.notEqual(current.concept,source.concept);}
 assert.deepEqual(localizeWeekData(current,'ja'),source);
 const custom={username:'actual_user',code:'ABC12345',name:'My chosen name',concept:'My own theme'};
 for(const language of languages)assert.deepEqual(localizeWeekData(custom,language),custom);
 assert.equal(weekPersonName('example_0000','en'),undefined);assert.equal(weekAtelierName('WK000201','en'),undefined);
});
