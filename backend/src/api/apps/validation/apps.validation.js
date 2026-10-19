import { APPS } from '../apps.catalog.js';
import { textField } from '../../helpers.js';
import { AppError } from '../../../utils/app-error.js';
export function validateAppRun(req,_res,next){
 try {
  const app=APPS.find(x=>x.id===req.params.appId);
  if(!app)throw new AppError('App not found',404);
  if(!req.body?.inputs || typeof req.body.inputs!=='object' || Array.isArray(req.body.inputs))throw new AppError('inputs is required',400);
  const inputs={};
  for(const field of app.fields){
    const value=textField(req.body.inputs[field.name],field.label,field.type==='textarea'?12000:500,field.required);
    if(field.type==='select' && !field.options.includes(value))throw new AppError(`Invalid option for ${field.label}`,400);
    inputs[field.name]=value;
  }
  req.appDef=app;req.appInputs=inputs;next();
 }catch(e){next(e)}
}
