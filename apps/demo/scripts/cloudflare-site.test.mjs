import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {imageFilename,sqliteImages} from '../cloudflare/sqlite-images.mjs';
import {siteRequest} from '../cloudflare/site.mjs';

test('SQLite images preserve legacy names, immutable bytes and atomic bounded chunks',async()=>{
 const db=new DatabaseSync(':memory:');let fail=false;
 const storage={sql:{exec(query,...args){if(fail&&query.startsWith('INSERT INTO image_chunks'))throw Error('disk_failure');const statement=db.prepare(query);const rows=query.startsWith('SELECT')?statement.all(...args):(statement.run(...args),[]);return {toArray:()=>rows};}},transactionSync(callback){db.exec('BEGIN');try{const result=callback();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}}};
 const images=sqliteImages(storage),key='works/ABCDEFGH/2026-10-21',bytes=Buffer.alloc(200000,123),name=createHash('sha256').update(key).digest('hex')+'.image';
 assert.equal(imageFilename(key),name);assert.equal(await images.get(key),null);assert.deepEqual(await images.set(key,bytes),{modified:true});assert.deepEqual(await images.set(key,Buffer.from('replacement')),{modified:false});assert.deepEqual(Buffer.from(await images.get(key)),bytes);
 assert.equal(db.prepare('SELECT max(length(bytes)) as n FROM image_chunks').get().n,65536);
 assert.equal(images.info(name).sha256,createHash('sha256').update(bytes).digest('hex'));assert.deepEqual(images.importImage(name,bytes),{modified:false});assert.throws(()=>images.importImage(name,Buffer.from('other')),/storage_conflict/);
 for(const invalid of ['../secret','images/private.image','photos/bad/2026-10-21','https://example.com/photo'])await assert.rejects(images.get(invalid));
 await assert.rejects(images.set('works/ABCDEFGH/2026-10-22',new Uint8Array(3000001)));assert.throws(()=>images.importImage('a'.repeat(64)+'.image',bytes,'f'.repeat(64)),/storage_integrity/);
 fail=true;await assert.rejects(images.set('works/ABCDEFGH/2026-10-22',bytes));fail=false;assert.equal(await images.get('works/ABCDEFGH/2026-10-22'),null);
 db.prepare('DELETE FROM image_chunks WHERE name = ? AND part = 1').run(name);await assert.rejects(images.get(key),/storage_integrity/);db.close();
});
test('image import is closed by default, authenticated, bounded and never exposes private bytes',async()=>{
 let called=0;const secret='a'.repeat(64),name='b'.repeat(64)+'.image',url='https://schiild.app/api/migration/images?name='+name;
 const env={IMAGE_MIGRATION_TOKEN:secret,ATELIERS:{idFromName:n=>n,get:()=>({imageInfo:async()=>{called++;return {byte_length:5,sha256:'c'.repeat(64)};},importImage:async(n,bytes,hash)=>{called++;assert.equal(n,name);assert.equal(Buffer.from(bytes).toString(),'image');assert.equal(hash,'c'.repeat(64));return {modified:true};}})}};
 assert.equal((await siteRequest(new Request(url),{})).status,404);assert.equal((await siteRequest(new Request(url,{headers:{Authorization:'Bearer '+'d'.repeat(64)}}),env)).status,404);assert.equal(called,0);
 const headers={Authorization:'Bearer '+secret,'X-Image-SHA256':'c'.repeat(64)};
 const imported=await siteRequest(new Request(url,{method:'POST',headers,body:'image'}),env);assert.equal(imported.status,200);assert.deepEqual(await imported.json(),{modified:true});
 const info=await siteRequest(new Request(url,{headers}),env);assert.equal((await info.json()).byte_length,5);assert.equal(info.headers.get('Cache-Control'),'no-store');
 assert.equal((await siteRequest(new Request(url,{method:'POST',headers:{...headers,'Content-Length':'3000001'},body:'image'}),env)).status,413);
 assert.equal((await siteRequest(new Request(url.replace(name,'../bad'),{headers}),env)).status,400);assert.equal(called,2);
});
test('Cloudflare asset delivery preserves queries, security headers, original pixels and private boundaries',async()=>{
 const requested=[],env={ASSETS:{fetch:async request=>{requested.push(request.url);return new Response('static',{headers:{'Content-Type':'text/html'}});}}};
 const root=await siteRequest(new Request('https://schiild.app/'),env);assert.equal(await root.text(),'static');assert.equal(root.headers.get('Permissions-Policy'),'camera=(self)');assert(root.headers.get('Cache-Control').includes('no-cache'));
 const image=await siteRequest(new Request('https://schiild.app/week/art/'+ 'a'.repeat(24)+'.png?pixels=1'),env);assert(image.headers.get('Cache-Control').includes('no-transform'));assert(requested.at(-1).endsWith('?pixels=1'));
 const manifest=await siteRequest(new Request('https://schiild.app/manifest.webmanifest'),env);assert.equal(manifest.headers.get('Content-Type'),'application/manifest+json');
 for(const path of ['/storage.php','/private/test','/images/'+ 'a'.repeat(64)+'.image','/.deploy-private/xserver.json'])assert.equal((await siteRequest(new Request('https://schiild.app'+path),env)).status,404);
 assert.equal((await siteRequest(new Request('https://schiild.app/',{method:'POST'}),env)).status,405);
 const redirect=await siteRequest(new Request('https://www.schiild.app/week/?lang=it'),env);assert.equal(redirect.status,308);assert.equal(redirect.headers.get('Location'),'https://schiild.app/week/?lang=it');
});
test('same-origin API keeps authentication and never falls through to public assets',async()=>{
 let assets=0;const env={ALLOWED_ORIGINS:'https://schiild.app',ASSETS:{fetch:async()=>{assets++;return new Response('wrong');}}};
 const response=await siteRequest(new Request('https://schiild.app/api/atelier',{method:'POST',headers:{Origin:'https://schiild.app'},body:'{}'}),env);assert.equal(response.status,401);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://schiild.app');assert.equal(assets,0);
 const denied=await siteRequest(new Request('https://schiild.app/api/atelier',{method:'POST',headers:{Origin:'https://evil.example'},body:'{}'}),env);assert.equal(denied.status,403);
});
