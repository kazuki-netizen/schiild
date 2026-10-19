import React,{useEffect,useState} from 'react';
import {Icon} from '../App';
import {t} from './copy';
import {shortDate} from './language';
import {sharedRequest} from './shared-api';
import {dataUrl,globalPixels,synthetic} from './engine';
import {dayAfter} from './model';
import type {Work} from './model';
import AreaDisplay from './AreaDisplay';
import GlobalExplorer from './GlobalExplorer';
export type GlobalSelection={day:string;sample?:Work};
type GlobalArtwork={code:string;name:string;image:string;provisional?:boolean;positions:number[]};
type GlobalWork={day:string;image:string|null;count:number;ateliers:number;final:boolean;x?:number;y?:number;positions?:number[];outputSize?:number;artworks?:GlobalArtwork[]};
const PIXEL_SIZE=18;
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
 const day=selection.day,short=shortDate,mine=work?.x!==undefined&&work?.y!==undefined,x=work?.x??0,y=work?.y??0,resolution=work?.outputSize||256,total=resolution*resolution,pixelZoom=Math.max(1,resolution*PIXEL_SIZE/288);
 const position=selectedPixel??(mine?y*resolution+x:work?.positions?.[0]),artwork=work?.artworks?.find(item=>position!==undefined&&item.positions.includes(position));
 return <section className="global-page" data-testid="global-page" data-day={day} style={{'--global-pixel-size':`${PIXEL_SIZE}px`} as React.CSSProperties}>
  <div className="wall-label">{t('global.label')}</div><h1>{day.replaceAll('-',' / ')}</h1><p className="window">{t('atelier.window',{start:short(day)+' 09:00',end:short(dayAfter(day))+' 09:00'})}</p>
  {selection.sample&&<p className="sample-note">{t('demo.global.sample')}</p>}
  {error&&<p className="error" role="alert">{error}</p>}
  {!work&&!error&&<p>{t('common.loading')}</p>}
  {work&&!work.image&&<p>{t('demo.global.empty')}</p>}
  {work?.image&&<>
   <GlobalExplorer key={day} image={work.image} positions={work.positions} mine={mine?{x,y}:undefined} sample={Boolean(selection.sample)} resolution={resolution} onSelectPixel={setSelectedPixel}/>
   {work.artworks&&<section className="global-related-work" data-testid="global-related-work"><p className="wall-label">{t('demo.global.atelier_work')}</p>{artwork?<><h2>{artwork.name}</h2><img src={artwork.image} alt={artwork.name}/>{artwork.provisional&&<p>{t('demo.draft.label')}</p>}</>:<p>{t('demo.global.artwork_unavailable')}</p>}</section>}
   {mine?<><button className="pixel-link" onClick={()=>setZoom(!zoom)}><span>{t('global.your_pixel',{n:y*resolution+x+1})}</span><Icon kind="arrow"/></button><div className="zoom-stage" data-testid="global-zoom" data-zoom={zoom}><img src={work.image} alt={t('schiild.regions.mine')} style={{transformOrigin:`${(x+.5)/resolution*100}% ${(y+.5)/resolution*100}%`,transform:zoom?`translate(${(resolution/2-x-.5)/resolution*100}%, ${(resolution/2-y-.5)/resolution*100}%) scale(${pixelZoom})`:'scale(1)'}}/><span className={zoom?'zoom-target visible':'zoom-target'}/></div><div className="loupe-row"><div className="loupe"><img src={work.image} alt={t('schiild.regions.mine')} style={{width:resolution*PIXEL_SIZE,height:resolution*PIXEL_SIZE,left:-(x-4)*PIXEL_SIZE,top:-(y-4)*PIXEL_SIZE}}/><span/></div><div><p className="mono">{t('global.coords',{x,y})}</p><p className="muted">{t('schiild.regions.mine')}</p></div></div></>:<p>{t('demo.global.no_pixel')}</p>}
   <div className="stats"><div><span>{t('global.stat.posts')}</span><b>{work.count}</b></div><div><span>{t('global.stat.ateliers')}</span><b>{work.ateliers}</b></div></div>
   <AreaDisplay global area={{pixels:mine?1:0,total,percent:(mine?1:0)/total*100}}/>
   {!work.final&&!selection.sample&&<p className="shared-note">{t('demo.global.live')}</p>}
  </>}
 </section>;
}
