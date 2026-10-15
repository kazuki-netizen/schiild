import React,{useEffect,useState} from 'react';
import {sharedRequest} from './shared-api';
import {beginLine} from './line-login';
import {t} from './copy';
// Ordinary text link, without reproducing or changing the LINE brand icon.
export default function LineSignIn({disabled=false,linked=false}:{disabled?:boolean;linked?:boolean}){
 const [enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();void sharedRequest<{enabled:boolean}>('account.line.config',{},controller.signal).then(value=>setEnabled(value.enabled)).catch(()=>{});return()=>controller.abort();},[]);
 if(!enabled)return null;
 return <div className="line-sign-in">{linked?<p>{t('demo.line.linked')}</p>:<a href="#line-login" aria-disabled={disabled||busy} onClick={event=>{event.preventDefault();if(disabled||busy)return;setBusy(true);setError('');void beginLine().catch(cause=>{setError(cause instanceof Error?cause.message:t('demo.line.unavailable'));setBusy(false);});}}>{t(busy?'common.loading':'demo.line.login')}</a>}{error&&<p className="error" role="alert">{error}</p>}</div>;
}
