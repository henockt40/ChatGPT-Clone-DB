import { useImperativeHandle, useRef, useState } from 'react';
import { ArrowUp, Plus, Mic, X, Paperclip } from 'lucide-react';
import styles from './ChatInput.module.css';
const MAX=65535;
export default function ChatInput({handleSendMessage,isLoading,inputRef,onFeature}) {
  const [value,setValue]=useState('');
  const [showPlus,setShowPlus]=useState(false);
  const [listening,setListening]=useState(false);
  const textRef=useRef(null);
  useImperativeHandle(inputRef,()=>({focus(){textRef.current?.focus();},setValue(v){setValue(v);textRef.current?.focus();}}),[]);
  const resize=()=>{if(textRef.current){textRef.current.style.height='auto';textRef.current.style.height=`${Math.min(textRef.current.scrollHeight,184)}px`;}};
  const change=e=>{setValue(e.target.value);requestAnimationFrame(resize);};
  const submit=async e=>{
    e.preventDefault();
    if(!value.trim()||isLoading||value.length>MAX)return;
    const success=await handleSendMessage(value);
    if(success){setValue('');if(textRef.current)textRef.current.style.height='auto';}
    textRef.current?.focus();
  };
  const startVoice=()=>{
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!Recognition){onFeature('Voice dictation is unavailable in this browser. Use Chrome with speech recognition enabled or type your message.');return;}
    const speech=new Recognition();speech.lang='en-US';speech.interimResults=false;speech.maxAlternatives=1;
    speech.onresult=e=>{setValue(v=>[v,e.results[0][0].transcript].filter(Boolean).join(' '));requestAnimationFrame(resize);textRef.current?.focus();};
    speech.onerror=e=>{setListening(false);onFeature(`Microphone error: ${e.error}. Check microphone permissions.`);};
    speech.onend=()=>setListening(false);
    try{setListening(true);speech.start();}catch{setListening(false);onFeature('Unable to start voice dictation.');}
  };
  return <div className={styles.container}>
    <form className={styles.form} onSubmit={submit}>
      <label className={styles.screenReader} htmlFor='chatInput'>Message ChatGPT Clone</label>
      <textarea id='chatInput' ref={textRef} placeholder='Ask anything' rows={1} value={value} onChange={change}
        maxLength={MAX} disabled={isLoading} className={styles.textarea}
        onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();if(!isLoading)e.currentTarget.form.requestSubmit();}}}/>
      <div className={styles.bottomBar}>
        <div className={styles.addWrap}>
          <button className={styles.iconBtn} type='button' title='Add attachment' aria-label='Add attachment' aria-expanded={showPlus} onClick={()=>setShowPlus(v=>!v)}><Plus size={21}/></button>
          {showPlus && <div className={styles.plusMenu}><button type='button' onClick={()=>{setShowPlus(false);onFeature('File uploads are not implemented in this text-only API. Add a multipart upload endpoint and provider file handling to enable attachments.');}}><Paperclip size={16}/> Add photos & files <span>Coming later</span></button></div>}
        </div>
        <div className={styles.bottomRight}>
          <button className={`${styles.iconBtn} ${listening?styles.recording:''}`} type='button' title='Dictate a message' aria-label='Dictate a message' disabled={isLoading} onClick={startVoice}>{listening?<X size={20}/>:<Mic size={20}/>}</button>
          <button className={styles.send} type='submit' disabled={!value.trim()||isLoading} title='Send' aria-label='Send message'>{isLoading?<span className={styles.spinner}/>:<ArrowUp size={20} strokeWidth={2.8}/>}</button>
        </div>
      </div>
    </form>
  </div>;
}
