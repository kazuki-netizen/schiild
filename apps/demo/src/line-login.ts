import {browserSessionStorage} from './preview-mode.ts';
// DEMO ONLY. OAuth codes never persist in history; channel secrets never reach the browser.
import {sharedRequest} from './shared-api';
import type {Account} from './shared-api';
import {t} from './copy';
const pendingKey='schiild.line.pending';
export type LineCallback={code:string;state:string;invalid:boolean};
let captured:LineCallback|null|undefined;
export async function beginLine(intent:'login'|'delete'='login',confirmUsername?:string){
 const value=await sharedRequest<{enabled:boolean;url:string;state:string;intent:string}>('account.line.start',{intent,confirmUsername});
 const url=new URL(value.url);
 if(!value.enabled||url.origin!=='https://access.line.me'||url.pathname!=='/oauth2/v2.1/authorize'||!/^[a-f0-9]{64}$/.test(value.state)||url.searchParams.get('state')!==value.state)throw Error(t('demo.line.unavailable'));
 try{browserSessionStorage().setItem(pendingKey,JSON.stringify({state:value.state,intent,startedAt:Date.now()}));}catch{throw Error(t('demo.line.storage'));}
 window.location.assign(url.href);
}
export function takeLineCallback():LineCallback|null{
 if(typeof window==='undefined')return null;
 if(captured!==undefined)return captured;
 const url=new URL(window.location.href);if(url.searchParams.get('auth')!=='line')return captured=null;
 const code=url.searchParams.get('code')??'',state=url.searchParams.get('state')??'',denied=url.searchParams.has('error');
 for(const key of ['auth','code','state','error','error_description','friendship_status_changed'])url.searchParams.delete(key);
 history.replaceState(history.state,'',url.pathname+url.search+url.hash);
 try{const pending=JSON.parse(browserSessionStorage().getItem(pendingKey)||'null');browserSessionStorage().removeItem(pendingKey);
  return captured={code,state,invalid:denied||!pending||pending.state!==state||!['login','delete'].includes(pending.intent)||!Number.isFinite(pending.startedAt)||Date.now()-pending.startedAt>300000||pending.startedAt>Date.now()+60000||!code||code.length>2048};
 }catch{return captured={code:'',state:'',invalid:true};}
}
export async function completeLine(value:LineCallback){
 if(value.invalid)throw Error(t('demo.line.expired'));
 return sharedRequest<{deleted:true}|{token:string;account:Account}>('account.line',{code:value.code,state:value.state});
}
