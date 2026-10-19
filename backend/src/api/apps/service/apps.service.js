import { APPS, publicCatalog } from '../apps.catalog.js';
import { generateText } from '../../../services/ai.service.js';
export const listApps=()=>publicCatalog();
export async function runApp(app,inputs){
 const prompt=app.prompt(inputs);
 const {text}=await generateText({contents:prompt,systemInstruction:app.system});
 return {appId:app.id,appName:app.name,prompt,result:text};
}
