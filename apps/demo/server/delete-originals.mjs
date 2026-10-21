// DEMO ONLY. Keep rendered shared contributions, then purge their original JPEGs.
import {createHash} from 'node:crypto';
import {ApiError} from './atelier-core.mjs';
export async function prepareOriginalDeletion(store,account,images){
 for(const {data} of await store.listJSON('globals/')){
  const pixel=data.pixels[account.member];if(!pixel)continue;
  const thumbnailKey=`global/${data.day}/${createHash('sha256').update('schiil-thumb-v1/'+pixel.source).digest('hex')}`;
  if(await store.get(thumbnailKey,{type:'arrayBuffer'}))continue;
  let photo=pixel.photoKey?await store.get(pixel.photoKey,{type:'arrayBuffer'}):null;
  if(!photo)for(const {data:room} of await store.listJSON('rooms/')){const key=Object.values(room.days[data.day]?.posts??{}).find(value=>typeof value==='string'&&value.startsWith(`photos/${account.member}/`)&&value.endsWith('/'+pixel.source));if(key){photo=await store.get(key,{type:'arrayBuffer'});if(photo)break;}}
  if(photo){if(!images?.thumbnail)throw new ApiError(503,'unavailable');await store.set(thumbnailKey,await images.thumbnail(photo));}
 }
}
