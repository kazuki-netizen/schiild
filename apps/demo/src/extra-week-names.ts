// Fictional display names only. Real account names are never translated.
import type {Names} from './week-localization';
const words=(text:string)=>text.split('|');
export const extraWeekNames={
 'id':{
  given:words('Ayu|Budi|Dewi|Aditya|Putri|Rizky|Siti|Agus|Intan|Dimas|Fitri|Andi|Nadia|Rina|Arif|Sari|Bayu|Rani|Fajar|Maya|Indra|Nina|Yoga|Lestari|Reza|Anisa|Eko|Tiara|Hendra|Wulan|Farhan|Laras|Ilham|Dinda|Deni|Nurul|Ardi|Melati|Galih|Nabila|Rio|Kartika|Wahyu|Citra|Daffa|Salsa|Surya|Amalia|Yusuf|Novi'),
  family:words('Pratama|Saputra|Wibowo|Santoso|Wijaya|Kusuma|Utama|Permana|Nugraha|Setiawan|Hidayat|Ramadhan|Maulana|Anggara|Purnama|Susanto|Kurniawan|Putra|Suryadi|Prasetyo'),
  rooms:words('Kepingan Hari|Di Dekat Jendela|Jalan yang Kita Kenal|Meja Kecil|Pagi yang Tenang|Teman di Kejauhan|Jalan-jalan Akhir Pekan|Perjalanan Pulang|Sedikit Hijau|Teman Sehari-hari'),
  places:words('Jalan Kenanga|Tepi Sungai|Atas Bukit|Tepi Laut|Dekat Taman|Tepi Hutan|Jalan Stasiun|Kota Lama|Jalan Melati|Tepi Danau|Kampung Selatan|Kampung Utara|Jalan Mawar|Halaman Dalam|Pelabuhan|Jalan Angsana|Dekat Jembatan|Kaki Gunung|Alun-alun'),
  concepts:words('Cahaya yang menarik perhatian hari ini|Sesuatu yang ditemukan di luar|Pemandangan kecil di dekatmu|Warna yang kamu lihat hari ini'),
 },
 km:{
  given:words('សុភា|វិចិត្រ|តារា|វណ្ណា|ស្រីពៅ|សុវណ្ណ|សុភាព|រតនា|ស្រីនាង|សុភ័ក្រ|បុប្ផា|សំណាង|ស្រីមុំ|វិសាល|ចន្ទា|សុផល|រស្មី|សុខា|កញ្ញា|វិបុល|ធីតា|មករា|នារី|ឧត្តម|សុគន្ធា|វាសនា|លីណា|រដ្ឋា|ស្រីលក្ខណ៍|បញ្ញា|សុជាតា|សុវណ្ណារ៉ា|ស្រីណែត|សុភារិទ្ធ|សុម៉ាលី|សុវិចិត្រ|លក្ខិណា|សុមេធ|ចរិយា|សុវុទ្ធី|មាលា|សុផាត|វិច្ឆិកា|កុសល|សុគន្ធី|បូរ៉ា|សិរី|ចំរើន|ទេវី|ប៊ុនថា'),
  family:words('សុខ|ចាន់|លី|ស៊ុន|គឹម|ហេង|ជា|សាន|សេង|ហ៊ុន|ម៉ៅ|កែវ|ឡុង|ឈិន|ទូច|អ៊ុក|យិន|នួន|ពៅ|ឃុន'),
  rooms:words('ចំណែកនៃរាល់ថ្ងៃ|ក្បែរបង្អួច|ផ្លូវដើរដែលស្គាល់|តុតូច|ពេលព្រឹកដ៏ស្ងប់ស្ងាត់|មិត្តនៅឆ្ងាយ|ដើរលេងចុងសប្ដាហ៍|ផ្លូវត្រឡប់ផ្ទះ|ពណ៌បៃតងបន្តិច|មិត្តដដែលៗ'),
  places:words('ផ្លូវផ្កា|មាត់ទន្លេ|លើភ្នំ|មាត់សមុទ្រ|ក្បែរសួន|មាត់ព្រៃ|ក្បែរស្ថានីយ|ទីក្រុងចាស់|ផ្លូវវាលស្មៅ|មាត់បឹង|ភូមិខាងត្បូង|ភូមិខាងជើង|ផ្លូវកុលាប|ទីធ្លាខាងក្នុង|កំពង់ផែ|ផ្លូវមានដើមឈើ|ក្បែរស្ពាន|ជើងភ្នំ|ទីផ្សារ'),
  concepts:words('ពន្លឺដែលទាក់ទាញភ្នែកថ្ងៃនេះ|អ្វីដែលបានឃើញនៅខាងក្រៅ|ទិដ្ឋភាពតូចនៅក្បែរខ្លួន|ពណ៌ដែលបានឃើញថ្ងៃនេះ'),
 },
 hi:{
  given:words('आरव|अनन्या|विवान|आध्या|आदित्य|सिया|अर्जुन|काव्या|रोहन|दिया|ईशान|मीरा|कृष्ण|नैना|ध्रुव|आशा|राहुल|ईशा|अमित|नेहा|विकास|पूजा|वरुण|रीमा|निखिल|प्रिया|करण|सान्या|रोहित|रितु|अभय|तन्वी|मोहित|श्रुति|अनिल|दीपिका|सुमित|अवनि|संजय|राधा|राजीव|श्रेया|दीपक|नंदिनी|अंकित|वाणी|हर्ष|अंजलि|समीर|पल्लवी'),
  family:words('शर्मा|वर्मा|गुप्ता|सिंह|कुमार|जोशी|मिश्रा|तिवारी|अग्रवाल|शुक्ला|मेहता|जैन|सक्सेना|चौहान|यादव|चौधरी|कपूर|मल्होत्रा|खन्ना|सिन्हा'),
  rooms:words('रोज़ के टुकड़े|खिड़की के पास|हमारी रोज़ की सैर|छोटी मेज़|सुकून की सुबह|दूर बसे दोस्त|सप्ताहांत की सैर|घर लौटते हुए|थोड़ी सी हरियाली|अपने पुराने दोस्त'),
  places:words('गुलमोहर मार्ग|नदी किनारे|पहाड़ी पर|समुद्र किनारे|पार्क के पास|जंगल के पास|स्टेशन रोड|पुराना शहर|खेतों की पगडंडी|झील किनारे|दक्षिण मोहल्ला|उत्तर मोहल्ला|गुलाब गली|भीतर का आँगन|बंदरगाह|पेड़ों वाली सड़क|पुल के पास|पहाड़ की तलहटी|बाज़ार चौक'),
  concepts:words('आज नज़र आई रोशनी|बाहर मिली कोई चीज़|आसपास का एक छोटा नज़ारा|आज दिखा कोई रंग'),
 },
} satisfies Record<'id'|'km'|'hi',Names>;
