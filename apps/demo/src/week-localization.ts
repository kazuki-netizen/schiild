// DEMO ONLY. Localize fictional fixture labels, never real account data or identifiers.
import type {Language} from './language';
import {extraWeekNames} from './extra-week-names.ts';

export type Names={given:string[];family:string[];rooms:string[];places:string[];concepts:string[]};
const words=(text:string)=>text.split('|');
const catalog:Record<Language,Names>={
 ...extraWeekNames,
 ja:{
  given:words('葵|陽菜|結衣|陸|美咲|蓮|さくら|湊|結菜|悠真|杏|大翔|七海|颯太|彩花|樹|美月|陽太|花|直樹|優奈|健太|愛|翔太|遥|大輝|凛|拓海|琴音|駿|真央|和也|莉子|亮|桃子|翼|紗季|智也|明日香|祐介|香織|達也|千尋|聡|恵|誠|沙織|浩太|奈々|悠斗'),
  family:words('佐藤|鈴木|高橋|田中|伊藤|渡辺|山本|中村|小林|加藤|吉田|山田|佐々木|山口|松本|井上|木村|林|清水|斎藤'),
  rooms:words('日々のかけら|窓際のひととき|いつもの散歩道|小さな机|朝の余白|遠くの友だち|週末のよりみち|帰りみち|緑のある日|いつもの仲間'),
  places:words('桜通り|川沿い|坂の上|海辺|公園前|森のそば|駅の向こう|旧市街|丘の上|湖のほとり|南の街|北の街|花の小道|中庭|港町|並木道|橋のたもと|山のふもと|商店街'),
  concepts:words('今日見つけた光|外で見つけたもの|手元の風景|今日見つけた色'),
 },
 en:{
  given:words('Alex|Emma|Oliver|Amelia|James|Sophie|Jack|Olivia|Harry|Lucy|Charlie|Grace|Thomas|Chloe|George|Lily|William|Alice|Henry|Ella|Noah|Oscar|Jacob|Joshua|Ethan|Archie|Max|Leo|Benjamin|Isaac|Samuel|Joseph|Daniel|Edward|Freddie|Alfie|Arthur|Theodore|Mia|Isla|Isabella|Charlotte|Emily|Jessica|Ruby|Hannah|Freya|Phoebe|Florence|Daisy'),
  family:words('Smith|Jones|Taylor|Brown|Williams|Wilson|Johnson|Davies|Robinson|Wright|Thompson|Evans|Walker|White|Roberts|Green|Hall|Wood|Clarke|Harris'),
  rooms:words('Everyday Fragments|By the Window|Our Usual Walk|The Little Desk|Slow Mornings|Friends Far Away|Weekend Wanders|The Way Home|A Touch of Green|The Usual Crowd'),
  places:words('Oak Street|Riverside|Hilltop|Seaside|Parkside|Woodland|Station Road|Old Town|Meadow Lane|Lakeside|South End|North End|Rose Lane|The Courtyard|Harbour Street|Maple Avenue|Bridge Street|The Valley|Market Square'),
  concepts:words('Light that caught your eye|Something you found outdoors|A little scene close at hand|A colour you noticed today'),
 },
 ko:{
  given:words('서연|민준|지우|서준|하윤|도윤|지민|예준|수아|시우|서윤|주원|지아|하준|민서|지호|유나|준우|채원|현우|서아|지안|지율|도현|예린|시윤|지유|민재|하린|준서|다은|태윤|예은|건우|소율|우진|수빈|유준|나은|승현|아린|은우|예서|태민|윤서|지훈|가은|동현|다인|재윤'),
  family:words('김|이|박|최|정|강|조|윤|장|임|한|오|서|신|권|황|안|송|전|홍'),
  rooms:words('일상의 조각|창가의 시간|늘 걷는 길|작은 책상|느긋한 아침|멀리 있는 친구들|주말의 산책|집으로 가는 길|초록이 있는 하루|늘 함께하는 우리'),
  places:words('벚꽃길|강변|언덕 위|바닷가|공원 앞|숲 옆|역 너머|옛 동네|들꽃길|호숫가|남쪽 마을|북쪽 마을|장미길|안뜰|항구 마을|가로수길|다리 옆|산 아래|시장 골목'),
  concepts:words('오늘 눈에 들어온 빛|밖에서 발견한 것|손 닿는 곳의 풍경|오늘 발견한 색'),
 },
 fr:{
  given:words('Camille|Louis|Emma|Gabriel|Léa|Arthur|Chloé|Jules|Manon|Hugo|Louise|Raphaël|Alice|Lucas|Inès|Adam|Clara|Paul|Jeanne|Nathan|Juliette|Antoine|Marie|Maxime|Sarah|Baptiste|Lucie|Alexandre|Margaux|Victor|Élise|Valentin|Mathilde|Clément|Zoé|Théo|Charlotte|Émile|Romane|Adrien|Agathe|Mathis|Pauline|Léo|Anaïs|Sacha|Rose|Benjamin|Marion|Simon'),
  family:words('Martin|Bernard|Thomas|Petit|Robert|Richard|Durand|Dubois|Moreau|Laurent|Simon|Michel|Lefebvre|Leroy|Roux|David|Bertrand|Morel|Fournier|Girard'),
  rooms:words('Fragments du quotidien|Près de la fenêtre|Notre promenade|Le petit bureau|Matins tranquilles|Les amis au loin|Détours du week-end|Sur le chemin du retour|Un peu de verdure|La bande habituelle'),
  places:words('Rue des Chênes|Au bord de la rivière|Sur la colline|Au bord de la mer|Près du parc|À la lisière du bois|Rue de la Gare|Le vieux quartier|Chemin des Prés|Au bord du lac|Le quartier sud|Le quartier nord|Rue des Roses|La cour|Le port|Allée des Érables|Rue du Pont|La vallée|Place du Marché'),
  concepts:words('Une lumière qui vous a marqué|Une trouvaille dehors|Un petit coin à portée de main|Une couleur remarquée aujourd’hui'),
 },
 nl:{
  given:words('Emma|Daan|Sophie|Sem|Julia|Luuk|Tess|Finn|Anna|Bram|Eva|Liam|Sara|Milan|Noor|Jesse|Lotte|Lucas|Fleur|Thomas|Maud|Noah|Eline|Sven|Roos|Thijs|Isa|Lars|Sanne|Tim|Nina|Koen|Lieke|Gijs|Saar|Stijn|Mila|Mees|Fenne|Noud|Evi|Willem|Lynn|Teun|Liv|Jasper|Femke|Ruben|Anne|Wout'),
  family:words('de Jong|Jansen|de Vries|van den Berg|van Dijk|Bakker|Janssen|Visser|Smit|Meijer|de Boer|Mulder|de Groot|Bos|Vos|Peters|Hendriks|van Leeuwen|Dekker|Brouwer'),
  rooms:words('Stukjes van elke dag|Bij het raam|Ons vaste rondje|Het kleine bureau|Rustige ochtenden|Vrienden ver weg|Ommetjes in het weekend|Op weg naar huis|Een beetje groen|Onze vaste groep'),
  places:words('Eikenstraat|Aan de rivier|Op de heuvel|Aan zee|Bij het park|Aan de bosrand|Stationsweg|De oude buurt|Weidepad|Aan het meer|De zuidkant|De noordkant|Rozenstraat|De binnenplaats|De haven|Esdoornlaan|Brugstraat|Het dal|Het marktplein'),
  concepts:words('Licht dat je opviel|Iets dat je buiten vond|Een klein tafereel dichtbij|Een kleur die je vandaag zag'),
 },
 es:{
  given:words('Lucía|Hugo|Sofía|Mateo|Martina|Martín|María|Lucas|Julia|Leo|Paula|Daniel|Valeria|Alejandro|Emma|Pablo|Alba|Manuel|Carla|Álvaro|Elena|Javier|Carmen|Diego|Claudia|Adrián|Marta|David|Daniela|Sergio|Ana|Marcos|Sara|Nicolás|Irene|Carlos|Vega|Miguel|Aitana|Jorge|Adriana|Mario|Nora|Iván|Alejandra|Rubén|Inés|Gabriel|Lola|Jaime'),
  family:words('García|Rodríguez|González|Fernández|López|Martínez|Sánchez|Pérez|Gómez|Martín|Jiménez|Ruiz|Hernández|Díaz|Moreno|Muñoz|Álvarez|Romero|Alonso|Gutiérrez'),
  rooms:words('Pedacitos del día a día|Junto a la ventana|Nuestro paseo de siempre|El pequeño escritorio|Mañanas sin prisa|Amigos en la distancia|Paseos de fin de semana|De camino a casa|Un poco de verde|La gente de siempre'),
  places:words('Calle de los Robles|Junto al río|En la colina|Junto al mar|Frente al parque|Junto al bosque|Calle de la Estación|El casco antiguo|Camino del Prado|Junto al lago|El barrio sur|El barrio norte|Calle de las Rosas|El patio|El puerto|Paseo de los Arces|Calle del Puente|El valle|Plaza del Mercado'),
  concepts:words('Una luz que te llamó la atención|Algo que encontraste fuera|Un rincón al alcance de la mano|Un color que viste hoy'),
 },
 it:{
  given:words('Luca|Sofia|Leonardo|Giulia|Francesco|Aurora|Alessandro|Alice|Lorenzo|Ginevra|Mattia|Emma|Andrea|Giorgia|Riccardo|Beatrice|Matteo|Chiara|Tommaso|Anna|Gabriele|Elena|Giuseppe|Francesca|Antonio|Valentina|Davide|Martina|Federico|Alessia|Marco|Sara|Giovanni|Elisa|Pietro|Camilla|Simone|Vittoria|Filippo|Gaia|Nicola|Silvia|Paolo|Arianna|Stefano|Serena|Carlo|Laura|Giorgio|Ilaria'),
  family:words('Rossi|Russo|Ferrari|Esposito|Bianchi|Romano|Colombo|Ricci|Marino|Greco|Bruno|Gallo|Conti|De Luca|Mancini|Costa|Giordano|Rizzo|Lombardi|Moretti'),
  rooms:words('Frammenti di ogni giorno|Vicino alla finestra|La solita passeggiata|La piccola scrivania|Mattine senza fretta|Amici lontani|Giri del fine settimana|Sulla via di casa|Un tocco di verde|Gli amici di sempre'),
  places:words('Via delle Querce|Lungo il fiume|In collina|In riva al mare|Vicino al parco|Al limitare del bosco|Via della Stazione|Il centro storico|Sentiero dei Prati|In riva al lago|Il quartiere sud|Il quartiere nord|Via delle Rose|Il cortile|Il porto|Viale degli Aceri|Via del Ponte|La valle|Piazza del Mercato'),
  concepts:words('Una luce che ti ha colpito|Qualcosa che hai trovato fuori|Un piccolo angolo a portata di mano|Un colore che hai notato oggi'),
 },
};
export function weekPersonName(username:string,language:Language){
 const match=/^example_(\d{4})$/.exec(username),index=match?Number(match[1])-1:-1;
 if(index<0||index>=1000)return undefined;
 const names=catalog[language],given=names.given[index%names.given.length],family=names.family[Math.floor(index/names.given.length)%names.family.length];
 return language==='ja'||language==='ko'?family+given:language==='km'?family+' '+given:given+' '+family;
}
export function weekAtelierName(code:string,language:Language){
 const match=/^WK(\d{6})$/.exec(code),index=match?Number(match[1])-1:-1;
 if(index<0||index>=200)return undefined;
 const names=catalog[language],base=names.rooms[index%10],group=Math.floor(index/10);
 return group===0?base:base+' · '+names.places[group-1];
}
// Clone only presentation values. Slots, usernames, invite codes, coordinates,
// photos and participation stay stable when the language changes.
export function localizeWeekData<T>(value:T,language:Language):T{
 const conceptIndex=(value:string)=>Object.values(catalog).map(names=>names.concepts.indexOf(value)).find(index=>index>=0);
 function visit(value:unknown):unknown{
  if(Array.isArray(value))return value.map(visit);
  if(!value||typeof value!=='object')return value;
  const record=value as Record<string,unknown>,result:Record<string,unknown>={};
  for(const [key,entry] of Object.entries(record)){
   if(key==='name'&&typeof entry==='string')result[key]=(typeof record.username==='string'?weekPersonName(record.username,language):typeof record.code==='string'?weekAtelierName(record.code,language):undefined)??entry;
   else if((key==='concept'||key==='defaultConcept')&&typeof entry==='string')result[key]=catalog[language].concepts[conceptIndex(entry)??-1]??entry;
   else result[key]=visit(entry);
  }
  return result;
 }
 return visit(value) as T;
}
