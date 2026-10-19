import test from 'node:test';
import assert from 'node:assert/strict';
import {partition,random,render,resample,synthetic,colors,globalPixels,VOID_COLOR} from '../src/engine.ts';
test('BSP covers the complete integer grid without gaps or overlap',()=>{
 for(const count of [1,2,5,12,20,200]){const grid=new Uint16Array(128*128),rects=partition(count,random(count));assert.equal(rects.length,count);for(const r of rects){assert(r.w>0&&r.h>0);for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)grid[y*128+x]++;}assert(grid.every(n=>n===1));}
});
test('photo content affects its region and output uses only the temporary palette',()=>{
 const rects=partition(12,random(29)),sources=rects.map((_,n)=>n<9?synthetic(31+n):null),a=render(rects,sources,12),b=render(rects,[synthetic(400),...sources.slice(1)],12);assert.notDeepEqual(a.data,b.data);
 const allowed=new Set([...colors,VOID_COLOR].map(c=>c.join(',')));for(let n=0;n<a.data.length;n+=4){assert(allowed.has(Array.from(a.data.slice(n,n+3)).join(',')));assert.equal(a.data[n+3],255);}
 for(const r of rects.slice(1)){for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++){const p=(y*128+x)*4;assert.deepEqual(a.data.slice(p,p+4),b.data.slice(p,p+4));}}
});
test('unposted regions including corners remain opaque pure white',()=>{
 const rects=partition(12,random(29)),sources=rects.map((_,slot)=>slot===4?synthetic(80):null),pixels=render(rects,sources,29,256);
 for(const rect of rects.filter(rect=>rect.slot!==4))for(let y=rect.y*2;y<(rect.y+rect.h)*2;y++)for(let x=rect.x*2;x<(rect.x+rect.w)*2;x++)assert.deepEqual([...pixels.data.subarray((y*256+x)*4,(y*256+x)*4+4)],[255,255,255,255]);
 assert(render([],[],1).data.every(value=>value===255));
});
test('area average and personal global pixel retain the supplied photograph color',()=>{
 const source={width:2,height:2,data:new Uint8ClampedArray([255,0,0,255,0,255,0,255,0,0,255,255,255,255,255,255])};assert.deepEqual([...resample(source,1,1)],[127.5,127.5,127.5]);
 const a=globalPixels(synthetic(10),29);assert(a.x>=0&&a.x<256&&a.y>=0&&a.y<256);assert.equal(a.pixels.data.length,256*256*4);
});
test('256px rendering retains photo details that 128px area sampling cannot retain',()=>{
 const source={width:256,height:256,data:new Uint8ClampedArray(256*256*4)};for(let y=0;y<256;y++)for(let x=0;x<256;x++)source.data.set([...colors[x%2?0:5],255],(y*256+x)*4);
 const rects=partition(1,random(29)),low=render(rects,[source],29),high=render(rects,[source],29,256);assert.equal(high.width,256);assert.equal(high.height,256);assert.equal(high.data.length,low.data.length*4);
 for(const x of [96,97])assert.deepEqual([...high.data.subarray((90*256+x)*4,(90*256+x)*4+3)],colors[x%2?0:5]);
 assert.notDeepEqual(high.data.subarray((90*256+96)*4,(90*256+98)*4),new Uint8ClampedArray([...low.data.subarray((45*128+48)*4,(45*128+49)*4),...low.data.subarray((45*128+48)*4,(45*128+49)*4)]));
});
test('256px rendering keeps palette, opacity and isolation between BSP regions',()=>{
 const rects=partition(20,random(31)),sources=rects.map((_,n)=>synthetic(n+32)),a=render(rects,sources,31,256),b=render(rects,[synthetic(600),...sources.slice(1)],31,256),allowed=new Set(colors.map(color=>color.join(',')));
 for(let n=0;n<a.data.length;n+=4){assert(allowed.has([...a.data.subarray(n,n+3)].join(',')));assert.equal(a.data[n+3],255);}
 for(const rect of rects.slice(1))for(let y=rect.y*2;y<(rect.y+rect.h)*2;y++)for(let x=rect.x*2;x<(rect.x+rect.w)*2;x++){const offset=(y*256+x)*4;assert.deepEqual(a.data.subarray(offset,offset+4),b.data.subarray(offset,offset+4));}
});
