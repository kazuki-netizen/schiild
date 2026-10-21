// DEMO ONLY. Display order uses international calling codes; English is US (+1).
export const languages={en:'English',nl:'Nederlands',fr:'Français',es:'Español',it:'Italiano','id':'Bahasa Indonesia',ja:'日本語',ko:'한국어',hi:'हिन्दी',km:'ភាសាខ្មែរ'} as const;
export type Language=keyof typeof languages;
export const callingCodes:Record<Language,number>={en:1,nl:31,fr:33,es:34,it:39,'id':62,ja:81,ko:82,hi:91,km:855};
export const localeTags:Record<Language,string>={en:'en-US',nl:'nl-NL',fr:'fr-FR',es:'es-ES',it:'it-IT','id':'id-ID',ja:'ja-JP',ko:'ko-KR',hi:'hi-IN',km:'km-KH'};
export const languageOrder=(Object.keys(languages) as Language[]).sort((a,b)=>callingCodes[a]-callingCodes[b]);
