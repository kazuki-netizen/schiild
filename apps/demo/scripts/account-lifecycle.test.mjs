import test from 'node:test';
import assert from 'node:assert/strict';
import {watchAccountLifecycle} from '../src/account-lifecycle.ts';

test('deletion/logout in another tab invalidates the old profile and BFCache/resume rechecks the server',()=>{
 const target=new EventTarget(),document=Object.assign(new EventTarget(),{visibilityState:'visible'}),calls=[];
 let token='first';const stop=watchAccountLifecycle({target,document,readSession:()=>token,onChange:()=>calls.push('change'),onResume:()=>calls.push('resume')});
 const storage=key=>target.dispatchEvent(Object.assign(new Event('storage'),{key}));
 token=null;storage('unrelated');assert.deepEqual(calls,[]);
 storage('schiild.account.session.v2');assert.deepEqual(calls,['change']);
 storage('schiild.account.session.v2');assert.deepEqual(calls,['change']);
 document.dispatchEvent(new Event('visibilitychange'));assert.deepEqual(calls,['change','resume']);
 document.visibilityState='hidden';document.dispatchEvent(new Event('visibilitychange'));assert.equal(calls.length,2);
 document.visibilityState='visible';token='new';target.dispatchEvent(Object.assign(new Event('pageshow'),{persisted:true}));assert.deepEqual(calls,['change','resume','change']);
 target.dispatchEvent(Object.assign(new Event('pageshow'),{persisted:true}));assert.equal(calls.at(-1),'resume');
 target.dispatchEvent(new Event('focus'));assert.equal(calls.length,5);assert.equal(calls.at(-1),'resume');
 stop();token=null;storage(null);document.dispatchEvent(new Event('visibilitychange'));target.dispatchEvent(new Event('focus'));assert.equal(calls.length,5);
});

test('deletion clears another open tab, but an old event cannot wipe a newly signed-in account',()=>{
 const target=new EventTarget(),document=Object.assign(new EventTarget(),{visibilityState:'visible'}),calls=[];let token=null;
 const stop=watchAccountLifecycle({target,document,readSession:()=>token,onChange:()=>{},onResume:()=>{},onErase:()=>calls.push('erased')});
 target.dispatchEvent(Object.assign(new Event('storage'),{key:'schiild.account.erased.v1',newValue:'1'}));assert.deepEqual(calls,['erased']);
 token='fresh';target.dispatchEvent(Object.assign(new Event('storage'),{key:'schiild.account.erased.v1',newValue:'2'}));assert.deepEqual(calls,['erased']);
 stop();
});
