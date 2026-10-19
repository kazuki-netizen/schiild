import {browserStorage} from './preview-mode.ts';
// DEMO ONLY: one-time reset explicitly requested by the user on 2026-10-15.
export const RESET_KEY='schiild.reset.version';
export const RESET_VERSION='2026-10-15-all-2';
export function resetBrowser(){
 try{if(browserStorage().getItem(RESET_KEY)===RESET_VERSION)return true;for(const key of Object.keys(browserStorage()))if(key.startsWith('schiild.'))browserStorage().removeItem(key);browserStorage().setItem(RESET_KEY,RESET_VERSION);return true;}catch{return false;}
}
