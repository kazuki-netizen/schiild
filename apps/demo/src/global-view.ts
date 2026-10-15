// DEMO ONLY. Screen-space navigation of a square GLOBAL image of any resolution.
export type Point={x:number;y:number};
export type View={scale:number;x:number;y:number};
export const MAX_SCALE=64;
export const fullView=():View=>({scale:1,x:0,y:0});
export function boundView(view:View,size:number):View{
 const scale=Math.max(1,Math.min(MAX_SCALE,view.scale)),limit=Math.max(0,size*(scale-1)/2);
 return {scale,x:Math.max(-limit,Math.min(limit,view.x)),y:Math.max(-limit,Math.min(limit,view.y))};
}
export function zoomAt(view:View,scale:number,point:Point,size:number):View{
 const next=Math.max(1,Math.min(MAX_SCALE,scale)),ratio=next/view.scale;
 return boundView({scale:next,x:point.x-(point.x-view.x)*ratio,y:point.y-(point.y-view.y)*ratio},size);
}
export function pixelAt(view:View,point:Point,size:number,resolution=256):Point{
 return {x:Math.max(0,Math.min(resolution-1,Math.floor(((point.x-view.x)/(size*view.scale)+.5)*resolution))),y:Math.max(0,Math.min(resolution-1,Math.floor(((point.y-view.y)/(size*view.scale)+.5)*resolution)))};
}
export function pixelPosition(view:View,pixel:Point,size:number,resolution=256):Point{
 return {x:size/2+view.x+((pixel.x+.5)/resolution-.5)*size*view.scale,y:size/2+view.y+((pixel.y+.5)/resolution-.5)*size*view.scale};
}
