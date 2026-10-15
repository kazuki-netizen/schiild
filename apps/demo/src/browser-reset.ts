// DEMO ONLY: one-time reset explicitly requested by the user on 2026-10-15.
export const RESET_KEY='schiild.reset.version';
export const RESET_VERSION='2026-10-15-all-1';
export function resetBrowser(){
 try{if(localStorage.getItem(RESET_KEY)===RESET_VERSION)return true;for(const key of Object.keys(localStorage))if(key.startsWith('schiild.'))localStorage.removeItem(key);localStorage.setItem(RESET_KEY,RESET_VERSION);return true;}catch{return false;}
}
