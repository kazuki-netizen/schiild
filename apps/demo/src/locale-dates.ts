import {localeTags} from './locale-info.ts';
import type {Language} from './locale-info.ts';
// DEMO ONLY. Khmer date names from Unicode CLDR. Some browsers omit the km Intl locale.
// https://github.com/unicode-org/cldr-json/blob/main/cldr-json/cldr-dates-full/main/km/ca-gregorian.json
const khmerMonths=['មករា','កុម្ភៈ','មីនា','មេសា','ឧសភា','មិថុនា','កក្កដា','សីហា','កញ្ញា','តុលា','វិច្ឆិកា','ធ្នូ'];
const khmerWeekdays=['អាទិត្យ','ចន្ទ','អង្គារ','ពុធ','ព្រហ','សុក្រ','សៅរ៍'];
type DateStyle='short'|'month'|'weekday'|'full'|'notification';
const dateOptions:Record<DateStyle,Intl.DateTimeFormatOptions>={
 short:{month:'numeric',day:'numeric'},month:{year:'numeric',month:'long'},
 weekday:{weekday:'short'},full:{year:'numeric',month:'long',day:'numeric',weekday:'short'},
 notification:{year:'numeric',month:'short',day:'numeric'},
};
export function localizedDate(day:string,style:DateStyle,language:Language){
 const date=new Date(day+'T00:00:00Z');
 if(language==='km'){
  const month=khmerMonths[date.getUTCMonth()],weekday=khmerWeekdays[date.getUTCDay()],year=date.getUTCFullYear(),dateNumber=date.getUTCDate();
  if(style==='short')return `${dateNumber}/${date.getUTCMonth()+1}`;
  if(style==='month')return `${month} ${year}`;
  if(style==='weekday')return weekday;
  return `${style==='full'?weekday+' ':''}${dateNumber} ${month} ${year}`;
 }
 return new Intl.DateTimeFormat(localeTags[language],{...dateOptions[style],timeZone:'UTC'}).format(date);
}
