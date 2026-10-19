import { wrap,reply } from '../../helpers.js';
import * as service from '../service/images.service.js';
export const listImages=wrap(async(req,res)=>reply(res,await service.listImages(req.user.id)));
export const createImage=wrap(async(req,res)=>reply(res,await service.createImage(req.user.id,req.imagePrompt),201));
export const downloadImage=wrap(async(req,res)=>{const {buffer,mimeType}=await service.getImage(req.user.id,req.imageId);res.set('Content-Type',mimeType);res.set('Cache-Control','private, no-store');res.send(buffer);});
export const deleteImage=wrap(async(req,res)=>{await service.deleteImage(req.user.id,req.imageId);res.status(204).end();});
