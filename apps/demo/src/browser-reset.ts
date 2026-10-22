import {browserStorage,browserSessionStorage} from './preview-mode.ts';
import {clearAccountStores} from './account-storage.ts';
// DEMO ONLY: one-time reset explicitly requested by the user on 2026-10-22.
export const RESET_KEY='schiild.reset.version';
export const RESET_VERSION='2026-10-22-all-1';
export function resetBrowser(){
 try{
  const local=browserStorage(),session=browserSessionStorage();
  // A second tab must clear its own old OAuth drafts without wiping a new
  // registration that another tab has already saved after the global reset.
  for(const store of [local,session])if(store.getItem(RESET_KEY)!==RESET_VERSION){if(!clearAccountStores([store]))return false;store.setItem(RESET_KEY,RESET_VERSION);}
  return true;
 }catch{return false;}
}
