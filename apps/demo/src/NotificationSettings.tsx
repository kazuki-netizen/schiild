import React,{useEffect,useState} from 'react';
import {t} from './copy';
import {isWeekPreview} from './preview-mode.ts';
import {sharedRequest} from './shared-api';
import type {Language} from './language';
import {defaultPushPreferences,disablePush,enablePush,needsHomeScreen,pushActive,pushSupported} from './push-client';
import type {PushConfig,PushPreferences} from './push-client';
export default function NotificationSettings({language}:{language:Language}){
 const [config,setConfig]=useState<PushConfig|null>(null),[value,setValue]=useState(defaultPushPreferences),[active,setActive]=useState(false),[busy,setBusy]=useState(true),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 useEffect(()=>{let current=true;setBusy(true);setSaved(false);setError('');if(isWeekPreview){setBusy(false);return;}
  void Promise.all([sharedRequest<PushConfig>('push.config'),pushActive()]).then(([result,enabled])=>{if(current){setConfig(result);setValue(result.preferences);setActive(enabled);}}).catch(()=>{if(current)setError(t('demo.push.failed'));}).finally(()=>{if(current)setBusy(false);});return()=>{current=false;};
 },[language]);
 const supported=pushSupported(),homeScreen=needsHomeScreen(),denied=supported&&Notification.permission==='denied';
 async function update(preferences:PushPreferences){const previous=value;setValue(preferences);setBusy(true);setSaved(false);setError('');try{const result=await sharedRequest<{preferences:PushPreferences}>('push.preferences',{preferences});setValue(result.preferences);setSaved(true);}catch{setValue(previous);setError(t('demo.push.failed'));}finally{setBusy(false);}}
 function toggleDevice(){if(busy)return;setBusy(true);setError('');setSaved(false);
  // Invoke directly in the click handler, before any network awaits.
  const action=active?disablePush():config?.publicKey?enablePush(config.publicKey,language):Promise.reject(Error('push_unavailable'));
  void action.then(()=>{setActive(!active);setSaved(true);}).catch(cause=>setError(t(cause instanceof Error&&cause.message==='push_denied'?'demo.push.denied':'demo.push.failed'))).finally(()=>setBusy(false));
 }
 return <section className="notification-settings" data-testid="notification-settings"><h2>{t('settings.notifications')}</h2><p>{t('demo.settings.notifications')}</p>
 {(['atelierReady','globalReady','post'] as const).map((kind,index)=><label className="setting-toggle" key={kind}><span>{t((['settings.notif.reveal','demo.push.global','demo.push.post'] as const)[index])}</span><input type="checkbox" checked={value[kind]} disabled={busy||isWeekPreview||!config?.enabled} onChange={event=>void update({...value,[kind]:event.target.checked})}/></label>)}
 {isWeekPreview?<p>{t('demo.push.week')}</p>:homeScreen?<p>{t('demo.push.ios')}</p>:!supported?<p>{t('demo.push.unsupported')}</p>:!config?.enabled&&!busy?<p>{t('demo.push.unavailable')}</p>:<>{active&&<p role="status">{t('demo.push.active')}</p>}{denied&&<p>{t('demo.push.denied')}</p>}<button className="button secondary" disabled={busy||!config?.enabled||denied&&!active} onClick={toggleDevice}>{t(active?'demo.push.disable':'demo.push.enable')}</button></>}
 {saved&&<p role="status">{t('demo.push.saved')}</p>}{error&&<p role="alert" className="error">{error}</p>}</section>;
}
