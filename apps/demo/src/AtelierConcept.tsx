import React from 'react';
import {t} from './copy';
export default function AtelierConcept({concept,onEdit,disabled=false}:{concept?:string;onEdit?:()=>void;disabled?:boolean}){
 return <div className="concept-row"><p className="atelier-concept" data-testid="atelier-concept" aria-label={t('demo.concept.title')}>{concept||t('demo.concept.default')}</p>{onEdit&&<button type="button" className="concept-edit" data-testid="concept-edit" aria-label={t('demo.concept.edit')} title={t('demo.concept.edit')} disabled={disabled} onClick={onEdit}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="m15 4 5 5M4 20l5-1L21 7l-4-4L5 15Z"/></svg></button>}</div>;
}
