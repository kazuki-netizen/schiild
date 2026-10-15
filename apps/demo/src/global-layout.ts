// DEMO ONLY. Pack one real participant pixel into each distinct square cell.
export type GlobalPixel={position:number;color:number[]};
export function compactGlobal(pixels:Record<string,GlobalPixel>){
 // Stored ordering survives account anonymization and old 256px coordinates.
 const entries=Object.entries(pixels).sort((a,b)=>a[1].position-b[1].position||a[0].localeCompare(b[0]));
 const outputSize=Math.max(1,Math.ceil(Math.sqrt(entries.length)));
 return {outputSize,pixels:entries.map(([member,pixel],position)=>({member,position,color:pixel.color}))};
}
