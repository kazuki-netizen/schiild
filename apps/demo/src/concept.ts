// DEMO ONLY. A photo theme is metadata; it never changes image generation.
export const CONCEPT_LIMIT=80;
export function isFreeConcept(value?:string):boolean{return !value?.trim()||value.trim()==='あなたのお気に入りの一枚';}
export function normalizeConcept(value:unknown):string|null{
 if(value===undefined)return '';
 if(typeof value!=='string')return null;
 const text=value.trim().replace(/\s+/gu,' ');
 return text.length<=CONCEPT_LIMIT?text:null;
}
