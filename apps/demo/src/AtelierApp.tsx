import React,{useEffect,useRef,useState} from 'react';
import {Experience} from '../App';
import HelpDetails from './HelpDetails';
import {WORK_SIZE} from './resolution';
import {CONCEPT_LIMIT} from './concept';
import AtelierConcept from './AtelierConcept';
import {activateLanguage,readLanguage,saveLanguage} from './language';
import type {Language} from './language';
import SharedExperience from './SharedExperience';
import {t} from './copy';
import {partition,random} from './engine';
import {COLLECTION,restore,inviteUrl,parseInvite,addAtelier,removeAtelier,leaveAtelier,reuseLocal} from './ateliers';
import {sharedPreview,sharedRequest,saveSession,clearSession,clearAccountBrowser,SharedError} from './shared-api';
import type {Account} from './shared-api';
import DemoNav from './DemoNav';
import DiscoverPage from './DiscoverPage';
import AtelierVisibility,{VisibilityField} from './AtelierVisibility';
import type {Visibility,DirectoryAtelier} from './shared-api';
import useSwipe from './useSwipe';
import type {Navigation} from './DemoNav';
import GlobalPage from './GlobalPage';
import type {GlobalSelection} from './GlobalPage';
import AccountPage,{SettingsPage} from './AccountPage';
import AuthPage from './AuthPage';
import ArchiveCalendar from './ArchiveCalendar';
import {resetBrowser} from './browser-reset';
import DailyPostsPage from './DailyPostsPage';
import DeleteAccountPage from './DeleteAccountPage';
import {googleLogout} from './GoogleSignIn';
import {preferences,savePreferences} from './preferences';
import type {Preferences} from './preferences';
import type {SharedPreview} from './shared-api';
import type {Collection,Invitation,Atelier} from './ateliers';
import type {State,Work} from './model';

export default function AtelierApp(){
 const [browserReady]=useState(resetBrowser);
 const [visibility,setVisibility]=useState<Visibility>('private');
 const [concept,setConcept]=useState(''),[experienceScreen,setExperienceScreen]=useState('home');
 const [language,setLanguage]=useState(readLanguage);activateLanguage(language);
 useEffect(()=>{document.documentElement.lang=language;},[language]);
 const [collection,setCollection]=useState<Collection|null>(null),[view,setView]=useState('experience'),[name,setName]=useState(''),[capacity,setCapacity]=useState(12),[input,setInput]=useState(''),[invitation,setInvitation]=useState<Invitation|null>(null),[sharing,setSharing]=useState<Atelier|null>(null),[deleting,setDeleting]=useState<string|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const lock=useRef(false),accountSequence=useRef(0);
 const [navigation,setNavigation]=useState<Navigation>({screen:'home',revision:0}),[globalSelection,setGlobalSelection]=useState<GlobalSelection>({day:new Date().toISOString().slice(0,10)}),[account,setAccount]=useState<Account|null>(null),[accountRevision,setAccountRevision]=useState(0),[settings,setSettings]=useState(preferences);
 useEffect(()=>{const removed=()=>finishDeletion();window.addEventListener('schiild:account-deleted',removed);return()=>window.removeEventListener('schiild:account-deleted',removed);},[]);
 useEffect(()=>{const expired=()=>{accountSequence.current++;clearSession();setAccount(null);setAccountRevision(value=>value+1);setCollection(current=>current?{...current,ateliers:current.ateliers.filter(entry=>!entry.online),selected:current.ateliers.find(entry=>!entry.online)?.code??''}:current);setView('auth');};window.addEventListener('schiild:session-expired',expired);return()=>window.removeEventListener('schiild:session-expired',expired);},[]);
 useEffect(()=>{if(!browserReady)return;setCollection(restore());function receive(){const incoming=parseInvite(location.hash);if(incoming){setInvitation(incoming);setInput(incoming.online?incoming.code:location.href);setView('join');}history.replaceState(null,'',location.pathname+location.search);}receive();window.addEventListener('hashchange',receive);return()=>window.removeEventListener('hashchange',receive);},[]);
 useEffect(()=>{if(collection)try{localStorage.setItem(COLLECTION,JSON.stringify(collection));}catch{setMessage(t('error.server.title'));}},[collection]);
 useEffect(()=>{if(view!=='me'||!account)return;const controller=new AbortController();void sharedRequest<{account:Account|null}>('account.me',{},controller.signal).then(value=>setAccount(value.account)).catch(cause=>{if(!controller.signal.aborted)setMessage(cause instanceof Error?cause.message:t('error.server.body'));});return()=>controller.abort();},[view]);
 useEffect(()=>{if(!collection)return;const controller=new AbortController(),request=++accountSequence.current;void sharedRequest<{account:Account|null}>('account.me',{},controller.signal).then(value=>{if(request===accountSequence.current){setAccount(value.account);if(value.account)restoreMembership(value.account);}}).catch(cause=>{if(!controller.signal.aborted&&request===accountSequence.current){if(cause instanceof SharedError&&['session_expired','unauthorized'].includes(cause.code)){clearSession();setAccount(null);setView('auth');}setMessage(cause instanceof Error?cause.message:t('error.server.body'));}});return()=>controller.abort();},[collection?.device]);
 useEffect(()=>{
  if(view!=='join'||!input)return;
  const incoming=parseInvite(input);
  if(incoming&&!incoming.online){setInvitation(incoming);return;}
  const code=(incoming?.code??input.trim()).toUpperCase();
  const departed=collection?.departed?.find(entry=>!entry.online&&entry.code===code);
  if(departed){setInvitation({code:departed.code,name:departed.name,capacity:departed.capacity});return;}
  setInvitation(null);if(!/^[A-Z0-9]{8}$/.test(code))return;
  const controller=new AbortController();
  const timer=setTimeout(()=>{void sharedPreview(code,controller.signal).then(value=>{setInvitation(value);setMessage('');}).catch(error=>{if(!controller.signal.aborted)setMessage(error instanceof Error?error.message:t('demo.shared.unavailable'));});},250);
  return()=>{clearTimeout(timer);controller.abort();};
 },[input,view]);
 const tabSwipe=useSwipe({
  canStart:(target,surface)=>{
   if(!['experience','list','global','empty-archive','discover'].includes(view))return false;
   const screen=surface.querySelector('[data-tab-screen]')?.getAttribute('data-tab-screen');
   if(screen&&!['home','archive'].includes(screen))return false;
   if(target.closest('.global-explorer,.operator,input,textarea,select,a,summary,[contenteditable],[role=slider]'))return false;
   return !target.closest('button')||Boolean(target.closest('.nav,.discover-card'));
  },
  onSwipe:direction=>{
   const screen=document.querySelector('[data-tab-screen]')?.getAttribute('data-tab-screen');
   const current=view==='discover'?3:view==='global'?1:view==='empty-archive'||screen==='archive'&&view==='experience'?2:0,next=current+direction;
   if(next===0)visit('home');else if(next===1)showGlobal(new Date().toISOString().slice(0,10));else if(next===2)visit('archive');else if(next===3)go('discover');
  },
 });
 if(!browserReady)return <main className="app"><p className="error" role="alert">{t('demo.reset.storage')}</p></main>;
 if(!collection)return <div className="loading">{t('common.loading')}</div>;
 const active=collection.ateliers.find(a=>a.code===collection.selected);
 function change(state:State){
  if(!collection)return;
  const next={...collection,ateliers:collection.ateliers.map(a=>a.code===collection.selected?{...a,state}:a)};
  localStorage.setItem(COLLECTION,JSON.stringify(next));setCollection(next);
 }
 function reuseLocalPosts(day:string,photo:string,codes:string[]){
  const next=reuseLocal(collection!,day,photo,codes);
  try{localStorage.setItem(COLLECTION,JSON.stringify(next.collection));setCollection(next.collection);return next.results;}
  catch{return next.results.map(result=>({...result,done:false,error:'unavailable'}));}
 }
 function go(next:string){setMessage('');setView(['me','settings','delete-account'].includes(next)&&!account?'auth':next);window.scrollTo(0,0);}
 async function openAccount(){const request=++accountSequence.current;go('account-check');try{const value=await sharedRequest<{account:Account|null}>('account.me');if(request!==accountSequence.current)return;setAccount(value.account);setView(previous=>previous==='account-check'?(value.account?'me':'auth'):previous);}catch(cause){if(request===accountSequence.current){setAccount(null);setView('auth');setMessage(cause instanceof Error?cause.message:t('error.server.body'));}}}
 function visit(screen:'home'|'archive',openDay?:string){setNavigation(previous=>({screen,openDay,revision:previous.revision+1}));go(active?'experience':screen==='archive'?'empty-archive':'list');}
 function showGlobal(day:string,sample?:Work){setGlobalSelection({day,sample});go('global');}
 function restoreMembership(profile:Account){setCollection(current=>{
  if(!current)return current;let next={...current,ateliers:current.ateliers.filter(entry=>!entry.online)};
  for(const room of profile.ateliers)next=addAtelier(next,{code:room.code,name:room.name,capacity:room.capacity,online:true},room.canGenerate);
  if(profile.ateliers.some(room=>room.code===current.selected))next.selected=current.selected;
  return next;
 });}
 async function authenticate(register:boolean,username:string,password:string,displayName:string){
  accountSequence.current++;const result=await sharedRequest<{token:string;account:Account}>(register?'account.register':'account.login',{username,password,name:displayName});saveSession(result.token);setAccount(result.account);restoreMembership(result.account);setAccountRevision(value=>value+1);setMessage('');setView('me');
 }
 async function authenticateGoogle(idToken:string){
  accountSequence.current++;const result=await sharedRequest<{token:string;account:Account}>('account.google',{idToken});saveSession(result.token);setAccount(result.account);restoreMembership(result.account);setAccountRevision(value=>value+1);setMessage('');setView('me');
 }
 async function updateName(name:string){const result=await sharedRequest<{account:Account}>('account.update',{name});setAccount(result.account);}
 function changeLanguage(value:Language){try{saveLanguage(value);setLanguage(value);setMessage('');}catch{setMessage(t('error.server.title'));}}
 function updateSettings(value:Preferences){try{savePreferences(value);setSettings(value);}catch{setMessage(t('error.server.title'));}}
 async function logout(){accountSequence.current++;await sharedRequest('account.logout');clearSession();googleLogout();setAccount(null);setAccountRevision(value=>value+1);setCollection(current=>current?{...current,ateliers:current.ateliers.filter(entry=>!entry.online),selected:current.ateliers.find(entry=>!entry.online)?.code??''}:current);setView('auth');}
 function finishDeletion(){accountSequence.current++;const cleared=clearAccountBrowser();resetBrowser();googleLogout();setAccount(null);setAccountRevision(value=>value+1);setSettings({name:'',reduceMotion:false});setCollection(restore());setNavigation(previous=>({screen:'home',revision:previous.revision+1}));setSharing(null);setInvitation(null);setView('auth');setMessage(t(cleared?'demo.delete.done':'demo.delete.local_failed'));window.scrollTo(0,0);}
 async function deleteAccount(confirmUsername:string,password:string){accountSequence.current++;await sharedRequest<{done:boolean}>('account.delete',{confirmUsername,password});finishDeletion();}
 async function operation(task:()=>Promise<void>){if(lock.current)return;lock.current=true;setBusy(true);setMessage('');try{await task();}catch(error){setMessage(error instanceof Error?error.message:t('demo.shared.unavailable'));}finally{lock.current=false;setBusy(false);}}
 async function create(source?:Atelier){
  if(!source&&!name.trim())return;
  await operation(async()=>{
   const room=await sharedRequest('create',{name:source?.name??name.trim(),capacity:source?.capacity??capacity,concept:source?source.concept??'':concept,visibility:source?'private':visibility});
   const next=addAtelier(collection!,{code:room.code,name:room.name,capacity:room.capacity,online:true},true);
   setCollection(next);setSharing(next.ateliers.find(a=>a.code===room.code)!);go('share');
  });
 }
 function chooseDiscovered(room:DirectoryAtelier){if(collection?.ateliers.some(entry=>entry.code===room.code)){setCollection({...collection,selected:room.code});setNavigation(previous=>({screen:'home',revision:previous.revision+1}));go('experience');}else{setInput(room.code);setInvitation(null);go('join');}}
 function lookup(value:string){setInput(value);setMessage('');setInvitation(null);}
 async function leave(entry:Atelier){
  await operation(async()=>{
   accountSequence.current++;
   if(entry.online)await sharedRequest<{done:boolean}>('leave',{code:entry.code});
   setCollection(current=>current?leaveAtelier(current,entry.code):current);
   setAccount(current=>current?{...current,ateliers:current.ateliers.filter(room=>room.code!==entry.code)}:current);
   setNavigation(previous=>({screen:'home',revision:previous.revision+1}));setSharing(null);go('list');
  });
 }
 async function join(){
  if(!invitation){setMessage(t('join.error.not_found'));return;}
  if(collection!.ateliers.some(a=>a.code===invitation.code)){setMessage(t('join.error.already'));return;}
  await operation(async()=>{
   let target=invitation;
   if(target.online){const room=await sharedRequest('join',{code:target.code});target={code:room.code,name:room.name,capacity:room.capacity,online:true};}
   setCollection(addAtelier(collection!,target,false));setInvitation(null);setNavigation(previous=>({screen:'home',revision:previous.revision+1}));go('experience');
  });
 }
 async function share(copy:boolean){if(!sharing)return;const url=inviteUrl(sharing);try{if(!copy&&navigator.share)await navigator.share({title:sharing.name,url});else{await navigator.clipboard.writeText(copy?sharing.code:url);setMessage(t('common.done'));}}catch(error){if(!(error instanceof DOMException&&error.name==='AbortError'))setMessage(t('error.server.title'));}}
 const preview=partition(capacity,random(414));
 const confirm=collection.ateliers.find(a=>a.code===deleting&&a.creator===collection.device&&!a.online);
 return <div className={settings.reduceMotion?'demo-shell motion-reduced':'demo-shell'} data-language={language} data-swipe-scope="tabs" {...tabSwipe}>
 {view==='experience'&&active?(active.online?<SharedExperience key={active.code+accountRevision} entry={active} navigation={navigation} onScreenChange={setExperienceScreen} onManage={()=>go('list')} onAccount={()=>void openAccount()} onPosts={()=>go('posts')} onGlobal={day=>showGlobal(day)} onShare={()=>{setSharing(active);go('share');}}/>:<Experience key={active.code} entry={active} navigation={navigation} onScreenChange={setExperienceScreen} onChange={change} onManage={()=>go('list')} onAccount={()=>void openAccount()} onPosts={()=>go('posts')} onGlobal={(day,sample)=>showGlobal(day,sample)}/>):<div className="app atelier-app">
  <header className="header"><button className="brand" aria-label="Schiild" onClick={()=>void openAccount()}><span className="brand-symbol"><i/><i/><i/></span>Schiild</button><button className="text-button" disabled={busy} onClick={()=>visit('home')}>{t('common.back')}</button></header>
  {message&&<p className="shared-error" role="status">{message}</p>}
  {view==='discover'&&<DiscoverPage joined={collection.ateliers.map(entry=>entry.code)} onCode={code=>{setInput(code);setInvitation(null);go('join');}} onChoose={chooseDiscovered}/>}
  {view==='posts'&&<DailyPostsPage collection={collection} onLocalReuse={reuseLocalPosts} onRefresh={()=>setAccountRevision(value=>value+1)} onBack={()=>visit('home')}/>}
  {view==='delete-account'&&account&&<DeleteAccountPage account={account} onBack={()=>go('settings')} onDelete={deleteAccount}/>}
  {view==='global'&&<GlobalPage selection={globalSelection} revision={accountRevision}/>}
  {view==='auth'&&<AuthPage language={language} onLanguage={changeLanguage} onAuthenticate={authenticate} onGoogle={authenticateGoogle}/>}{view==='account-check'&&<p>{t('common.loading')}</p>}{view==='empty-archive'&&<ArchiveCalendar items={[]} currentDay={new Date().toISOString().slice(0,10)} atelier={t('archive.title')} onOpen={()=>{}} onGlobal={item=>showGlobal(item.day)}/>}
  {view==='me'&&account&&<AccountPage key={account.username} account={account} collection={collection} onPosts={()=>go('posts')} onGoogle={authenticateGoogle} onName={updateName} onArchive={()=>visit('archive')} onSettings={()=>go('settings')} onCustody={(code,day)=>{setCollection({...collection,selected:code});setNavigation(previous=>({screen:'home',openDay:day,revision:previous.revision+1}));go('experience');}}/>}
  {view==='settings'&&account&&<SettingsPage language={language} onLanguage={changeLanguage} value={settings} onChange={updateSettings} account={account} onAccount={()=>void openAccount()} onLogout={logout} onDelete={()=>go('delete-account')}/>}
  {(view==='list'||view==='experience')&&<section><h1>{t('home.title')}</h1><div className="atelier-list">{collection.ateliers.map(a=><div className="atelier-row" key={a.code} data-selected={a.code===collection.selected} data-code={a.code}><button className="atelier-select" disabled={busy} onClick={()=>{setCollection({...collection,selected:a.code});setNavigation(previous=>({screen:'home',revision:previous.revision+1}));go('experience');}}><strong>{a.name}</strong><span className="mono">{a.online?t('create.capacity_label'):t('demo.shared.local')} {a.capacity}</span></button><div className="atelier-actions"><button disabled={busy} onClick={()=>{if(a.online){setSharing(a);go('share');}else void create(a);}}>{t('created.share')}</button><button disabled={busy} onClick={()=>void leave(a)}>{t('demo.atelier.leave')}</button>{a.creator===collection.device&&!a.online&&<button onClick={()=>setDeleting(a.code)}>{t('demo.atelier.delete')}</button>}</div></div>)}</div>{!collection.ateliers.length&&<p>{t('empty.atelier.body')}</p>}<button className="button" disabled={busy} onClick={()=>{setName('');setConcept('');setVisibility('private');setCapacity(12);go('create');}}>{t('create.title')}</button><button className="button secondary" disabled={busy} onClick={()=>{setInvitation(null);setInput('');go('join');}}>{t('join.title')}</button>{collection.ateliers.length>0&&<HelpDetails><p>{t('demo.atelier.leave_note')}</p><p>{t('demo.atelier.leave_creator')}</p><p>{t('demo.atelier.leave_slots')}</p></HelpDetails>}</section>}
  {view==='create'&&<section><h1>{t('create.title')}</h1><label className="field">{t('create.name_label')}<input maxLength={40} value={name} placeholder={t('create.name_ph')} onChange={e=>setName(e.target.value)}/></label><label className="field">{t('demo.concept.label')}<input maxLength={CONCEPT_LIMIT} value={concept} placeholder={t('demo.concept.default')} onChange={event=>setConcept(event.target.value)}/></label><VisibilityField value={visibility} disabled={busy} onChange={setVisibility}/><p className="wall-label">{t('create.capacity_label')}</p><div className="capacities">{[2,5,12,20].map(n=><button key={n} aria-pressed={capacity===n} onClick={()=>setCapacity(n)}>{n}</button>)}</div><div className="artboard capacity-preview">{preview.map(r=><div key={r.slot} style={{position:'absolute',left:`${r.x/128*100}%`,top:`${r.y/128*100}%`,width:`${r.w/128*100}%`,height:`${r.h/128*100}%`,border:'1px solid var(--strong)'}}/>)}</div><p className="mono">{t('create.capacity_avg',{px:Math.round(WORK_SIZE*WORK_SIZE/capacity)})}</p><p className="shared-note">{t('create.fixed.title')}</p><button className="button" disabled={!name.trim()||busy} onClick={()=>void create()}>{t(busy?'common.loading':'create.submit')}</button><HelpDetails><p>{t('create.capacity_explain',{n:capacity})}</p><p>{t('create.fixed.body')}</p></HelpDetails></section>}
  {view==='share'&&sharing&&<section><h1>{sharing.name}</h1>{sharing.online&&<AtelierVisibility code={sharing.code}/>}<div className="invite-code"><span>{t('created.code_label')}</span><strong>{sharing.code}</strong></div><textarea aria-label={t('created.share')} readOnly value={inviteUrl(sharing)}/><button className="button" onClick={()=>void share(false)}>{t('created.share')}</button><button className="button secondary" onClick={()=>void share(true)}>{t('created.copy')}</button></section>}
  {view==='join'&&<section><h1>{t('join.title')}</h1><label className="field">{t('created.code_label')}<input placeholder={t('join.code_ph')} value={input} onChange={e=>lookup(e.target.value)} autoCapitalize="characters" spellCheck={false}/></label>{invitation?.name&&<div className="join-preview"><h2>{invitation.name}</h2><AtelierConcept concept={invitation.concept}/><p>{t('join.preview.stats',{cap:invitation.capacity,n:(invitation as SharedPreview).members??1,total:(invitation as SharedPreview).total??0})}</p></div>}<p>{t(invitation&&!invitation.online?'join.tomorrow':'demo.shared.join_now')}</p><button className="button" disabled={busy} onClick={()=>void join()}>{t(busy?'common.loading':'join.submit')}</button></section>}
 </div>}
 {confirm&&<div className="modal-shade"><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="delete-atelier-title"><h2 id="delete-atelier-title">{t('demo.atelier.delete')}</h2><p>{t('demo.atelier.delete_body',{name:confirm.name})}</p><button className="button" onClick={()=>{setCollection(removeAtelier(collection,confirm.code));setDeleting(null);setSharing(null);}}>{t('delete.confirm')}</button><button className="button secondary" onClick={()=>setDeleting(null)}>{t('delete.cancel')}</button></section></div>}
 <DemoNav active={view==='discover'||view==='join'?'discover':view==='global'?'global':view==='empty-archive'?'archive':view==='list'?'home':view==='experience'?(experienceScreen==='home'||experienceScreen==='archive'?experienceScreen:navigation.screen):''} onHome={()=>visit('home')} onGlobal={()=>showGlobal(new Date().toISOString().slice(0,10))} onArchive={()=>visit('archive')} onDiscover={()=>go('discover')}/>
 </div>;
}
