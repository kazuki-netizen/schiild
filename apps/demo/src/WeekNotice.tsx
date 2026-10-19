import React,{useEffect,useState} from 'react';
import {t} from './copy';
import {weekPeople} from './week-preview';
export default function WeekNotice(){
 const [people,setPeople]=useState<{username:string;name:string}[]>([]);
 useEffect(()=>{let mounted=true;void weekPeople().then(value=>{if(mounted)setPeople(value);}).catch(()=>{});return()=>{mounted=false;};},[]);
 const selected=new URLSearchParams(location.search).get('person')??people[0]?.username??'';
 return <aside className="week-notice"><div><span>{t('demo.week.label')}</span><small>{t('demo.week.context')}</small><label>{t('demo.week.person')}<select aria-label={t('demo.week.person')} value={selected} onChange={event=>{location.assign('/week/?person='+encodeURIComponent(event.target.value));}}>{people.map(person=><option key={person.username} value={person.username}>{person.name}</option>)}</select></label></div><a href="/">{t('demo.week.exit')}</a></aside>;
}
