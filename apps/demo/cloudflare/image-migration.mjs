// DEMO ONLY. Disabled (404) unless a short-lived migration secret is installed.
import {timingSafeEqual} from 'node:crypto';
export async function imageMigration(request,env){
 const secret=env.IMAGE_MIGRATION_TOKEN,supplied=request.headers.get('Authorization')?.replace(/^Bearer /,'');
 if(!/^[a-f0-9]{64}$/.test(secret??'')||!/^[a-f0-9]{64}$/.test(supplied??'')||!timingSafeEqual(Buffer.from(supplied),Buffer.from(secret)))return new Response('Not found',{status:404});
 const name=new URL(request.url).searchParams.get('name');
 if(!/^[a-f0-9]{64}\.image$/.test(name??''))return new Response('Invalid image',{status:400});
 const directory=env.ATELIERS.get(env.ATELIERS.idFromName('shared-demo-v1'));
 try{
  if(request.method==='GET'){const result=await directory.imageInfo(name);return Response.json(result??{error:'not_found'},{status:result?200:404,headers:{'Cache-Control':'no-store'}});}
  if(request.method!=='POST')return new Response('Method not allowed',{status:405});
  const expected=request.headers.get('X-Image-SHA256');if(!/^[a-f0-9]{64}$/.test(expected??''))return new Response('Invalid digest',{status:400});
  if(Number(request.headers.get('Content-Length'))>3000000)return new Response('Too large',{status:413});
  const reader=request.body?.getReader(),parts=[];let size=0;if(!reader)return new Response('Missing image',{status:400});
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>3000000){await reader.cancel();return new Response('Too large',{status:413});}parts.push(Buffer.from(value));}
  return Response.json(await directory.importImage(name,Buffer.concat(parts),expected),{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'image_rejected'},{status:409,headers:{'Cache-Control':'no-store'}});}
}
