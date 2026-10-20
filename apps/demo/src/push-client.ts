// DEMO ONLY. No permission request happens outside the explicit settings button.
import {browserStorage,isWeekPreview} from './preview-mode.ts';
import {sharedRequest} from './shared-api';
import type {Language} from './language';
const deviceKey='schiild.push.device.v1';
export type PushPreferences={atelierReady:boolean;globalReady:boolean;post:boolean};
export type PushConfig={enabled:boolean;publicKey:string|null;preferences:PushPreferences};
export const defaultPushPreferences:PushPreferences={atelierReady:true,globalReady:true,post:true};
export function pushSupported(){return typeof window!=='undefined'&&isSecureContext&&'Notification'in window&&'serviceWorker'in navigator&&'PushManager'in window;}
export function needsHomeScreen(){return /iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1?!(matchMedia('(display-mode: standalone)').matches||(navigator as Navigator&{standalone?:boolean}).standalone):false;}
function proof(create=false){let value=browserStorage().getItem(deviceKey);if(create&&!/^[a-f0-9]{64}$/.test(value??'')){value=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');browserStorage().setItem(deviceKey,value);}return value;}
async function existing(){if(isWeekPreview||!pushSupported())return null;const registration=await navigator.serviceWorker.getRegistration('/');return registration?await registration.pushManager.getSubscription():null;}
export async function refreshPush(language:Language){
 if(isWeekPreview||!pushSupported()||Notification.permission!=='granted')return false;
 const subscription=await existing(),clientKey=proof();if(!subscription||!clientKey)return false;
 await sharedRequest('push.subscribe',{subscription:subscription.toJSON(),clientKey,language});return true;
}
export async function enablePush(publicKey:string,language:Language){
 if(isWeekPreview||!pushSupported())throw Error('push_unsupported');
 // Keep this before the first await, so Safari sees the user gesture.
 const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('push_denied');
 const clientKey=proof(true),registration=await navigator.serviceWorker.register('/push-worker.js',{scope:'/'});await navigator.serviceWorker.ready;
 let subscription=await registration.pushManager.getSubscription();
 const bytes=Uint8Array.from(atob(publicKey.replaceAll('-','+').replaceAll('_','/')),char=>char.charCodeAt(0));
 if(subscription){const state=await sharedRequest<{active:boolean}>('push.state',{endpoint:subscription.endpoint,clientKey});if(!state.active){await subscription.unsubscribe();subscription=null;}}
 if(subscription&&subscription.options.applicationServerKey){const old=new Uint8Array(subscription.options.applicationServerKey);if(old.length!==bytes.length||old.some((value,index)=>value!==bytes[index])){await subscription.unsubscribe();subscription=null;}}
 subscription??=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes.buffer as ArrayBuffer});
 await sharedRequest('push.subscribe',{subscription:subscription.toJSON(),clientKey,language});return true;
}
export async function disablePush(){
 if(isWeekPreview)return;const subscription=await existing(),clientKey=proof();
 if(subscription){if(clientKey)await sharedRequest('push.unsubscribe',{endpoint:subscription.endpoint,clientKey},AbortSignal.timeout(5000)).catch(()=>{});await subscription.unsubscribe();}
}
export async function pushActive(){const subscription=await existing(),clientKey=proof();if(!subscription||!clientKey)return false;return (await sharedRequest<{active:boolean}>('push.state',{endpoint:subscription.endpoint,clientKey})).active;}
