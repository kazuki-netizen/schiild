// DEMO ONLY. Calendar cells use the recorded UTC day, independently of device timezone.
export const calendarLimits={first:'0001-01',last:'9999-12'};
export function shiftMonth(month:string,offset:number){
 // Browsing is independent of recorded works. Keep ISO years within four digits.
 const position=Math.max(12,Math.min(9999*12+11,Number(month.slice(0,4))*12+Number(month.slice(5,7))-1+offset));
 return String(Math.floor(position/12)).padStart(4,'0')+'-'+String(position%12+1).padStart(2,'0');
}
export function calendarCells(month:string){
 const start=new Date(month+'-01T00:00:00Z'),weekday=start.getUTCDay(),end=new Date(start);end.setUTCMonth(end.getUTCMonth()+1);end.setUTCDate(0);
 const count=Math.max(5,Math.ceil((weekday+end.getUTCDate())/7))*7;
 return Array.from({length:count},(_,n)=>{const value=new Date(start);value.setUTCDate(n-weekday+1);const day=value.toISOString().split('T')[0];return {day,number:value.getUTCDate(),current:day.startsWith(month)};});
}
