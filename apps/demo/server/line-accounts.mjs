// DEMO ONLY. State, nonce, PKCE and single-use challenges protect LINE sign-in and deletion.
import {createHash,randomBytes} from 'node:crypto';
import {ApiError} from './atelier-core.mjs';
import {lineVerifier,validLineConfig} from './line-identity.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=(status,code)=>{throw new ApiError(status,code);};
export function lineAccounts(store,{config,now,identity,session,verify=lineVerifier(config??{},{now})}){
 return async(body,credential)=>{
  if(body.action==='account.line.config')return {enabled:validLineConfig(config)};
  if(!validLineConfig(config))fail(503,'line_unavailable');
  const actor=await identity(credential),key=`line-challenges/${hash(credential)}`;
  if(body.action==='account.line.start'){
   const intent=body.intent??'login';if(!['login','register','delete'].includes(intent))fail(400,'invalid');
   if(intent==='delete'&&(!actor.account?.lineSubject||body.confirmUsername!==actor.account.username))fail(401,'line_invalid');
   const state=randomBytes(32).toString('hex'),nonce=randomBytes(32).toString('hex'),verifier=randomBytes(48).toString('base64url');
   const challenge={stateHash:hash(state),nonce,verifier,intent,member:actor.member,username:actor.account?.username??null,expires:now()+300000,used:false};
   if(!(await store.setJSON(key,challenge)).modified)fail(401,'account_deleted');
   const url=new URL('https://access.line.me/oauth2/v2.1/authorize');
   url.search=new URLSearchParams({response_type:'code',client_id:config.channelId,redirect_uri:config.redirectUri,state,scope:'openid profile',nonce,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',...(intent==='delete'?{prompt:'login',max_age:'0'}:{})}).toString();
   return {enabled:true,url:url.href,state,intent};
  }
  if(body.action!=='account.line')fail(400,'invalid');
  if(typeof body.state!=='string'||!/^[a-f0-9]{64}$/.test(body.state)||typeof body.code!=='string'||!body.code||body.code.length>2048)fail(401,'line_invalid');
  const row=await store.getWithMetadata(key,{type:'json'}),challenge=row?.data;
  if(!challenge||challenge.used||challenge.expires<=now()||challenge.member!==actor.member||challenge.username!==(actor.account?.username??null)||hash(body.state)!==challenge.stateHash)fail(401,'line_expired');
  // Claim before exchanging the single-use code; concurrent requests cannot create two accounts.
  if(!(await store.setJSON(key,{...challenge,used:true},{onlyIfMatch:row.etag})).modified)fail(401,'line_expired');
  const verified=await verify({code:body.code,verifier:challenge.verifier,nonce:challenge.nonce,reauth:challenge.intent==='delete'}),subject=hash(config.channelId+'/'+verified.subject);
  const current=await identity(credential);
  if(challenge.expires<=now()||current.member!==actor.member||current.account?.username!==actor.account?.username)fail(401,'line_expired');
  if(challenge.intent==='delete'){
   if(!current.account||current.account.lineSubject!==subject)fail(401,'line_invalid');
   const result=await store.deleteAccount(current.account,randomBytes(32).toString('hex'),[]);if(!result.modified)fail(401,'account_deleted');
   return {deleted:true};
  }
  const mapping=await store.getWithMetadata(`line-identities/${subject}`,{type:'json'});
  if(mapping){
   if(challenge.intent==='register')fail(409,'line_registered');
   if(current.account&&current.account.username!==mapping.data.username)fail(409,'line_conflict');
   const account=await store.getWithMetadata(`accounts/${mapping.data.username}`,{type:'json'});
   if(!account||account.data.lineSubject!==subject)fail(401,'line_expired');
   return session(account.data);
  }
  // Login never creates an account. Deletion removes the mapping, so even the
  // same verified LINE identity must explicitly choose a fresh registration.
  if(challenge.intent!=='register'&&!current.account)fail(401,'line_not_registered');
  const account=current.account??{username:`l_${randomBytes(10).toString('hex')}`,name:verified.name||'Schiilder',member:current.member,since:new Date(now()).toISOString().slice(0,10)};
  const result=await store.registerLine({...account,lineSubject:subject});
  if(!result.modified){
   if(result.reason==='line'&&challenge.intent==='register')fail(409,'line_registered');
   if(result.reason==='line'&&(!current.account||current.account.username===result.username)){
    const existing=await store.getWithMetadata(`accounts/${result.username}`,{type:'json'});if(existing?.data.lineSubject===subject)return session(existing.data);
   }
   fail(409,'line_conflict');
  }
  return session(result.account);
 };
}
