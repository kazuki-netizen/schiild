// DEMO ONLY. LINE secrets and authorization-code exchange stay on Cloudflare.
import {ApiError} from './atelier-core.mjs';
export function validLineConfig(config){
 // Pausing preserves the connection settings while refusing discovery and new OAuth requests.
 try{const url=new URL(config.redirectUri);return config.paused!==true&&typeof config.channelId==='string'&&/^\d{5,20}$/.test(config.channelId)&&typeof config.channelSecret==='string'&&/^[\x21-\x7e]{16,256}$/.test(config.channelSecret)&&url.protocol==='https:'&&url.search==='?auth=line'&&!url.hash&&!url.username&&!url.password;}catch{return false;}
}
export function readLineConfig(value){try{const config=JSON.parse(value);return validLineConfig(config)?config:null;}catch{return null;}}
export function lineDeauthorizer(config,userAccessToken,{fetcher=fetch}={}){
 return async()=>{
  const post=async(url,values,headers={},json=false)=>{try{return await fetcher(url,{method:'POST',headers:{'Content-Type':json?'application/json':'application/x-www-form-urlencoded',...headers},body:json?JSON.stringify(values):new URLSearchParams(values),signal:AbortSignal.timeout(15000),redirect:'manual'});}catch{throw new ApiError(503,'line_unavailable');}};
  if(typeof userAccessToken!=='string'||!userAccessToken||userAccessToken.length>8192)throw new ApiError(503,'line_unavailable');
  const response=await post('https://api.line.me/oauth2/v3/token',{grant_type:'client_credentials',client_id:config.channelId,client_secret:config.channelSecret});
  if(!response.ok)throw new ApiError(503,'line_unavailable');
  let channel;try{channel=await response.json();}catch{throw new ApiError(503,'line_unavailable');}
  if(typeof channel.access_token!=='string'||!channel.access_token||channel.access_token.length>8192)throw new ApiError(503,'line_unavailable');
  // LINE's deauthorize endpoint requires JSON, unlike its OAuth token endpoint.
  // Form encoding returns 415 and must never be mistaken for successful erasure.
  const revoked=await post('https://api.line.me/user/v1/deauthorize',{userAccessToken},{Authorization:'Bearer '+channel.access_token},true);
  if(revoked.status!==204)throw new ApiError(503,'line_unavailable');
 };
}
export function lineVerifier(config,{fetcher=fetch,now=()=>Date.now()}={}){
 return async({code,verifier,nonce,reauth=false,issuedAfter})=>{
  const post=async(path,values)=>{let response;try{response=await fetcher('https://api.line.me/oauth2/v2.1/'+path,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(values),signal:AbortSignal.timeout(15000),redirect:'manual'});}catch{throw new ApiError(503,'line_unavailable');}
   if(!response.ok)throw new ApiError(response.status>=500||response.status===429?503:401,response.status>=500||response.status===429?'line_unavailable':'line_invalid');
   try{return await response.json();}catch{throw new ApiError(503,'line_unavailable');}
  };
  const tokens=await post('token',{grant_type:'authorization_code',code,redirect_uri:config.redirectUri,client_id:config.channelId,client_secret:config.channelSecret,code_verifier:verifier});
  if(typeof tokens.id_token!=='string'||tokens.id_token.length>16384)throw new ApiError(401,'line_invalid');
  const claims=await post('verify',{id_token:tokens.id_token,client_id:config.channelId,nonce});
  if(claims.iss!=='https://access.line.me'||claims.aud!==config.channelId||typeof claims.sub!=='string'||!/^U[a-f0-9]{32}$/.test(claims.sub)||claims.nonce!==nonce||!Number.isFinite(claims.exp)||claims.exp*1000<=now()||!Number.isFinite(claims.iat)||claims.iat*1000>now()+60000)throw new ApiError(401,'line_invalid');
  // Deletion requires a newly issued, nonce-bound proof of the same LINE user.
  // auth_time describes the underlying LINE login, which may predate this app
  // confirmation. Do not force password re-entry for an authenticated LINE app.
  if(reauth&&(!Number.isFinite(issuedAfter)||claims.iat*1000<issuedAfter-60000))throw new ApiError(401,'line_invalid');
  return {subject:claims.sub,name:typeof claims.name==='string'?claims.name.trim().slice(0,40):'',deauthorize:lineDeauthorizer(config,tokens.access_token,{fetcher})};
 };
}
