import React from 'react';
import {Icon} from '../App';
import {t} from './copy';
export type Navigation={screen:'home'|'archive';revision:number;openDay?:string};

export default function DemoNav({active,onHome,onGlobal,onArchive,onDiscover}:{active:string;onHome:()=>void;onGlobal:()=>void;onArchive:()=>void;onDiscover:()=>void}){
 return <nav className="nav nav-four" aria-label={t('home.title')}>
  <button aria-current={active==='home'?'page':undefined} className={active==='home'?'active':''} onClick={onHome}><Icon kind="grid"/><span>{t('home.title')}</span></button>
  <button aria-current={active==='global'?'page':undefined} className={active==='global'?'active':''} onClick={onGlobal}><Icon kind="global"/><span>{t('global.label')}</span></button>
  <button aria-current={active==='archive'?'page':undefined} className={active==='archive'?'active':''} onClick={onArchive}><Icon kind="archive"/><span>{t('archive.title')}</span></button>
  <button aria-current={active==='discover'?'page':undefined} className={active==='discover'?'active':''} onClick={onDiscover}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/></svg><span>{t('demo.discover.title')}</span></button>
 </nav>;
}
