import React from 'react';
import {t} from './copy';
import {languages,languageOrder,validLanguage} from './language';
import type {Language} from './language';
export default function LanguageSelect({value,onChange}:{value:Language;onChange:(language:Language)=>void}){
 return <label className="field language-select">{t('demo.settings.language')}<select value={value} onChange={event=>{if(validLanguage(event.target.value))onChange(event.target.value);}}>{languageOrder.map(code=><option key={code} value={code} lang={code}>{languages[code]}</option>)}</select></label>;
}
