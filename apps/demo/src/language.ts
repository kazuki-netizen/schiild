import {browserStorage} from './preview-mode.ts';
// DEMO ONLY. Language is a browser preference, separate from account and artwork data.
export const LANGUAGE_KEY='schiild.language.v1';
export const languages={ja:'日本語',en:'English',ko:'한국어',fr:'Français',nl:'Nederlands',es:'Español',it:'Italiano'} as const;
export type Language=keyof typeof languages;
export function validLanguage(value:unknown):value is Language{return typeof value==='string'&&Object.hasOwn(languages,value);}
export function readLanguage():Language{try{const saved=browserStorage().getItem(LANGUAGE_KEY);return validLanguage(saved)?saved:'ja';}catch{return 'ja';}}
let active:Language='ja';
export function currentLanguage(){return active;}
export function activateLanguage(language:Language){active=language;}
export function saveLanguage(language:Language){browserStorage().setItem(LANGUAGE_KEY,language);activateLanguage(language);}
export const numberLocale=()=>({ja:'ja-JP',en:'en-GB',ko:'ko-KR',fr:'fr-FR',nl:'nl-NL',es:'es-ES',it:'it-IT'}[active]);
export const shortDate=(day:string)=>new Intl.DateTimeFormat(numberLocale(),{month:'numeric',day:'numeric',timeZone:'UTC'}).format(new Date(day+'T00:00:00Z'));
