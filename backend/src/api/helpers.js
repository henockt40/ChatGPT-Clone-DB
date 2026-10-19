import { AppError } from '../utils/app-error.js';
export const wrap = fn => (req,res,next) => Promise.resolve().then(()=>fn(req,res)).catch(next);
export const reply = (res,data,status=200) => res.status(status).json({ success:true, data });
export function textField(value,label,max=1000,required=true) {
 if (typeof value !== 'string') { if (!required && value == null) return ''; throw new AppError(`${label} must be text`,400); }
 const s=value.trim();
 if ((required && !s) || s.length>max) throw new AppError(`${label} is required (maximum ${max} characters)`,400);
 return s;
}
export function numericId(value){ const n=Number(value); if(!/^[1-9][0-9]*$/.test(String(value)) || !Number.isSafeInteger(n)) throw new AppError('Invalid ID',400); return n; }
