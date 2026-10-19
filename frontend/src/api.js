import axios from 'axios';
import { getAuthToken } from './api/authApi';
const API_BASE=(import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/,'');
export const api=axios.create({baseURL:API_BASE,timeout:180000});
api.interceptors.request.use(config=>{
 const token=getAuthToken();if(token)config.headers.Authorization=`Bearer ${token}`;
 return config;
});
export const errorMessage=e=>e.response?.data?.message || e.message || 'The request failed';
export function downloadText(filename,text){
 const url=URL.createObjectURL(new Blob([text],{type:'text/markdown'}));
 const a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
}
