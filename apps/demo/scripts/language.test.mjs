import {extraCatalogs} from '../src/locale-catalogs.ts';
import {languageOrder,callingCodes,localeTags} from '../src/locale-info.ts';
import {localizedDate} from '../src/locale-dates.ts';
import {italian} from '../src/italian.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {translations} from '../src/translations.ts';
import {spanish} from '../src/spanish.ts';
import {demoCopy} from '../src/demo-copy.ts';
import {singularCopy} from '../src/singular-copy.ts';
import {LANGUAGE_KEY,languages,validLanguage,readLanguage,saveLanguage,activateLanguage,currentLanguage,numberLocale,shortDate} from '../src/language.ts';

test('all nine translated catalogs cover every Japanese key and preserve every placeholder',async()=>{
 const original={...JSON.parse(await readFile(new URL('../src/copy.json',import.meta.url),'utf8')),...demoCopy};
 const expected=Object.keys(original).sort(),parameters=value=>[...value.matchAll(/\{(\w+)\}/g)].map(match=>match[1]).sort();
 assert.deepEqual(Object.keys(translations).sort(),expected);assert.deepEqual(Object.keys(spanish).sort(),expected);assert.deepEqual(Object.keys(italian).sort(),expected);for(const catalog of Object.values(extraCatalogs))assert.deepEqual(Object.keys(catalog).sort(),expected);
 for(const key of expected){const texts=[...translations[key],spanish[key],italian[key],...Object.values(extraCatalogs).map(catalog=>catalog[key])];assert.equal(texts.length,9);for(const text of texts){assert.equal(typeof text,'string');assert(text.trim());assert.deepEqual(parameters(text),parameters(original[key]),key);assert.equal(/[!！]/u.test(text),false,key);assert.equal(/[ぁ-んァ-ン]/u.test(text),false,key);}}
 for(const [key,forms] of Object.entries(singularCopy))for(const text of Object.values(forms)){assert.deepEqual(parameters(text),parameters(original[key]),key);assert.equal(/[!！]/u.test(text),false,key);}
});

test('language is saved separately, defaults safely and formats dates and numbers without changing the logical day',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),memory=new Map([['schiild.preferences.v2','keep'],['schiild.account.session.v2','keep']]);
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)}});
 try{
  assert.equal(readLanguage(),'ja');assert.equal(validLanguage('toString'),false);assert.equal(validLanguage('__proto__'),false);
  memory.set(LANGUAGE_KEY,'invalid');assert.equal(readLanguage(),'ja');
  for(const language of Object.keys(languages)){saveLanguage(language);assert.equal(readLanguage(),language);assert.equal(currentLanguage(),language);assert.equal(numberLocale(),localeTags[language]);assert.equal(shortDate('2026-12-18'),localizedDate('2026-12-18','short',language));}
  assert.equal(memory.get('schiild.preferences.v2'),'keep');assert.equal(memory.get('schiild.account.session.v2'),'keep');
  localStorage.setItem=()=>{throw Error('storage_unavailable');};const active=currentLanguage();assert.throws(()=>saveLanguage('fr'));assert.equal(currentLanguage(),active);
 }finally{activateLanguage('ja');if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage;}
});

test('Khmer calendar and notification dates remain localized without browser Intl support',()=>{
 assert.equal(localizedDate('2026-10-18','month','km'),'តុលា 2026');
 assert.equal(localizedDate('2026-10-18','weekday','km'),'អាទិត្យ');
 assert.equal(localizedDate('2026-10-18','full','km'),'អាទិត្យ 18 តុលា 2026');
 assert.equal(localizedDate('2026-10-18','notification','km'),'18 តុលា 2026');
 assert.equal(localizedDate('2026-10-18','short','km'),'18/10');
 for(const language of languageOrder.filter(value=>value!=='km'))assert.equal(localizedDate('2026-10-18','month',language),new Intl.DateTimeFormat(localeTags[language],{year:'numeric',month:'long',timeZone:'UTC'}).format(new Date('2026-10-18T00:00:00Z')));
});


test('language choices follow calling codes with US English and matching region formats',()=>{
 assert.deepEqual(languageOrder,['en','nl','fr','es','it','id','ja','ko','hi','km']);
 assert.deepEqual(languageOrder.map(language=>callingCodes[language]),[1,31,33,34,39,62,81,82,91,855]);
 assert.equal(localeTags.en,'en-US');assert.equal(localeTags['id'],'id-ID');assert.equal(localeTags.km,'km-KH');assert.equal(localeTags.hi,'hi-IN');
 for(const language of languageOrder)assert.equal(new Intl.DateTimeFormat(localeTags[language]).resolvedOptions().locale.split('-')[0],language);
});

test('new catalogs preserve product names, coordinate axes and the calendar sample marker',()=>{
 for(const [language,catalog] of Object.entries(extraCatalogs)){
  for(const [key,forms] of Object.entries(translations)){
   for(const term of ['schiil','schiild','LINE','Chrome','Edge']){
    const pattern=new RegExp(`\\b${term}s?\\b`,'i');
    if(pattern.test(forms[0]))assert(pattern.test(catalog[key]),`${language}: ${key}: ${term}`);
   }
  }
  assert.equal(catalog['global.coords'],'x {x} / y {y}');
  assert.equal(catalog['demo.calendar.sample'],'S');
 }
});
