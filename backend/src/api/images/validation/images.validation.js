import { textField,numericId } from '../../helpers.js';
export function validateImagePrompt(req,_res,next){try{req.imagePrompt=textField(req.body?.prompt,'Image description',1000);next();}catch(e){next(e)}}
export function validateImageId(req,_res,next){try{req.imageId=numericId(req.params.id);next();}catch(e){next(e)}}
