// DEMO ONLY. A logical GLOBAL pixel opens into its explicitly recorded Schiil.
import type {View} from './global-view';
export type GlobalSchiil={position:number;image:string|null};
export type LoadGlobalSchiils=(positions:number[],signal:AbortSignal)=>Promise<GlobalSchiil[]>;
export function visibleSchiils(view:View,size:number,resolution:number,positions:number[]){
 const cell=size*view.scale/resolution;if(size<=0||view.scale<1.25||cell<20)return [];
 const left=size*(1-view.scale)/2+view.x,top=size*(1-view.scale)/2+view.y;
 const x0=Math.max(0,Math.floor(-left/cell)),x1=Math.min(resolution-1,Math.floor((size-left)/cell)),y0=Math.max(0,Math.floor(-top/cell)),y1=Math.min(resolution-1,Math.floor((size-top)/cell));
 return positions.filter(position=>{const x=position%resolution,y=Math.floor(position/resolution);return x>=x0&&x<=x1&&y>=y0&&y<=y1;}).map(position=>({position,left:left+position%resolution*cell,top:top+Math.floor(position/resolution)*cell,size:cell}));
}
