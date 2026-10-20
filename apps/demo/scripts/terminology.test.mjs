import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {displayTerminology,propertyTerms,categoryTerms} from '../src/terminology.ts';
import {demoCopy} from '../src/demo-copy.ts';
import {translations} from '../src/translations.ts';
import {italian} from '../src/italian.ts';
import {spanish} from '../src/spanish.ts';
import {singularCopy} from '../src/singular-copy.ts';
import {pushText} from '../src/push-copy.ts';
const ja={...JSON.parse(await readFile(new URL('../src/copy.json',import.meta.url),'utf8')),...demoCopy};
const catalogs={ja,en:Object.fromEntries(Object.entries(translations).map(([key,value])=>[key,value[0]])),ko:Object.fromEntries(Object.entries(translations).map(([key,value])=>[key,value[1]])),fr:Object.fromEntries(Object.entries(translations).map(([key,value])=>[key,value[2]])),nl:Object.fromEntries(Object.entries(translations).map(([key,value])=>[key,value[3]])),it:italian,es:spanish};
test('approved terminology covers every catalog and singular form without changing placeholders',()=>{
 const params=text=>[...text.matchAll(/\{\w+\}/g)].map(match=>match[0]).sort();
 for(const [language,catalog] of Object.entries(catalogs))for(const [key,value] of Object.entries(catalog)){
  for(const raw of [value,...(singularCopy[key]?.[language]?[singularCopy[key][language]]:[])]){
   const result=displayTerminology(key,language,raw);assert.deepEqual(params(result),params(raw),key);assert.equal(displayTerminology(key,language,result),result,key);
   assert(!/グローバル/.test(result),key);assert(!/\bGLOBAL\b(?! SCHIILD)/.test(result),key);
   if(language!=='ja')assert(!/\b(?:Schiils?|Schiilds?|SCHIILDS?)\b/.test(result.replaceAll('GLOBAL SCHIILD','').replace(key==='excluded.final'?'Schiild':'\uE001','')),key);
  }
 }
 assert.equal(displayTerminology('me.title','ja',ja['me.title']),'プロフィール');
 for(const language of Object.keys(catalogs))assert.equal(displayTerminology('schiild.meta.tier',language,catalogs[language]['schiild.meta.tier']),categoryTerms[language]);
 for(const [language,property] of Object.entries(propertyTerms))assert(displayTerminology('schiild.regions.mine',language,catalogs[language]['schiild.regions.mine']).includes(property));
});
test('normalization preserves app branding and interpolation leaves registered names untouched',()=>{
 assert.equal(displayTerminology('excluded.final','en','Works in Schiild remain unchanged.'),'Works in Schiild remain unchanged.');
 for(const language of Object.keys(catalogs)){
  const name='Global Schiild · Schiil Region';
  const body=pushText('demo.push.ready_body',language,{atelier:name,date:'2026-10-20'});assert(body.includes(name));
  if(language!=='ja')assert(body.includes('schiild'));
  assert(pushText('demo.push.global_title',language).includes('GLOBAL SCHIILD'));
 }
});
