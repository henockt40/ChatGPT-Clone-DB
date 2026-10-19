import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, Copy } from "lucide-react";
import styles from "./Markdown.module.css";

// A code block with syntax highlighting and a copy button.
const CodeBlock = ({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.codeBlockWrapper}>
      <div className={styles.codeHeader}>
        <span className={styles.codeLanguage}>{language || "code"}</span>
        <button onClick={handleCopy} className={styles.copyBtn} type="button">
          {copied ? (
            <>
              <Check size={14} color="#10a37f" />
              <span style={{ color: "#10a37f" }}>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>

      <SyntaxHighlighter
        language={language || "text"}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          borderRadius: "0 0 8px 8px",
          padding: "16px",
          fontSize: "14px",
          backgroundColor: "#0d0d0d",
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

// Renders Markdown text (headings, lists, tables, code) in the app's style.
function Markdown({ content }) {
  return (
    <div className={styles.markdownBody}>
      <ReactMarkdown
        components={{
          // Code blocks that name a language get the custom block above.
          // Their <pre> wrapper is dropped so the block is not boxed twice.
          pre({ node, children }) {
            const className = node?.children?.[0]?.properties?.className;
            const hasLanguage = Array.isArray(className)
              ? className.some((name) => String(name).startsWith("language-"))
              : false;
            return hasLanguage ? <>{children}</> : <pre>{children}</pre>;
          },
          code({ className, children, ...props }) {
            const match = /language-([\w+#-]+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");
            return match ? (
              <CodeBlock language={match[1]} value={codeString} />
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          // Open links from answers in a new tab.
          a({ children, ...props }) {
            return (
              <a {...props} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default Markdown;
