import { wrap, reply } from '../../helpers.js';
import * as service from '../service/apps.service.js';
export const listApps=wrap(async(req,res)=>reply(res,service.listApps()));
export const runApp=wrap(async(req,res)=>reply(res,await service.runApp(req.appDef,req.appInputs)));
