// DEMO ONLY. Zoom reveals only photos explicitly recorded in GLOBAL.
import React,{useEffect,useRef,useState} from 'react';
import {t} from './copy';
import HelpDetails from './HelpDetails';
import {preferences} from './preferences';
import {boundView,zoomAt,pixelAt,pixelPosition,fullView,MAX_SCALE} from './global-view';
import type {View,Point} from './global-view';
import {visibleSchiils} from './global-schiils';
import type {LoadGlobalSchiils} from './global-schiils';
type Pointer={x:number;y:number};
type Gesture={view:View;points:Pointer[]};
const middle=(a:Pointer,b:Pointer):Point=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
const distance=(a:Pointer,b:Pointer)=>Math.hypot(a.x-b.x,a.y-b.y);
export default function GlobalExplorer({image,detailImage,positions,mine,sample=false,resolution=256,loadSchiils,onFocusMine,onReset}:{image:string;detailImage?:string;positions?:number[];mine?:Point;sample?:boolean;resolution?:number;loadSchiils?:LoadGlobalSchiils;onFocusMine?:()=>void;onReset?:()=>void}){
 const stage=useRef<HTMLDivElement>(null),motion=useRef<number|null>(null),pointers=useRef(new Map<number,Pointer>()),gesture=useRef<Gesture|null>(null);
 const [size,setSize]=useState(0),[view,setView]=useState<View>(fullView),[selected,setSelected]=useState<Point|null>(null),[animating,setAnimating]=useState(false);
 const photos=useRef(new Map<number,string|null>()),[photoImages,setPhotoImages]=useState<Record<number,string|null>>({}),[loadingPhotos,setLoadingPhotos]=useState(false),[photoError,setPhotoError]=useState(false),[retry,setRetry]=useState(0);
 const sizeRef=useRef(0),viewRef=useRef(view),tap=useRef<{pointerId:number;point:Point;time:number;moved:boolean}|null>(null),lastTap=useRef<{point:Point;time:number}|null>(null);
 function apply(next:View){const previous=viewRef.current,bounded=boundView(next,sizeRef.current);viewRef.current=bounded;setView(bounded);if(bounded.scale===1&&previous.scale>1)onReset?.();}
 function centered(clientX:number,clientY:number):Point{const box=stage.current!.getBoundingClientRect();return {x:clientX-box.left-box.width/2,y:clientY-box.top-box.height/2};}
 function seed(){gesture.current={view:{...viewRef.current},points:[...pointers.current.values()].map(point=>({...point}))};}
 function choose(pixel:Point){setSelected(pixel);}
 function cancelMotion(){if(motion.current!==null)cancelAnimationFrame(motion.current);motion.current=null;setAnimating(false);}
 function focusMine(){
  if(!mine)return;cancelMotion();pointers.current.clear();gesture.current=null;lastTap.current=null;apply(fullView());choose(mine);onFocusMine?.();
  const reduced=preferences().reduceMotion||matchMedia('(prefers-reduced-motion: reduce)').matches,width=sizeRef.current,scale=Math.min(MAX_SCALE,Math.max(2,resolution*.85)),target={scale,x:(.5-(mine.x+.5)/resolution)*width*scale,y:(.5-(mine.y+.5)/resolution)*width*scale};
  stage.current?.scrollIntoView({block:'center',behavior:reduced?'auto':'smooth'});
  if(reduced){apply(target);return;}
  setAnimating(true);const start=performance.now()+300;
  const frame=(now:number)=>{const p=Math.max(0,Math.min(1,(now-start)/1600)),eased=p*p*(3-2*p),nextScale=Math.exp(Math.log(scale)*eased);apply({scale:nextScale,x:(.5-(mine.x+.5)/resolution)*width*nextScale*eased,y:(.5-(mine.y+.5)/resolution)*width*nextScale*eased});if(p<1)motion.current=requestAnimationFrame(frame);else{motion.current=null;setAnimating(false);}};
  motion.current=requestAnimationFrame(frame);
 }
 useEffect(()=>()=>{if(motion.current!==null)cancelAnimationFrame(motion.current);},[]);
 useEffect(()=>{const element=stage.current;if(!element)return;const measure=()=>{cancelMotion();const width=element.getBoundingClientRect().width,old=sizeRef.current;sizeRef.current=width;setSize(width);const current=viewRef.current;apply({...current,x:old?current.x*width/old:0,y:old?current.y*width/old:0});pointers.current.clear();gesture.current=null;};measure();const observer=new ResizeObserver(measure);observer.observe(element);return()=>observer.disconnect();},[]);
 useEffect(()=>{const element=stage.current;if(!element)return;const wheel=(event:WheelEvent)=>{event.preventDefault();cancelMotion();apply(zoomAt(viewRef.current,viewRef.current.scale*Math.exp(-event.deltaY*.002),centered(event.clientX,event.clientY),sizeRef.current));};element.addEventListener('wheel',wheel,{passive:false});return()=>element.removeEventListener('wheel',wheel);},[]);
 useEffect(()=>{cancelMotion();setSelected(null);lastTap.current=null;apply(fullView());},[resolution]);
 const mineNumber=mine?mine.y*resolution+mine.x:null;
 const tiles=loadSchiils?visibleSchiils(view,size,resolution,positions??[]):[],selectedNumber=selected?selected.y*resolution+selected.x:null,wanted=[...new Set([...(mineNumber!==null?[mineNumber]:[]),...tiles.map(tile=>tile.position),...(selectedNumber!==null&&positions?.includes(selectedNumber)?[selectedNumber]:[])])],signature=wanted.join(',');
 useEffect(()=>{
  if(!loadSchiils)return;const controller=new AbortController(),needed=new Set(signature?signature.split(',').map(Number):[]),queue=[...needed].filter(position=>!photos.current.has(position));setPhotoError(false);setLoadingPhotos(Boolean(queue.length));
  const timer=setTimeout(()=>{async function worker(){while(queue.length&&!controller.signal.aborted){const batch=queue.splice(0,9);try{const result=await loadSchiils!(batch,controller.signal);if(controller.signal.aborted)return;for(const item of result)photos.current.set(item.position,item.image);for(const position of photos.current.keys()){if(photos.current.size<=512)break;if(!needed.has(position))photos.current.delete(position);}setPhotoImages(Object.fromEntries(photos.current));}catch{if(!controller.signal.aborted)setPhotoError(true);}}}void Promise.all([worker(),worker()]).finally(()=>{if(!controller.signal.aborted)setLoadingPhotos(false);});},100);
  return()=>{clearTimeout(timer);controller.abort();};
 },[signature,loadSchiils,retry]);
 function down(event:React.PointerEvent<HTMLDivElement>){if(event.button!==0||pointers.current.size>=2)return;cancelMotion();event.preventDefault();event.currentTarget.focus({preventScroll:true});event.currentTarget.setPointerCapture(event.pointerId);const point=centered(event.clientX,event.clientY);pointers.current.set(event.pointerId,point);if(pointers.current.size===1)tap.current={pointerId:event.pointerId,point,time:Date.now(),moved:false};else if(tap.current)tap.current.moved=true;seed();}
 function move(event:React.PointerEvent<HTMLDivElement>){if(!pointers.current.has(event.pointerId))return;event.preventDefault();const point=centered(event.clientX,event.clientY);pointers.current.set(event.pointerId,point);if(tap.current&&distance(tap.current.point,point)>6){tap.current.moved=true;lastTap.current=null;}const start=gesture.current,points=[...pointers.current.values()];if(!start)return;
  if(points.length===2&&start.points.length===2){const before=middle(start.points[0],start.points[1]),after=middle(points[0],points[1]),scale=Math.max(1,Math.min(MAX_SCALE,start.view.scale*distance(points[0],points[1])/Math.max(1,distance(start.points[0],start.points[1])))),ratio=scale/start.view.scale;apply({scale,x:after.x-(before.x-start.view.x)*ratio,y:after.y-(before.y-start.view.y)*ratio});}
  else if(points.length===1&&start.points.length===1)apply({...start.view,x:start.view.x+point.x-start.points[0].x,y:start.view.y+point.y-start.points[0].y});
 }
 function up(event:React.PointerEvent<HTMLDivElement>,cancelled=false){if(!pointers.current.has(event.pointerId))return;const point=centered(event.clientX,event.clientY),candidate=tap.current;
  if(!cancelled&&candidate?.pointerId===event.pointerId&&!candidate.moved&&distance(candidate.point,point)<6&&Date.now()-candidate.time<600&&pointers.current.size===1){choose(pixelAt(viewRef.current,point,sizeRef.current,resolution));const previous=lastTap.current;if(previous&&Date.now()-previous.time<350&&distance(previous.point,point)<24){apply(zoomAt(viewRef.current,viewRef.current.scale>=MAX_SCALE?1:viewRef.current.scale*2,point,sizeRef.current));lastTap.current=null;}else lastTap.current={point,time:Date.now()};}
  pointers.current.delete(event.pointerId);if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);tap.current=null;seed();
 }
 function keyboard(event:React.KeyboardEvent<HTMLDivElement>){cancelMotion();const current=viewRef.current,step=32;let next:View|undefined;if(event.key==='+'||event.key==='=')next=zoomAt(current,current.scale*2,{x:0,y:0},sizeRef.current);else if(event.key==='-')next=zoomAt(current,current.scale/2,{x:0,y:0},sizeRef.current);else if(event.key==='ArrowLeft')next={...current,x:current.x+step};else if(event.key==='ArrowRight')next={...current,x:current.x-step};else if(event.key==='ArrowUp')next={...current,y:current.y+step};else if(event.key==='ArrowDown')next={...current,y:current.y-step};else if(event.key==='Home')next=fullView();else if(event.key==='Enter'||event.key===' '){event.preventDefault();choose(pixelAt(current,{x:0,y:0},sizeRef.current,resolution));}if(next){event.preventDefault();apply(next);}}
 const selectedPosition=selected?pixelPosition(view,selected,size,resolution):null,minePosition=mine?pixelPosition(view,mine,size,resolution):null,pixelSize=size*view.scale/resolution,posted=selected&&positions?.includes(selected.y*resolution+selected.x),self=selected&&mine&&selected.x===mine.x&&selected.y===mine.y;
 function mark(point:Point,kind:string){return <span className={'explorer-marker '+kind} style={{left:point.x,top:point.y,width:Math.max(5,pixelSize),height:Math.max(5,pixelSize)}}/>;}
 return <div className="global-explorer">
  <div className="global-overview artboard explorer-stage" ref={stage} role="region" tabIndex={0} aria-label={t('demo.global.explore')} aria-describedby="explorer-help" data-testid="global-explorer" data-animating={animating} data-resolution={resolution} data-scale={view.scale} data-pan-x={view.x} data-pan-y={view.y} onPointerDown={down} onPointerMove={move} onPointerUp={event=>up(event)} onPointerCancel={event=>up(event,true)} onLostPointerCapture={event=>{if(pointers.current.has(event.pointerId))up(event,true);}} onKeyDown={keyboard}>
   <img src={image} alt={detailImage?'':t('global.label')} aria-hidden={detailImage?true:undefined} draggable={false} style={{visibility:detailImage?'hidden':undefined,transform:`matrix(${view.scale},0,0,${view.scale},${view.x},${view.y})`}}/>
   {detailImage&&<img className="explorer-atlas" src={detailImage} alt={t('global.label')} draggable={false} style={{transform:`matrix(${view.scale},0,0,${view.scale},${view.x},${view.y})`}}/>}
   {tiles.map(tile=><div key={tile.position} className="explorer-schiil" data-position={tile.position} style={{left:tile.left,top:tile.top,width:tile.size,height:tile.size}}>{photoImages[tile.position]&&<img src={photoImages[tile.position]!} alt="" aria-hidden="true" draggable={false}/>}</div>)}
   {minePosition&&mark(minePosition,'mine')}{selectedPosition&&mark(selectedPosition,'selected')}
  </div>
  {loadingPhotos&&<p className="explorer-photo-status" role="status">{t('common.loading')}</p>}{photoError&&<button className="text-button" onClick={()=>setRetry(value=>value+1)}>{t('common.retry')}</button>}
  {mine&&mineNumber!==null&&loadSchiils&&<button type="button" className="global-own-schiil" data-testid="global-own-schiil" data-x={mine.x} data-y={mine.y} onClick={focusMine}>
   {photoImages[mineNumber]?<img src={photoImages[mineNumber]!} alt=""/>:<span className="own-schiil-loading">{t(photoImages[mineNumber]===null?'demo.global.photo_unavailable':'common.loading')}</span>}
   <span className="own-schiil-copy" data-testid={self?'global-pixel-inspection':undefined} data-x={mine.x} data-y={mine.y}><span>{t('schiild.regions.mine')}</span><span className="mono" data-testid="global-own-coordinates">{t('global.coords',{x:mine.x+1,y:mine.y+1})}</span></span>
  </button>}
  {selected&&!self&&<div className="pixel-inspection" data-testid="global-pixel-inspection" data-x={selected.x} data-y={selected.y}><div><p>{t(sample?'demo.global.sample_pixel':posted?'demo.global.selected_schiil':'demo.global.empty_pixel')}</p><p className="mono">{t('global.coords',{x:selected.x+1,y:selected.y+1})}</p>
   {selectedNumber!==null&&loadSchiils&&posted&&<div className="global-selected-schiil" data-testid="global-selected-schiil">{photoImages[selectedNumber]?<img src={photoImages[selectedNumber]!} alt={t('demo.global.selected_schiil')}/>:photoImages[selectedNumber]===null?<p>{t('demo.global.photo_unavailable')}</p>:null}</div>}
  </div></div>}

  <HelpDetails label="demo.help.gestures"><p id="explorer-help">{t('demo.global.gestures')}</p><p>{t('demo.global.pixel_note')}</p></HelpDetails>
 </div>;
}
