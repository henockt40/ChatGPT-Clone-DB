import { useCallback, useEffect, useState } from "react";
import {
  Check,
  CircleAlert,
  Copy,
  Download,
  Loader2,
  Microscope,
  MessageSquarePlus,
  Plus,
  Trash2,
} from "lucide-react";
import { api, downloadText, errorMessage } from "../../api";
import Markdown from "../../components/Markdown/Markdown";
import ui from "../../components/ui/ui.module.css";
import styles from "./ResearchView.module.css";

const IDEAS = [
  "How does solar power compare with wind power for small countries?",
  "What are the pros and cons of learning to code with AI tools?",
  "How do vaccines get approved, step by step?",
];

const POLL_MS = 2500;
const RETRY_MS = 5000;

function StepIcon({ status }) {
  if (status === "done") return <Check size={16} className={styles.stepDone} />;
  if (status === "error") return <CircleAlert size={16} className={styles.stepError} />;
  return <Loader2 size={16} className={ui.spin} />;
}

function ResearchView({ onContinueInChat }) {
  const [reports, setReports] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [active, setActive] = useState(null);
  const [topic, setTopic] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const refreshList = useCallback(async () => {
    try {
      const { data } = await api.get("/research");
      setReports(data.data || []);
      return data.data || [];
    } catch (err) {
      setError(errorMessage(err));
      return [];
    }
  }, []);

  // On first load, reopen a research that is still running.
  useEffect(() => {
    refreshList().then((list) => {
      const running = list.find((report) => report.status === "running");
      if (running) setActiveId(running.id);
    });
  }, [refreshList]);

  // Load the selected report and keep checking while it is running.
  useEffect(() => {
    if (!activeId) {
      setActive(null);
      return undefined;
    }

    let cancelled = false;
    let timer;

    const check = async () => {
      try {
        const { data } = await api.get(`/research/${activeId}`);
        if (cancelled) return;
        setActive(data.data);
        if (data.data.status === "running") {
          timer = setTimeout(check, POLL_MS);
        } else {
          refreshList();
        }
      } catch (err) {
        if (cancelled) return;
        setError(errorMessage(err));
        // A short network problem should not lose a running research.
        if (err.response?.status === 404) setActiveId(null);
        else timer = setTimeout(check, RETRY_MS);
      }
    };

    check();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeId, refreshList]);

  async function start(text) {
    const value = (text ?? topic).trim();
    if (value.length < 3 || starting) return;
    setStarting(true);
    setError("");
    try {
      const { data } = await api.post("/research", { topic: value });
      setTopic("");
      setActive(null);
      setActiveId(data.data.id);
      refreshList();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setStarting(false);
    }
  }

  async function remove(report) {
    if (!window.confirm(`Delete the research "${report.topic}"?`)) return;
    try {
      await api.delete(`/research/${report.id}`);
      if (report.id === activeId) setActiveId(null);
      refreshList();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function copyReport() {
    await navigator.clipboard.writeText(active.report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const fileName = (active?.topic || "research").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);

  return (
    <div className={ui.page}>
      <div className={ui.inner}>
        <h1 className={ui.title}>Deep research</h1>
        <p className={ui.subtitle}>
          Ask a big question. The AI plans the research, looks things up on the web, and writes a report with sources.
          It usually takes one to three minutes.
        </p>

        <div className={styles.layout}>
          <aside className={styles.history} aria-label="Past research">
            <button
              type="button"
              className={`${ui.btn} ${ui.primary}`}
              onClick={() => {
                setActiveId(null);
                setError("");
              }}
            >
              <Plus size={16} /> New research
            </button>
            <ul className={styles.list}>
              {reports.map((report) => (
                <li key={report.id} className={`${styles.listItem} ${report.id === activeId ? styles.current : ""}`}>
                  <button type="button" className={styles.listButton} onClick={() => setActiveId(report.id)} title={report.topic}>
                    <span className={styles.listTopic}>{report.topic}</span>
                    <span className={`${styles.badge} ${styles[report.status]}`}>
                      {report.status === "running" ? "Running" : report.status === "done" ? "Done" : "Failed"}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={ui.iconBtn}
                    onClick={() => remove(report)}
                    disabled={report.status === "running"}
                    aria-label={`Delete ${report.topic}`}
                    title={report.status === "running" ? "Wait until it finishes" : "Delete"}
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
            {reports.length === 0 && <p className={ui.muted}>No research yet.</p>}
          </aside>

          <section className={styles.main}>
            {error && (
              <div className={ui.error} role="alert">
                <CircleAlert size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            {/* ---------- new research ---------- */}
            {!activeId && (
              <div className={ui.card}>
                <div className={ui.field}>
                  <label className={ui.label} htmlFor="research-topic">
                    What do you want to research?
                  </label>
                  <textarea
                    id="research-topic"
                    className={ui.textarea}
                    value={topic}
                    maxLength={500}
                    placeholder="e.g. How is AI changing education in Africa?"
                    onChange={(event) => setTopic(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) start();
                    }}
                  />
                </div>
                <button
                  type="button"
                  className={`${ui.btn} ${ui.primary}`}
                  onClick={() => start()}
                  disabled={starting || topic.trim().length < 3}
                >
                  {starting ? <Loader2 size={16} className={ui.spin} /> : <Microscope size={16} />}
                  Start research
                </button>

                <div className={ui.chips} style={{ marginTop: 16 }}>
                  {IDEAS.map((idea) => (
                    <button key={idea} type="button" className={ui.chip} onClick={() => setTopic(idea)}>
                      {idea}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ---------- one report ---------- */}
            {activeId && !active && !error && <div className={ui.empty}>Loading...</div>}

            {active && (
              <div>
                <h2 className={styles.topic}>{active.topic}</h2>

                {active.status === "running" && (
                  <div className={ui.card} aria-live="polite">
                    <p className={ui.muted} style={{ marginBottom: 14 }}>
                      Working on it. You can leave this page and come back; the research keeps running.
                    </p>
                    <ol className={styles.steps}>
                      {active.progress.map((step, index) => (
                        <li key={index} className={styles.step}>
                          <StepIcon status={step.status} />
                          <span>{step.label}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {active.status === "error" && (
                  <div className={ui.error} role="alert">
                    <CircleAlert size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>{active.error_message || "The research failed."} Start a new research to try again.</span>
                  </div>
                )}

                {active.status === "done" && (
                  <div className={ui.card}>
                    <div className={ui.row} style={{ marginBottom: 18 }}>
                      <button type="button" className={ui.btn} onClick={copyReport}>
                        {copied ? <Check size={15} /> : <Copy size={15} />}
                        {copied ? "Copied" : "Copy"}
                      </button>
                      <button type="button" className={ui.btn} onClick={() => downloadText(`${fileName}.md`, active.report)}>
                        <Download size={15} /> Download
                      </button>
                      <button
                        type="button"
                        className={ui.btn}
                        onClick={() =>
                          onContinueInChat({
                            title: `Research: ${active.topic}`,
                            messages: [
                              { role: "user", content: `Deep research: ${active.topic}` },
                              { role: "assistant", content: active.report },
                            ],
                          })
                        }
                      >
                        <MessageSquarePlus size={15} /> Discuss in chat
                      </button>
                    </div>
                    <Markdown content={active.report} />
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default ResearchView;
