import { AppError } from '../utils/app-error.js';
// Local single-process quota protection; use a shared store when deployed in multiple instances.
const usage=new Map();
export const featureRateLimit=(kind,max,windowMs=15*60*1000)=>(req,res,next)=>{
 const now=Date.now(); const key=`${req.user.id}:${kind}`;
 if(usage.size>1000) for(const [k,v] of usage) if(v.until<now) usage.delete(k);
 let current=usage.get(key); if(!current || current.until<now) current={count:0,until:now+windowMs};
 current.count++; usage.set(key,current);
 return current.count>max?next(new AppError(`Too many ${kind} requests. Please try again later.`,429)):next();
};
