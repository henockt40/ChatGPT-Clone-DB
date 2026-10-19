import {wrap,reply} from '../../helpers.js';
import * as service from '../service/research.service.js';
export const listReports=wrap(async(req,res)=>reply(res,await service.listReports(req.user.id)));
export const getReport=wrap(async(req,res)=>reply(res,await service.getReport(req.user.id,req.reportId)));
export const startResearch=wrap(async(req,res)=>reply(res,await service.startResearch(req.user.id,req.researchTopic),202));
export const deleteReport=wrap(async(req,res)=>{await service.deleteReport(req.user.id,req.reportId);res.status(204).end();});
