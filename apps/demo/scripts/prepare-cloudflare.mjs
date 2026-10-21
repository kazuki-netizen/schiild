// DEMO ONLY. Export public UI assets only; private images stay in the Durable Object.
import {spawnSync} from 'node:child_process';
import {cp,mkdir,writeFile,readdir,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),endpoint='/api/atelier';
for(const args of [['scripts/sync-copy.mjs'],['scripts/expo.mjs','export','--platform','web','--clear']]){
 const result=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,EXPO_PUBLIC_DEMO_API_URL:endpoint},stdio:'inherit',windowsHide:true});if(result.status!==0)process.exit(result.status??1);
}
const scripts=path.join(root,'dist/_expo/static/js/web'),bundles=await Promise.all((await readdir(scripts)).filter(file=>file.endsWith('.js')).map(file=>readFile(path.join(scripts,file),'utf8')));
if(!bundles.some(bundle=>bundle.includes(endpoint)))throw Error('Same-origin API is missing');
const dest=path.join(root,'.wrangler/cloudflare-site');await mkdir(dest,{recursive:true});await cp(path.join(root,'dist'),dest,{recursive:true});
// Netlify's catch-all rewrite loops under Workers' automatic HTML handling.
await rm(path.join(dest,'_redirects'),{force:true});
await writeFile(path.join(dest,'deployment.json'),JSON.stringify({api:endpoint,ui:'https://schiild.app',hosting:'Cloudflare Workers Assets',images:'private Cloudflare SQLite Durable Object',builtAt:new Date().toISOString()})+'\n');
console.log('Cloudflare UI bundle ready: '+dest);
