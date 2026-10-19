import { Code2, Lightbulb, Braces, Wrench } from 'lucide-react';
import ChatMessage from '../ChatMessage/ChatMessage';
import styles from './MessageList.module.css';
const suggestions = [
  { Icon: Braces, label: 'Explain React hooks', prompt: 'Explain React useState with a practical example.' },
  { Icon: Wrench, label: 'Debug JavaScript', prompt: 'How can I debug an Express.js error?' },
  { Icon: Code2, label: 'Build a REST API', prompt: 'Show an Express and MySQL MVC REST API example.' },
  { Icon: Lightbulb, label: 'Learn SQL joins', prompt: 'Explain SQL joins with code examples.' },
];
export default function MessageList({conversations,isFetching,isLoading,messagesEndRef,onSuggestion}) {
  return <section className={`${styles.messages} ${conversations.length===0?styles.emptyState:''}`} aria-label='Chat messages' aria-live='polite'>
    {isFetching && !conversations.length ? <div className={styles.loadingText}>Loading messages…</div> :
      !conversations.length ? <div className={styles.welcome}>
        <div className={styles.welcomeIcon}><Code2 size={23}/></div>
        <h1>What can I help with?</h1>
        <p>Ask about code, debugging, databases, or your next project.</p>
        <div className={styles.suggestions}>{suggestions.map(item=><button className={styles.suggestion} key={item.label} onClick={()=>onSuggestion(item.prompt)}><item.Icon size={17}/>{item.label}</button>)}</div>
      </div> : <div className={styles.thread}>
        {conversations.map(message=><ChatMessage key={message.id} id={message.id} role={message.role} content={message.content}/>)}
        {isLoading && <div className={styles.thinking} role='status'><span/><span/><span/><em>Thinking…</em></div>}
      </div>}
    <div ref={messagesEndRef} className={styles.end}/>
  </section>;
}
