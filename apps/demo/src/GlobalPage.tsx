import React,{useCallback,useEffect,useState} from 'react';
import {Icon} from '../App';
import {t} from './copy';
import {shortDate} from './language';
import {sharedRequest} from './shared-api';
import {dataUrl,globalPixels,synthetic} from './engine';
import {dayAfter} from './model';
import type {Work} from './model';
import AreaDisplay from './AreaDisplay';
import GlobalExplorer from './GlobalExplorer';
import type {GlobalSchiil} from './global-schiils';
export type GlobalSelection={day:string;sample?:Work};
type GlobalArtwork={code:string;name:string;image:string;provisional?:boolean;positions:number[]};
type GlobalWork={day:string;image:string|null;schiilImage?:string;count:number;ateliers:number;final:boolean;x?:number;y?:number;positions?:number[];outputSize?:number;artworks?:GlobalArtwork[]};
export default function GlobalPage({selection,revision}:{selection:GlobalSelection;revision:number}){
 const [work,setWork]=useState<GlobalWork|null>(null),[error,setError]=useState(''),[zoom,setZoom]=useState(false),[selectedPixel,setSelectedPixel]=useState<number|null>(null);
 useEffect(()=>{
  const controller=new AbortController();let sequence=0;
  setWork(null);setError('');setZoom(false);setSelectedPixel(null);
  if(selection.sample){const sample=selection.sample,seed=Number(selection.day.replaceAll('-',''));const made=sample.global??dataUrl(globalPixels(synthetic(seed),seed).pixels);setWork({day:sample.day,image:made,count:sample.count,ateliers:1,final:true,...(sample.global?{x:sample.x,y:sample.y}:{})});return()=>controller.abort();}
  async function refresh(){const request=++sequence;try{const next=await sharedRequest<GlobalWork>('global',{day:selection.day},controller.signal);if(!controller.signal.aborted&&request===sequence){setWork(next);setError('');}}catch(cause){if(!controller.signal.aborted&&request===sequence)setError(cause instanceof Error?cause.message:t('error.server.body'));}}
  void refresh();const timer=setInterval(()=>{if(document.visibilityState==='visible'&&selection.day===new Date().toISOString().slice(0,10))void refresh();},5000);
  return()=>{controller.abort();clearInterval(timer);};
 },[selection.day,selection.sample,revision]);
 const loadSchiils=useCallback(async(positions:number[],signal:AbortSignal)=>(await sharedRequest<{schiils:GlobalSchiil[]}>('global.schiils',{day:selection.day,positions},signal)).schiils,[selection.day]);
 const day=selection.day,short=shortDate,mine=work?.x!==undefined&&work?.y!==undefined,x=work?.x??0,y=work?.y??0,resolution=work?.outputSize||256,total=resolution*resolution;
 const position=selectedPixel??(mine?y*resolution+x:work?.positions?.[0]),artwork=work?.artworks?.find(item=>position!==undefined&&item.positions.includes(position));
 return <section className="global-page" data-testid="global-page" data-day={day}>
  <div className="wall-label">{t('global.label')}</div><h1>{day.replaceAll('-',' / ')}</h1><p className="window">{t('atelier.window',{start:short(day)+' 09:00',end:short(dayAfter(day))+' 09:00'})}</p>
  {selection.sample&&<p className="sample-note">{t('demo.global.sample')}</p>}
  {error&&<p className="error" role="alert">{error}</p>}
  {!work&&!error&&<p>{t('common.loading')}</p>}
  {work&&!work.image&&<p>{t('demo.global.empty')}</p>}
  {work?.image&&<>
   <div data-testid="global-zoom" data-zoom={zoom}><GlobalExplorer key={day} image={work.image} detailImage={work.schiilImage} positions={work.positions} mine={mine?{x,y}:undefined} sample={Boolean(selection.sample)} resolution={resolution} onSelectPixel={setSelectedPixel} loadSchiils={selection.sample?undefined:loadSchiils} focus={zoom&&mine?{x,y}:undefined} onReset={()=>setZoom(false)}/></div>
   {work.artworks&&<section className="global-related-work" data-testid="global-related-work"><p className="wall-label">{t('demo.global.atelier_work')}</p>{artwork?<><h2>{artwork.name}</h2><img src={artwork.image} alt={artwork.name}/>{artwork.provisional&&<p>{t('demo.draft.label')}</p>}</>:<p>{t('demo.global.artwork_unavailable')}</p>}</section>}
   {mine?<button className="pixel-link" onClick={()=>{setZoom(!zoom);document.querySelector('[data-testid=global-explorer]')?.scrollIntoView({block:'center',behavior:'smooth'});}}><span>{t('global.your_pixel',{n:y*resolution+x+1})}</span><Icon kind="arrow"/></button>:<p>{t('demo.global.no_pixel')}</p>}
   <div className="stats"><div><span>{t('global.stat.posts')}</span><b>{work.count}</b></div><div><span>{t('global.stat.ateliers')}</span><b>{work.ateliers}</b></div></div>
   <AreaDisplay global area={{pixels:mine?1:0,total,percent:(mine?1:0)/total*100}}/>
   {!work.final&&!selection.sample&&<p className="shared-note">{t('demo.global.live')}</p>}
  </>}
 </section>;
}
