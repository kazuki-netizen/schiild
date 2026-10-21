import React,{useEffect,useState} from 'react';
import {sharedRequest} from './shared-api';
import {beginLine} from './line-login';
import {t} from './copy';
// Ordinary text link, without reproducing or changing the LINE brand icon.
export default function LineSignIn({disabled=false,linked=false,required=false}:{disabled?:boolean;linked?:boolean;required?:boolean}){
 const [ready,setReady]=useState(false),[revision,setRevision]=useState(0);
 const [enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();setReady(false);void sharedRequest<{enabled:boolean}>('account.line.config',{},controller.signal).then(value=>setEnabled(value.enabled)).catch(()=>{}).finally(()=>{if(!controller.signal.aborted)setReady(true);});return()=>controller.abort();},[revision]);
 if(!enabled)return required?<div className="line-sign-in">{ready?<><p role="status">{t('demo.line.unavailable')}</p><button className="text-button" onClick={()=>setRevision(value=>value+1)}>{t('common.retry')}</button></>:<p role="status">{t('common.loading')}</p>}</div>:null;
 return <div className="line-sign-in">{linked?<p>{t('demo.line.linked')}</p>:<a href="#line-login" aria-disabled={disabled||busy} onClick={event=>{event.preventDefault();if(disabled||busy)return;setBusy(true);setError('');void beginLine().catch(cause=>{setError(cause instanceof Error?cause.message:t('demo.line.unavailable'));setBusy(false);});}}>{t(busy?'common.loading':'demo.line.login')}</a>}{error&&<p className="error" role="alert">{error}</p>}</div>;
}
