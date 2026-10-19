import { textField,numericId } from '../../helpers.js';
import {AppError} from '../../../utils/app-error.js';
export function validateTopic(req,_res,next){try{req.researchTopic=textField(req.body?.topic,'Research topic',500);if(req.researchTopic.length<3)throw new AppError('Topic is too short',400);next();}catch(e){next(e)}}
export function validateReportId(req,_res,next){try{req.reportId=numericId(req.params.id);next();}catch(e){next(e)}}
