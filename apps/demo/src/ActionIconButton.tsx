import React from 'react';

export default function ActionIconButton({kind,label,onClick,disabled=false,showLabel=false}:{kind:'open'|'forward';label:string;onClick:()=>void;disabled?:boolean;showLabel?:boolean}){
 return <button type="button" className={`action-icon action-icon-${kind}${showLabel?' action-icon-label':''}`} aria-label={label} title={label} disabled={disabled} onClick={onClick}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind==='open'?<><path d="m3 10 9-7 9 7v11H3Z"/><path d="m3 10 9 6 9-6M3 21l6-7m12 7-6-7"/></>:<path d="m14 4 7 7-7 7v-4H9c-3 0-5 2-6 5 0-8 3-11 11-11Z"/>}</svg>{showLabel&&<span>{label}</span>}</button>;
}
