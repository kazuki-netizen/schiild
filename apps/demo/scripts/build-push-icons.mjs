// Reuses the three-square logo as code-native PWA assets, without photographs.
import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../public/app-icons/',import.meta.url);await mkdir(root,{recursive:true});
for(const size of [192,512,96]){
 const badge=size===96,svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">${badge?'':'<rect width="100" height="100" fill="white"/>'}<g fill="${badge?'white':'#df5c35'}"><rect x="18" y="18" width="26.67" height="32"/><rect x="50" y="18" width="32" height="32"/><rect x="18" y="55.33" width="64" height="26.67"/></g></svg>`;
 await sharp(Buffer.from(svg)).png().toFile(fileURLToPath(new URL(badge?'badge-96.png':`icon-${size}.png`,root)));
}
