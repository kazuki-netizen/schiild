import {browserStorage,isWeekPreview} from './preview-mode.ts';
import {languages,localeTags} from './locale-info.ts';
import type {Language} from './locale-info.ts';
import {localizedDate} from './locale-dates.ts';
export {languages,languageOrder,callingCodes,localeTags} from './locale-info.ts';
export type {Language} from './locale-info.ts';
// DEMO ONLY. Language is a browser preference, separate from account and artwork data.
export const LANGUAGE_KEY='schiild.language.v1';
export function validLanguage(value:unknown):value is Language{return typeof value==='string'&&Object.hasOwn(languages,value);}
export function readLanguage():Language{try{const saved=browserStorage().getItem(LANGUAGE_KEY);const query=isWeekPreview?new URLSearchParams(location.search).get('lang'):null;return validLanguage(saved)?saved:validLanguage(query)?query:'ja';}catch{return 'ja';}}
let active:Language='ja';
export function currentLanguage(){return active;}
export function activateLanguage(language:Language){active=language;}
export function saveLanguage(language:Language){browserStorage().setItem(LANGUAGE_KEY,language);if(isWeekPreview){const url=new URL(location.href);url.searchParams.set('lang',language);history.replaceState(history.state,'',url);}activateLanguage(language);}
export const numberLocale=()=>localeTags[active];
export const shortDate=(day:string)=>localizedDate(day,'short',active);
