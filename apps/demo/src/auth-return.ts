import {browserSessionStorage} from './preview-mode.ts';
// Preserve only a validated UI destination; never store OAuth codes or credentials here.
const key='schiild.auth.destination';
export function rememberAuthDestination(view:'join'|'create',code=''){
 try{browserSessionStorage().setItem(key,JSON.stringify({view,code:/^[A-Z0-9]{8}$/.test(code)?code:'',at:Date.now()}));}catch{}
}
export function takeAuthDestination():{view:'join'|'create';code:string}|null{
 try{const value=JSON.parse(browserSessionStorage().getItem(key)??'null');browserSessionStorage().removeItem(key);if(value&&['join','create'].includes(value.view)&&Number.isFinite(value.at)&&Date.now()-value.at<600000&&value.at<=Date.now()&&typeof value.code==='string')return {view:value.view,code:/^[A-Z0-9]{8}$/.test(value.code)?value.code:''};}catch{}
 return null;
}
