// DEMO ONLY: nested browsing gestures; source photos and generation are unaffected.
import {useRef} from 'react';
import type {PointerEvent,MouseEvent,DragEvent} from 'react';

type Options={onSwipe:(direction:-1|1)=>void;canStart:(target:Element,surface:HTMLElement)=>boolean};
type Gesture={pointerId:number;x:number;y:number;time:number;horizontal:boolean};
export default function useSwipe({onSwipe,canStart}:Options){
 const gesture=useRef<Gesture|null>(null),suppressClick=useRef(0);
 function down(event:PointerEvent<HTMLElement>){
  // A second finger cancels navigation, allowing browser zoom and image gestures.
  if(!event.isPrimary){gesture.current=null;return;}
  suppressClick.current=0;gesture.current=null;
  const target=event.target instanceof Element?event.target:null,surface=event.currentTarget;
  if(event.button!==0||!target||target.closest('[data-swipe-scope]')!==surface||document.querySelector('[aria-modal="true"]')||!canStart(target,surface))return;
  // Keep browser back/forward gestures at the viewport edges available.
  if(event.clientX<24||event.clientX>window.innerWidth-24)return;
  gesture.current={pointerId:event.pointerId,x:event.clientX,y:event.clientY,time:Date.now(),horizontal:false};
 }
 function move(event:PointerEvent<HTMLElement>){
  const start=gesture.current;if(!start||start.pointerId!==event.pointerId)return;
  const dx=Math.abs(event.clientX-start.x),dy=Math.abs(event.clientY-start.y);
  if(!start.horizontal){
   if(dy>10&&dy>dx){gesture.current=null;return;}
   if(dx<12||dx<dy*1.35)return;
   start.horizontal=true;event.currentTarget.setPointerCapture(event.pointerId);
  }
  event.preventDefault();
 }
 function up(event:PointerEvent<HTMLElement>){
  const start=gesture.current;gesture.current=null;if(!start||start.pointerId!==event.pointerId)return;
  const dx=event.clientX-start.x,dy=event.clientY-start.y;
  if(start.horizontal){suppressClick.current=Date.now()+400;event.preventDefault();}
  const threshold=Math.max(48,Math.min(96,event.currentTarget.clientWidth*.14));
  if(start.horizontal&&Math.abs(dx)>=threshold&&Math.abs(dx)>Math.abs(dy)*1.35&&Date.now()-start.time<1500)onSwipe(dx<0?1:-1);
 }
 return {
  onPointerDown:down,onPointerMove:move,onPointerUp:up,
  onPointerCancel:()=>{gesture.current=null;},onLostPointerCapture:(event:PointerEvent<HTMLElement>)=>{if(event.target===event.currentTarget)gesture.current=null;},
  onClickCapture:(event:MouseEvent<HTMLElement>)=>{if(event.detail>0&&Date.now()<suppressClick.current){event.preventDefault();event.stopPropagation();}},
  onDragStart:(event:DragEvent<HTMLElement>)=>{if(gesture.current)event.preventDefault();},
 };
}
