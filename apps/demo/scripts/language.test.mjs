import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {translations} from '../src/translations.ts';
import {spanish} from '../src/spanish.ts';
import {demoCopy} from '../src/demo-copy.ts';
import {singularCopy} from '../src/singular-copy.ts';
import {LANGUAGE_KEY,languages,validLanguage,readLanguage,saveLanguage,activateLanguage,currentLanguage,numberLocale,shortDate} from '../src/language.ts';

test('all five translated catalogs cover every Japanese key and preserve every placeholder',async()=>{
 const original={...JSON.parse(await readFile(new URL('../src/copy.json',import.meta.url),'utf8')),...demoCopy};
 const expected=Object.keys(original).sort(),parameters=value=>[...value.matchAll(/\{(\w+)\}/g)].map(match=>match[1]).sort();
 assert.deepEqual(Object.keys(translations).sort(),expected);assert.deepEqual(Object.keys(spanish).sort(),expected);
 for(const key of expected){const texts=[...translations[key],spanish[key]];assert.equal(texts.length,5);for(const text of texts){assert.equal(typeof text,'string');assert(text.trim());assert.deepEqual(parameters(text),parameters(original[key]),key);assert.equal(/[!！]/u.test(text),false,key);assert.equal(/[ぁ-んァ-ン]/u.test(text),false,key);}}
 for(const [key,forms] of Object.entries(singularCopy))for(const text of Object.values(forms)){assert.deepEqual(parameters(text),parameters(original[key]),key);assert.equal(/[!！]/u.test(text),false,key);}
});

test('language is saved separately, defaults safely and formats dates and numbers without changing the logical day',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),memory=new Map([['schiild.preferences.v2','keep'],['schiild.account.session.v2','keep']]);
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)}});
 try{
  assert.equal(readLanguage(),'ja');assert.equal(validLanguage('toString'),false);assert.equal(validLanguage('__proto__'),false);
  memory.set(LANGUAGE_KEY,'invalid');assert.equal(readLanguage(),'ja');
  for(const language of Object.keys(languages)){saveLanguage(language);assert.equal(readLanguage(),language);assert.equal(currentLanguage(),language);assert.equal(shortDate('2026-12-18'),new Intl.DateTimeFormat(numberLocale(),{month:'numeric',day:'numeric',timeZone:'UTC'}).format(new Date('2026-12-18T00:00:00Z')));}
  assert.equal(memory.get('schiild.preferences.v2'),'keep');assert.equal(memory.get('schiild.account.session.v2'),'keep');
  localStorage.setItem=()=>{throw Error('storage_unavailable');};const active=currentLanguage();assert.throws(()=>saveLanguage('fr'));assert.equal(currentLanguage(),active);
 }finally{activateLanguage('ja');if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage;}
});
