// DEMO ONLY. Account deletion clears both persistent and tab-local drafts.
export const ACCOUNT_ERASE_EVENT='schiild.account.erased.v1';
export function clearAccountStores(stores:Storage[]){
 let cleared=true;
 for(const store of stores){let keys:string[];try{keys=Object.keys(store).filter(key=>key.startsWith('schiild.'));}catch{cleared=false;continue;}
  for(const key of keys)try{store.removeItem(key);}catch{cleared=false;}
 }
 return cleared;
}
