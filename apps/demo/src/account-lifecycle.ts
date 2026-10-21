// DEMO ONLY. Reconcile tabs and pages restored by Android Chrome's back/forward cache.
export function watchAccountLifecycle({target,document,readSession,onChange,onResume}:{target:Window;document:Document;readSession:()=>string|null;onChange:()=>void;onResume:()=>void}){
 let session=readSession();
 function check(){const next=readSession();if(next!==session){session=next;onChange();return true;}return false;}
 const storage=(event:StorageEvent)=>{if(event.key===null||event.key==='schiild.account.session.v2')check();};
 const resume=()=>{if(document.visibilityState==='visible'&&!check())onResume();};
 const pageshow=(event:PageTransitionEvent)=>{if(event.persisted)resume();};
 target.addEventListener('storage',storage);target.addEventListener('pageshow',pageshow);document.addEventListener('visibilitychange',resume);
 return ()=>{target.removeEventListener('storage',storage);target.removeEventListener('pageshow',pageshow);document.removeEventListener('visibilitychange',resume);};
}
