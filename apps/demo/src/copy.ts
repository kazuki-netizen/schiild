import official from './copy.json';
import {demoCopy} from './demo-copy';
import {translations} from './translations';
import {spanish} from './spanish';
import {italian} from './italian';
import {singularCopy} from './singular-copy';
import {currentLanguage} from './language';
const values={...official,...demoCopy};
export type CopyKey = keyof typeof values;
export function t(key:CopyKey,params:Record<string,string|number>={}){
 const language=currentLanguage(),base=language==='ja'?values[key]:language==='es'?spanish[key]:language==='it'?italian[key]:translations[key][{en:0,ko:1,fr:2,nl:3}[language]],text=(Number(params.n)===1?singularCopy[key]?.[language]:undefined)??base;
 return text.replace(/\{(\w+)\}/g,(_,name)=>String(params[name]??`{${name}}`));
}
