import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import {clearAccountStores} from '../src/account-storage.ts';
const compiled=ts.transpileModule(await readFile(new URL('../src/browser-reset.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function memory(){const values=Object.create(null);return new Proxy(values,{get(target,key){if(key==='getItem')return name=>target[name]??null;if(key==='setItem')return (name,value)=>target[name]=String(value);if(key==='removeItem')return name=>delete target[name];return target[key];}});}
function fixture(local=memory(),session=memory()){
 const exports={};vm.runInNewContext(compiled,{exports,require(name){if(name==='./preview-mode.ts')return {browserStorage:()=>local,browserSessionStorage:()=>session};if(name==='./account-storage.ts')return {clearAccountStores};throw Error(name);}});return {local,session,...exports};
}
test('the requested reset erases old local records and per-tab OAuth drafts exactly once',()=>{
 const f=fixture();for(const store of [f.local,f.session]){store.setItem(f.RESET_KEY,'2026-10-15-all-2');store.setItem('schiild.account.session.v2','old-session');store.setItem('schiild.preferences.v1','old-name');store.setItem('unrelated','keep');}
 assert.equal(f.resetBrowser(),true);for(const store of [f.local,f.session]){assert.equal(store.getItem(f.RESET_KEY),f.RESET_VERSION);assert.equal(store.getItem('schiild.account.session.v2'),null);assert.equal(store.getItem('schiild.preferences.v1'),null);assert.equal(store.getItem('unrelated'),'keep');}
 f.local.setItem('schiild.account.session.v2','new-registration');assert.equal(f.resetBrowser(),true);assert.equal(f.local.getItem('schiild.account.session.v2'),'new-registration');
 const second=fixture(f.local);second.session.setItem('schiild.line.pending','old-callback');assert.equal(second.resetBrowser(),true);assert.equal(second.session.getItem('schiild.line.pending'),null);assert.equal(second.local.getItem('schiild.account.session.v2'),'new-registration');
});
