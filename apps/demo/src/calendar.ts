// DEMO ONLY. Calendar cells use the recorded UTC day, independently of device timezone.
export function shiftMonth(month:string,offset:number){const value=new Date(month+'-01T00:00:00Z');value.setUTCMonth(value.getUTCMonth()+offset);return value.toISOString().slice(0,7);}
export function calendarCells(month:string){
 const start=new Date(month+'-01T00:00:00Z'),weekday=start.getUTCDay(),end=new Date(start);end.setUTCMonth(end.getUTCMonth()+1);end.setUTCDate(0);
 const count=Math.max(5,Math.ceil((weekday+end.getUTCDate())/7))*7;
 return Array.from({length:count},(_,n)=>{const value=new Date(start);value.setUTCDate(n-weekday+1);const day=value.toISOString().slice(0,10);return {day,number:value.getUTCDate(),current:day.startsWith(month)};});
}
