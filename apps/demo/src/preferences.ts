import {browserStorage} from './preview-mode.ts';
export const PREFERENCES='schiild.preferences.v2';
export type Preferences={name:string;reduceMotion:boolean};
export function preferences():Preferences{try{const value=JSON.parse(browserStorage().getItem(PREFERENCES)??'null');return {name:typeof value?.name==='string'?value.name:'',reduceMotion:value?.reduceMotion===true};}catch{return {name:'',reduceMotion:false};}}
export function savePreferences(value:Preferences){browserStorage().setItem(PREFERENCES,JSON.stringify(value));}
