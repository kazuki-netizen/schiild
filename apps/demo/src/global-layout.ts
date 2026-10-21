// DEMO ONLY. Pack one real participant pixel into each distinct square cell.
export const GLOBAL_LAYOUT='random-compact-v2';
export type GlobalPixel={position:number;color:number[];orderKey?:string};
export function compactGlobal(pixels:Record<string,GlobalPixel>){
 // Independent stored random ranks, never posting order or member identifiers.
 // Ranks survive anonymization; the server initializes older records atomically.
 const entries=Object.entries(pixels),ranks=entries.map(([,pixel])=>pixel.orderKey);
 if(ranks.some(rank=>typeof rank!=='string'||!/^[a-f0-9]{32}$/.test(rank))||new Set(ranks).size!==entries.length)throw Error('global_layout_uninitialized');
 entries.sort((a,b)=>a[1].orderKey!<b[1].orderKey!?-1:1);
 const outputSize=Math.max(1,Math.ceil(Math.sqrt(entries.length)));
 return {outputSize,pixels:entries.map(([member,pixel],position)=>({member,position,color:pixel.color}))};
}
