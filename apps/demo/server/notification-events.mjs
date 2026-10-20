// DEMO ONLY. Durable outbox events derived from a successful room CAS write.
import {createHash} from 'node:crypto';
export const pushDigest=value=>createHash('sha256').update(value).digest('hex');
export const EVENT_TTL=86400000;
export function roomNotificationEvents(previous,next,now=Date.now()){
 if(!previous)return [];const events=[];
 for(const [day,record] of Object.entries(next.days)){
  const old=previous.days[day],members=record.members??next.members;
  const add=(kind,suffix,actor)=>{const recipients=[...new Set(next.members.filter(member=>member&&member!==actor))];if(!recipients.length)return;const eventId=pushDigest(`${kind}/${next.code}/${day}/${suffix}`);events.push({key:`push-events/${eventId}`,data:{eventId,kind,code:next.code,day,recipients,createdAt:now,expiresAt:now+EVENT_TTL}});};
  for(const [slot,photo] of Object.entries(record.posts??{}))if(photo&&!old?.posts?.[slot])add('post',slot,members[Number(slot)]);
  if(record.status==='ready'&&old?.status!=='ready')add('atelierReady','ready',null);
 }
 return events;
}
