import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
test('notification worker displays safe payloads and only opens this app on click',async()=>{
 const listeners={},shown=[],opened=[],self={location:{origin:'https://schiild.example'},registration:{showNotification:async(...args)=>shown.push(args)},clients:{claim:async()=>{},matchAll:async()=>[],openWindow:async url=>opened.push(url)},skipWaiting:async()=>{},addEventListener:(event,callback)=>listeners[event]=callback};
 vm.runInNewContext(await readFile(new URL('../public/push-worker.js',import.meta.url),'utf8'),{self,URL});assert.deepEqual(Object.keys(listeners).sort(),['activate','install','notificationclick','push']);
 let work;listeners.push({data:{json:()=>({title:'Schiild',body:'Ready',url:'/?push=global&day=2026-10-19',tag:'day'})},waitUntil:promise=>work=promise});await work;assert.equal(shown.length,1);assert.equal(shown[0][1].data.url,'https://schiild.example/?push=global&day=2026-10-19');
 for(const url of ['https://evil.example/?push=global&day=2026-10-19','javascript:alert(1)','/storage.php','/?push=atelier&day=2026-10-19&code=invalid']){listeners.notificationclick({notification:{data:{url},close(){}},waitUntil:promise=>work=promise});await work;assert.equal(opened.at(-1),'https://schiild.example/');}
 listeners.notificationclick({notification:{data:{url:'/?push=atelier&day=2026-10-19&code=ABCDEFGH&ready=1'},close(){}},waitUntil:promise=>work=promise});await work;assert.equal(opened.at(-1),'https://schiild.example/?push=atelier&day=2026-10-19&code=ABCDEFGH&ready=1');
});
