import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import db from '../../../../db/db.config.js';
import { generateImage } from '../../../services/ai.service.js';
import { AppError } from '../../../utils/app-error.js';
// Stored under backend/uploads/images; keep a persistent volume for cloud deployment.
const imagesDir=path.resolve('uploads/images');
const publicRow=row=>({id:Number(row.id),prompt:row.prompt,created_at:row.created_at,url:`/api/images/${row.id}/file`});
export async function listImages(userId){
 const [rows]=await db.execute('SELECT id,prompt,created_at FROM images WHERE user_id=? ORDER BY id DESC LIMIT 100',[userId]);
 return rows.map(publicRow);
}
export async function createImage(userId,prompt){
 const {buffer,mimeType,extension}=await generateImage(prompt);
 const allowed={ 'image/png':'png','image/jpeg':'jpg','image/webp':'webp' };
 if (!allowed[mimeType] || buffer.length<100 || buffer.length>15*1024*1024) throw new AppError('Image type or size is unsupported',502);
 const fileName=`${crypto.randomUUID()}.${allowed[mimeType]}`;
 await fs.mkdir(imagesDir,{recursive:true});
 const filePath=path.join(imagesDir,fileName);
 await fs.writeFile(filePath,buffer,{flag:'wx'});
 try{
  const [result]=await db.execute('INSERT INTO images (user_id,prompt,file_name,mime_type) VALUES (?,?,?,?)',[userId,prompt,fileName,mimeType]);
  return {id:Number(result.insertId),prompt,url:`/api/images/${result.insertId}/file`,created_at:new Date().toISOString()};
 }catch(error){await fs.unlink(filePath).catch(()=>{});throw error;}
}
async function ownedFile(userId,id){
 const [rows]=await db.execute('SELECT id,file_name,mime_type FROM images WHERE id=? AND user_id=? LIMIT 1',[id,userId]);
 if(!rows.length)throw new AppError('Image not found',404);
 return rows[0];
}
export async function getImage(userId,id){
 const record=await ownedFile(userId,id);
 const filePath=path.join(imagesDir,path.basename(record.file_name));
 try {return {buffer:await fs.readFile(filePath),mimeType:record.mime_type};}
 catch(error){if(error.code==='ENOENT')throw new AppError('The image file is missing from storage',410);throw error;}
}
export async function deleteImage(userId,id){
 const record=await ownedFile(userId,id);
 await db.execute('DELETE FROM images WHERE id=? AND user_id=?',[id,userId]);
 await fs.unlink(path.join(imagesDir,path.basename(record.file_name))).catch(()=>{});
}
