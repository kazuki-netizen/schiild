// DEMO ONLY. Private image bytes share the existing SQLite Durable Object.
// 64 KiB chunks stay below SQLite's per-row limit. Never publish these tables as assets.
import {createHash} from 'node:crypto';
const chunkSize=65536,maxBytes=3000000;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function imageFilename(key){
 if(!/^(photos\/[a-f0-9]{64}\/\d{4}-\d{2}-\d{2}(\/[a-f0-9]{64})?|works\/[A-Z0-9]{8}\/\d{4}-\d{2}-\d{2}|global\/\d{4}-\d{2}-\d{2}\/[a-f0-9]{64})$/.test(key))throw Error('storage_key');
 return digest(key)+'.image';
}
export function sqliteImages(storage){
 storage.sql.exec('CREATE TABLE IF NOT EXISTS image_blobs (name TEXT PRIMARY KEY, byte_length INTEGER NOT NULL, sha256 TEXT NOT NULL)');
 storage.sql.exec('CREATE TABLE IF NOT EXISTS image_chunks (name TEXT NOT NULL, part INTEGER NOT NULL, bytes BLOB NOT NULL, PRIMARY KEY(name,part))');
 storage.sql.exec('CREATE TABLE IF NOT EXISTS photo_members (name TEXT PRIMARY KEY, member TEXT NOT NULL)');
 storage.sql.exec('CREATE INDEX IF NOT EXISTS photo_member_index ON photo_members(member)');
 const info=name=>storage.sql.exec('SELECT byte_length,sha256 FROM image_blobs WHERE name = ?',name).toArray()[0]??null;
 function importImage(name,value,expected,member){
  if(!/^[a-f0-9]{64}\.image$/.test(name))throw Error('storage_key');
  const bytes=Buffer.from(value);if(!bytes.length||bytes.length>maxBytes)throw Error('storage_size');
  const sha256=digest(bytes);if(expected&&expected!==sha256)throw Error('storage_integrity');
  return storage.transactionSync(()=>{
   const previous=info(name);if(previous){if(previous.sha256!==sha256||previous.byte_length!==bytes.length)throw Error('storage_conflict');if(member)storage.sql.exec('INSERT OR IGNORE INTO photo_members (name,member) VALUES (?,?)',name,member);return {modified:false};}
   storage.sql.exec('INSERT INTO image_blobs (name,byte_length,sha256) VALUES (?,?,?)',name,bytes.length,sha256);
   for(let offset=0,part=0;offset<bytes.length;offset+=chunkSize,part++)storage.sql.exec('INSERT INTO image_chunks (name,part,bytes) VALUES (?,?,?)',name,part,bytes.subarray(offset,offset+chunkSize));
   if(member)storage.sql.exec('INSERT OR IGNORE INTO photo_members (name,member) VALUES (?,?)',name,member);
   return {modified:true};
  });
 }
 return {
  info(name){if(!/^[a-f0-9]{64}\.image$/.test(name))throw Error('storage_key');return info(name);},
  importImage,
  deletePhotosSync(keys,member){
   const names=new Set([...keys.map(imageFilename),...storage.sql.exec('SELECT name FROM photo_members WHERE member = ?',member).toArray().map(row=>row.name)]);
   for(const name of names){storage.sql.exec('DELETE FROM image_chunks WHERE name = ?',name);storage.sql.exec('DELETE FROM image_blobs WHERE name = ?',name);storage.sql.exec('DELETE FROM photo_members WHERE name = ?',name);}
  },
  async get(key){
   const name=imageFilename(key),record=info(name);if(!record)return null;
   if(record.byte_length<1||record.byte_length>maxBytes)throw Error('storage_size');
   const rows=storage.sql.exec('SELECT part,bytes FROM image_chunks WHERE name = ? ORDER BY part',name).toArray();
   if(rows.length!==Math.ceil(record.byte_length/chunkSize)||rows.some((row,index)=>row.part!==index))throw Error('storage_integrity');
   const bytes=Buffer.concat(rows.map(row=>Buffer.from(row.bytes)));
   if(bytes.length!==record.byte_length||digest(bytes)!==record.sha256)throw Error('storage_integrity');
   return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  },
  async set(key,value){const name=imageFilename(key),member=key.startsWith('photos/')?key.split('/')[1]:null;if(info(name)){if(member)storage.sql.exec('INSERT OR IGNORE INTO photo_members (name,member) VALUES (?,?)',name,member);return {modified:false};}return importImage(name,value,undefined,member);},
 };
}
