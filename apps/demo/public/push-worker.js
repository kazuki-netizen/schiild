// DEMO ONLY. Notification events only; deliberately no fetch handler or app cache.
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
 let data;try{data=event.data.json();}catch{return;}
 if(!data||typeof data.title!=='string'||typeof data.body!=='string')return;
 const url=safeURL(data.url);
 event.waitUntil(self.registration.showNotification(data.title.slice(0,160),{body:data.body.slice(0,500),tag:typeof data.tag==='string'?data.tag.slice(0,100):'schiild',icon:'/app-icons/icon-192.png',badge:'/app-icons/badge-96.png',data:{url},renotify:false}));
});
function safeURL(value){try{const url=new URL(value,self.location.origin);if(url.origin===self.location.origin&&url.pathname==='/'&&['global','atelier'].includes(url.searchParams.get('push'))&&/^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('day')??'')&&(!url.searchParams.has('code')||/^[A-Z0-9]{8}$/.test(url.searchParams.get('code'))))return url.href;}catch{}return self.location.origin+'/';}
self.addEventListener('notificationclick',event=>{event.notification.close();const url=safeURL(event.notification.data?.url);event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const window=windows.find(client=>new URL(client.url).origin===self.location.origin&&!new URL(client.url).pathname.startsWith('/week'));if(window){await window.navigate(url);return window.focus();}return self.clients.openWindow(url);})());});
