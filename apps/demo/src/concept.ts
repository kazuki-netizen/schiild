// DEMO ONLY. A photo theme is metadata; it never changes image generation.
export const CONCEPT_LIMIT=80;
export function normalizeConcept(value:unknown):string|null{
 if(value===undefined)return '';
 if(typeof value!=='string')return null;
 const text=value.trim().replace(/\s+/gu,' ');
 return text.length<=CONCEPT_LIMIT?text:null;
}
