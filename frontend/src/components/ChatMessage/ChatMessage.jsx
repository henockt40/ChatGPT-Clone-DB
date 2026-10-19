import { isValidElement, useState } from 'react';
import { Check, ClipboardCopy, Code2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import styles from './ChatMessage.module.css';

// react-markdown calls pre for fenced blocks. Render a proper wrapper instead
// of nesting a <div> inside <pre>, which would be invalid markup.
function MarkdownPre({ children }) {
  if (!isValidElement(children)) return <pre>{children}</pre>;
  const language = /language-([\w-]+)/.exec(children.props.className || '')?.[1] || 'text';
  const code = String(children.props.children || '').replace(/\n$/, '');
  return (
    <div className={styles.codeShell}>
      <div className={styles.codeHeader}><span>{language}</span><CopyButton text={code} caption='Copy code' /></div>
      <SyntaxHighlighter language={language} style={vscDarkPlus} customStyle={{ margin:0, padding:'16px', background:'#171717', borderRadius:'0 0 12px 12px', fontSize:'12px' }} wrapLongLines>
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

function InlineCode({ children, ...props }) {
  return <code className={styles.inlineCode} {...props}>{children}</code>;
}

function CopyButton({ text, caption='Copy message' }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* Clipboard may be unavailable on insecure origins. */ }
  };
  return <button className={styles.copyBtn} onClick={handleCopy} title={copied ? 'Copied!' : caption} aria-label={copied ? 'Copied' : caption}>
    {copied ? <Check size={15} /> : <ClipboardCopy size={15} />}<span>{copied ? 'Copied' : 'Copy'}</span>
  </button>;
}

export default function ChatMessage({ id, role, content }) {
  const isUser = role === 'user';
  return (
    <article id={`message-${id}`} className={`${styles.message} ${isUser ? styles.user : styles.assistant}`}>
      {!isUser && <div className={styles.aiBadge} aria-label='Assistant'><Code2 size={18} /></div>}
      <div className={styles.body}>
        {isUser ? <div className={styles.userBubble}>{content}</div> : (
          <div className={styles.markdownBody}>
            <ReactMarkdown components={{ code: InlineCode, pre: MarkdownPre }}>{content}</ReactMarkdown>
          </div>
        )}
        <div className={styles.actions}><CopyButton text={content} /></div>
      </div>
    </article>
  );
}
