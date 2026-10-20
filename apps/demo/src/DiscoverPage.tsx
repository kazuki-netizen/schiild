// DEMO ONLY. Search returns only the metadata of explicitly public ateliers.
import React,{useEffect,useRef,useState} from 'react';
import {t} from './copy';
import {sharedRequest} from './shared-api';
import type {DirectoryAtelier,DirectoryPage} from './shared-api';
import AtelierConcept from './AtelierConcept';
export default function DiscoverPage({joined,onCode,onChoose}:{joined:string[];onCode:(code:string)=>void;onChoose:(atelier:DirectoryAtelier)=>void}){
 const [code,setCode]=useState(''),[query,setQuery]=useState(''),[rows,setRows]=useState<DirectoryAtelier[]>([]),[cursor,setCursor]=useState<string|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const sequence=useRef(0),pending=useRef<AbortController|null>(null);
 useEffect(()=>{
  const controller=new AbortController(),request=++sequence.current;pending.current?.abort();pending.current=controller;setBusy(true);setRows([]);setCursor(null);setError('');
  const timer=setTimeout(()=>{void sharedRequest<DirectoryPage>('directory',{query},controller.signal).then(result=>{if(request===sequence.current){setRows(result.ateliers);setCursor(result.nextCursor);}}).catch(cause=>{if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:t('demo.shared.unavailable'));}).finally(()=>{if(!controller.signal.aborted&&request===sequence.current)setBusy(false);});},250);
  return()=>{clearTimeout(timer);controller.abort();};
 },[query,revision]);
 async function more(){if(busy||!cursor)return;const controller=new AbortController(),request=++sequence.current;pending.current?.abort();pending.current=controller;setBusy(true);setError('');try{const result=await sharedRequest<DirectoryPage>('directory',{query,cursor},controller.signal);if(request===sequence.current){setRows(previous=>[...previous,...result.ateliers.filter(item=>!previous.some(row=>row.code===item.code))]);setCursor(result.nextCursor);}}catch(cause){if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:t('demo.shared.unavailable'));}finally{if(!controller.signal.aborted&&request===sequence.current)setBusy(false);}}
 useEffect(()=>()=>{pending.current?.abort();sequence.current++;},[]);
 return <section className="discover-page" data-testid="discover-page"><h1>{t('demo.discover.title')}</h1>
  <form className="discover-invite" onSubmit={event=>{event.preventDefault();if(code.trim())onCode(code.trim());}}><label className="field">{t('created.code_label')}<input value={code} placeholder={t('join.code_ph')} onChange={event=>setCode(event.target.value)} autoCapitalize="characters" spellCheck={false}/></label><button className="button secondary" type="submit" disabled={!code.trim()}>{t('join.title')}</button></form>
  <div className="section-heading"><h2>{t('demo.discover.public')}</h2><button className="text-button" onClick={()=>setRevision(value=>value+1)} disabled={busy}>{t('demo.shared.refresh')}</button></div>
  <label className="field discover-search">{t('demo.discover.search')}<input type="search" value={query} maxLength={80} placeholder={t('demo.discover.placeholder')} onChange={event=>setQuery(event.target.value)}/></label>
  <div className="discover-list" aria-busy={busy}>{rows.map(room=><button className="discover-card" key={room.code} data-code={room.code} data-joined={joined.includes(room.code)} onClick={()=>onChoose(room)}><strong>{room.name}</strong><AtelierConcept concept={room.concept}/><span className="muted">{t('join.preview.stats',{cap:room.capacity,n:room.members,total:room.total})}</span><span className="discover-card-footer"><span className="mono">{room.code}</span><span>{t('demo.discover.open')}</span></span></button>)}</div>
  {busy&&<p className="shared-status" role="status">{t('common.loading')}</p>}{!busy&&!error&&!rows.length&&<p className="muted" role="status">{t(query.trim()?'demo.discover.no_results':'demo.discover.empty')}</p>}
  {error&&<div className="error" role="alert"><p>{error}</p><button className="text-button" onClick={()=>setRevision(value=>value+1)}>{t('common.retry')}</button></div>}
  {cursor&&<button className="button secondary" disabled={busy} onClick={()=>void more()}>{t('demo.discover.more')}</button>}
 </section>;
}
