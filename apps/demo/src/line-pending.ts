// DEMO ONLY. A short-lived state proof, never an OAuth code, token or channel secret.
// localStorage allows LINE's Android app to return into another Chrome tab.
export type LinePending={state:string;intent:'login'|'register'|'delete';startedAt:number};
type Stores={local:Storage;session:Storage};
const sessionKey='schiild.line.pending',prefix=sessionKey+'.';
const lifetime=300000;
const validState=(state:string)=>/^[a-f0-9]{64}$/.test(state);
function read(store:Storage,key:string){try{return JSON.parse(store.getItem(key)??'null');}catch{return null;}}
function remove(store:Storage,key:string){try{store.removeItem(key);}catch{}}
function fresh(value:LinePending,now:number){return value&&validState(value.state)&&['login','register','delete'].includes(value.intent)&&Number.isFinite(value.startedAt)&&value.startedAt<=now+60000&&now-value.startedAt<=lifetime;}
export function saveLinePending(value:LinePending,stores:Stores){
 if(!fresh(value,Date.now()))throw Error('invalid_pending');
 // Only our expired state records are removed; other tabs and application data remain.
 try{for(const key of Object.keys(stores.local))if(key.startsWith(prefix)&&!fresh(read(stores.local,key),Date.now()))remove(stores.local,key);}catch{}
 const text=JSON.stringify(value);let saved=false;
 try{stores.local.setItem(prefix+value.state,text);saved=true;}catch{}
 try{stores.session.setItem(sessionKey,text);saved=true;}catch{}
 if(!saved)throw Error('storage_unavailable');
}
export function consumeLinePending(state:string,stores:Stores,now=Date.now()):LinePending|null{
 if(!validState(state))return null;
 const session=read(stores.session,sessionKey),local=read(stores.local,prefix+state);
 const value=[session,local].find(candidate=>candidate?.state===state&&fresh(candidate,now));
 // Consume only the matching attempt. A forged return cannot erase another login.
 if(session?.state===state)remove(stores.session,sessionKey);
 remove(stores.local,prefix+state);
 return value??null;
}
export function pendingLineDeletion(stores:Stores):boolean{
 // Only the originating tab shows the unfinished-operation notice. Other tabs
 // must not mistake someone else's in-progress confirmation for their own.
 // Read only: the actual callback may still be arriving in another tab.
 const value=read(stores.session,sessionKey);
 return value?.intent==='delete'&&fresh(value,Date.now());
}
