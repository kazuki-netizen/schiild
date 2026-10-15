import React from 'react';

export default function ActionIconButton({kind,label,onClick,disabled=false,showLabel=false}:{kind:'open'|'share';label:string;onClick:()=>void;disabled?:boolean;showLabel?:boolean}){
 return <button type="button" className={`action-icon action-icon-${kind}${showLabel?' action-icon-label':''}`} aria-label={label} title={label} disabled={disabled} onClick={onClick}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind==='open'?<><path d="m3 10 9-7 9 7v11H3Z"/><path d="m3 10 9 6 9-6M3 21l6-7m12 7-6-7"/></>:<><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></>}</svg>{showLabel&&<span>{label}</span>}</button>;
}
