// DEMO ONLY. Approved display vocabulary. Normalize templates before interpolation;
// never rewrite registered names, IDs, artwork data or other user-supplied values.
import type {Language} from './language';

export const propertyTerms={en:'property',it:'proprietà',ko:'소유지',fr:'propriété',nl:'perceel',es:'propiedad'} as const;
export const categoryTerms:Record<Language,string>={ja:'カテゴリー',en:'Category',it:'Categoria',ko:'카테고리',fr:'Catégorie',nl:'Categorie',es:'Categoría'};

function initialCase(source:string,target:string){return source[0]===source[0].toUpperCase()?target[0].toUpperCase()+target.slice(1):target;}
export function displayTerminology(key:string,language:Language,value:string){
 if(key==='me.title'&&language==='ja')return 'プロフィール';
 if(key==='schiild.meta.tier')return categoryTerms[language];
 if(key==='demo.global.empty_pixel'&&language!=='ja')return {en:'This property is empty',it:'Questa proprietà è vuota',ko:'이 소유지는 아직 비어 있습니다',fr:'Cette propriété est vide',nl:'Dit perceel is leeg',es:'Esta propiedad está vacía'}[language];
 // Keep the GLOBAL name indivisible while lowercasing the two artwork names.
 const marker='\uE000';
 let text=value.replace(/グローバル(?:シールト)?|\bGLOBAL(?:\s+SCHIILD)?\b/gi,marker);
 if(language!=='ja'){
  text=text.replace(/\b(schiild|schiil)(s)?\b/gi,(word,stem:string,plural:string|undefined)=>key==='excluded.final'&&stem.toLowerCase()==='schiild'?'Schiild':stem.toLowerCase()+(plural?'s':''));
  const pairs:Partial<Record<Language,[RegExp,string][]>>={
   en:[[/\bregions\b/gi,'properties'],[/\bregion\b/gi,'property']],
   it:[[/\bzone\b/gi,'proprietà'],[/\bzona\b/gi,'proprietà']],
   fr:[[/\bzones\b/gi,'propriétés'],[/\bzone\b/gi,'propriété']],
   nl:[[/\bvlakken\b/gi,'percelen'],[/\bvlak\b/gi,'perceel']],
   es:[[/\bzonas\b/gi,'propiedades'],[/\bzona\b/gi,'propiedad']],
  };
  for(const [pattern,target] of pairs[language]??[])text=text.replace(pattern,word=>initialCase(word,target));
  if(language==='ko')text=text.replaceAll('구역으로','소유지로').replaceAll('구역이 ','소유지가 ').replaceAll('구역은','소유지는').replaceAll('구역을','소유지를').replaceAll('구역과','소유지와').replaceAll('구역','소유지');
  // These templates describe a person's allotted property using other nouns.
  if(key==='demo.global.pixel_note'){
   if(language==='en')text=text.replace('One cell per person.','One property per person.');
   if(language==='it')text=text.replace('Una casella a persona.','Una proprietà a persona.');
   if(language==='fr')text=text.replace('Une case par personne.','Une propriété par personne.');
   if(language==='nl')text=text.replace('Eén vak per persoon.','Eén perceel per persoon.');
   if(language==='es')text=text.replace('Una casilla por persona.','Una propiedad por persona.');
  }
  if(language==='ko')text=text.replaceAll(marker+'은',marker+'는').replaceAll(marker+'을',marker+'를').replaceAll(marker+'이 ',marker+'가 ');
 }
 return text.replaceAll(marker,'GLOBAL SCHIILD');
}
