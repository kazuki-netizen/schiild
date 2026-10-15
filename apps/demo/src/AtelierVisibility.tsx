// DEMO ONLY: public discovery is opt-in and enforced by Cloudflare.
import React,{useEffect,useState} from 'react';
import {t} from './copy';
import {sharedRequest} from './shared-api';
import type {Visibility,SharedState} from './shared-api';
export function VisibilityField({value,disabled=false,onChange}:{value:Visibility;disabled?:boolean;onChange:(value:Visibility)=>void}){
 return <fieldset className="visibility-field" disabled={disabled}><legend>{t('demo.visibility.title')}</legend><div>{(['private','public'] as const).map(option=><button type="button" key={option} aria-pressed={value===option} onClick={()=>onChange(option)}>{t('demo.visibility.'+option as 'demo.visibility.private'|'demo.visibility.public')}</button>)}</div><p>{t('demo.visibility.note')}</p></fieldset>;
}
export default function AtelierVisibility({code}:{code:string}){
 const [state,setState]=useState<SharedState|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{const controller=new AbortController();setState(null);setError('');void sharedRequest('state',{code},controller.signal).then(setState).catch(cause=>{if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:t('demo.shared.unavailable'));});return()=>controller.abort();},[code,retry]);
 async function update(visibility:Visibility){if(busy)return;setBusy(true);setError('');try{setState(await sharedRequest('visibility.update',{code,visibility}));}catch(cause){setError(cause instanceof Error?cause.message:t('demo.shared.unavailable'));}finally{setBusy(false);}}
 return <div className="atelier-visibility" data-testid="atelier-visibility">{state?.canGenerate&&<VisibilityField value={state.visibility??'private'} disabled={busy} onChange={value=>void update(value)}/>}<p className="muted" role="status">{!state&&!error?t('common.loading'):busy?t('common.loading'):''}</p>{error&&<div className="error" role="alert"><p>{error}</p>{!state&&<button className="text-button" onClick={()=>setRetry(value=>value+1)}>{t('common.retry')}</button>}</div>}</div>;
}
