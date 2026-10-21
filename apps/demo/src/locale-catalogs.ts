// DEMO ONLY. Complete local dictionaries; no translation service at runtime.
import indonesian from './locales/id.ts';
import khmer from './locales/km.ts';
import hindi from './locales/hi.ts';
import type {CopyKey} from './copy';
export const extraCatalogs={'id':indonesian,km:khmer,hi:hindi} satisfies Record<'id'|'km'|'hi',Record<CopyKey,string>>;
export function isExtraLanguage(value:string):value is keyof typeof extraCatalogs{return Object.hasOwn(extraCatalogs,value);}
