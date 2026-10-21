import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {createRequire} from 'node:module';
import {realpathSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const bundle=process.env.DEMO_WORKER_BUNDLE,config={channelId:'1234567890',channelSecret:'f'.repeat(32),redirectUri:'https://app.example/?auth=line'};
async function runtime(options){const require=createRequire(import.meta.url),wranglerRequire=createRequire(realpathSync(require.resolve('wrangler/package.json'))),{Miniflare,convertV4MiniflareOptions}=await import(pathToFileURL(wranglerRequire.resolve('miniflare')).href);return new Miniflare(convertV4MiniflareOptions({name:'line-runtime',scriptPath:bundle,modules:true,compatibilityDate:'2026-10-08',compatibilityFlags:['nodejs_compat'],durableObjects:{ATELIERS:{className:'AtelierDirectory',useSQLite:true}},bindings:{ALLOWED_ORIGINS:'https://app.example',XSERVER_STORAGE_URL:'https://storage.example/storage.php',XSERVER_STORAGE_SECRET:'f'.repeat(64)},...options}));}
const call=(mf,action,values={},credential='a'.repeat(64))=>mf.dispatchFetch('https://api.example/api/atelier',{method:'POST',headers:{Origin:'https://app.example',Authorization:'Bearer '+credential},body:JSON.stringify({action,...values})});
test('LINE runs authorization-code/PKCE exchange, persistent account restore and deletion inside workerd',{skip:!bundle},async()=>{
 const issued=new Map();let tokenRequests=0,verifyRequests=0;
 const mf=await runtime({bindings:{ALLOWED_ORIGINS:'https://app.example',XSERVER_STORAGE_URL:'https://storage.example/storage.php',XSERVER_STORAGE_SECRET:'f'.repeat(64),LINE_LOGIN_CONFIG:JSON.stringify(config)},outboundService:async request=>{
  const url=new URL(request.url),body=new URLSearchParams(await request.text());assert.equal(url.origin,'https://api.line.me');
  if(url.pathname.endsWith('/token')){tokenRequests++;assert.equal(body.get('client_secret'),config.channelSecret);assert.equal(body.get('redirect_uri'),config.redirectUri);const challenge=issued.get(body.get('code'));assert(challenge);assert.equal(createHash('sha256').update(body.get('code_verifier')).digest('base64url'),challenge.get('code_challenge'));return Response.json({id_token:body.get('code')});}
  assert.equal(url.pathname,'/oauth2/v2.1/verify');verifyRequests++;const challenge=issued.get(body.get('id_token'));assert(challenge);assert.equal(body.get('nonce'),challenge.get('nonce'));const seconds=Math.floor(Date.now()/1000);return Response.json({iss:'https://access.line.me',aud:config.channelId,sub:'U'+'1'.repeat(32),nonce:challenge.get('nonce'),iat:seconds,exp:seconds+3600,auth_time:seconds,name:'Runtime LINE'});
 }});
 async function login(credential,values={}){const response=await call(mf,'account.line.start',values,credential);assert.equal(response.status,200);const start=await response.json(),code=randomBytes(10).toString('hex');issued.set(code,new URL(start.url).searchParams);const result=await call(mf,'account.line',{state:start.state,code},credential),body=await result.json();assert.equal(result.status,200,JSON.stringify({body,tokenRequests,verifyRequests}));return body;}
 try{
  assert.deepEqual(await (await call(mf,'account.line.config')).json(),{enabled:true});const signed=await login('a'.repeat(64),{intent:'register'});assert.equal(signed.account.lineLinked,true);assert.equal(signed.account.canDelete,true);assert.equal(signed.account.hasPassword,false);
  const again=await login('b'.repeat(64));assert.equal(signed.account.username,again.account.username);
  assert.deepEqual(await login(signed.token,{intent:'delete',confirmUsername:signed.account.username}),{deleted:true});assert.equal((await call(mf,'account.me',{},again.token)).status,401);assert.equal(tokenRequests,3);assert.equal(verifyRequests,3);
 }finally{await mf.dispose();}
});
test('LINE config discovery does not consume auth quota; active starts and callbacks do',{skip:!bundle},async()=>{
 const mf=await runtime({bindings:{ALLOWED_ORIGINS:'https://app.example',XSERVER_STORAGE_URL:'https://storage.example/storage.php',XSERVER_STORAGE_SECRET:'f'.repeat(64),LINE_LOGIN_CONFIG:JSON.stringify(config)},ratelimits:{AUTH_RATE_LIMITER:{namespace_id:'1009',simple:{limit:1,period:60}}}});
 try{for(let n=0;n<12;n++)assert.equal((await call(mf,'account.line.config')).status,200);assert.equal((await call(mf,'account.line.start')).status,200);assert.equal((await call(mf,'account.line.start')).status,429);assert.equal((await call(mf,'account.line',{state:'a'.repeat(64),code:'test'})).status,429);}finally{await mf.dispose();}
});
