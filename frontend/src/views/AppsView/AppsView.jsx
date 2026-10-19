import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ChefHat,
  Check,
  CircleAlert,
  Copy,
  FileText,
  GraduationCap,
  Languages,
  Loader2,
  Mail,
  MessageSquarePlus,
  PenLine,
  Play,
  Sparkles,
} from "lucide-react";
import { api, errorMessage } from "../../api";
import Markdown from "../../components/Markdown/Markdown";
import ui from "../../components/ui/ui.module.css";
import styles from "./AppsView.module.css";

// The backend sends an icon name; this maps it to the real icon.
const ICONS = { Languages, FileText, Mail, GraduationCap, PenLine, ChefHat };

const startingValues = (app) =>
  Object.fromEntries(app.fields.map((field) => [field.name, field.type === "select" ? field.options[0] : ""]));

function AppsView({ onContinueInChat }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [values, setValues] = useState({});
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api
      .get("/apps")
      .then(({ data }) => setApps(data.data || []))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  function openApp(app) {
    setSelected(app);
    setValues(startingValues(app));
    setResult(null);
    setError("");
  }

  function missingField() {
    return selected.fields.find((field) => field.required && !String(values[field.name] || "").trim());
  }

  async function run(event) {
    event.preventDefault();
    if (running) return;
    const missing = missingField();
    if (missing) {
      setError(`Please fill in "${missing.label}".`);
      return;
    }
    setRunning(true);
    setError("");
    try {
      const { data } = await api.post(`/apps/${selected.id}/run`, { inputs: values });
      setResult(data.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRunning(false);
    }
  }

  async function copyResult() {
    await navigator.clipboard.writeText(result.result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ---------- one app ----------
  if (selected) {
    const Icon = ICONS[selected.icon] || Sparkles;
    return (
      <div className={ui.page}>
        <div className={ui.inner}>
          <button type="button" className={ui.back} onClick={() => setSelected(null)}>
            <ArrowLeft size={16} /> All apps
          </button>
          <div className={styles.appHeader}>
            <span className={styles.bigIcon}>
              <Icon size={24} />
            </span>
            <div>
              <h1 className={ui.title} style={{ margin: 0 }}>{selected.name}</h1>
              <p className={ui.muted}>{selected.description}</p>
            </div>
          </div>

          <div className={styles.layout}>
            <form className={ui.card} onSubmit={run}>
              {selected.fields.map((field) => (
                <div className={ui.field} key={field.name}>
                  <label className={ui.label} htmlFor={`field-${field.name}`}>
                    {field.label}
                    {!field.required && " (optional)"}
                  </label>
                  {field.type === "textarea" && (
                    <textarea
                      id={`field-${field.name}`}
                      className={ui.textarea}
                      value={values[field.name]}
                      placeholder={field.placeholder}
                      maxLength={12000}
                      onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
                    />
                  )}
                  {field.type === "text" && (
                    <input
                      id={`field-${field.name}`}
                      className={ui.input}
                      value={values[field.name]}
                      placeholder={field.placeholder}
                      maxLength={500}
                      onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
                    />
                  )}
                  {field.type === "select" && (
                    <select
                      id={`field-${field.name}`}
                      className={ui.select}
                      value={values[field.name]}
                      onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
                    >
                      {field.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
              <button type="submit" className={`${ui.btn} ${ui.primary}`} disabled={running}>
                {running ? <Loader2 size={16} className={ui.spin} /> : <Play size={16} />}
                {running ? "Working..." : `Run ${selected.name}`}
              </button>
            </form>

            <div className={styles.output}>
              {error && (
                <div className={ui.error} role="alert">
                  <CircleAlert size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{error}</span>
                </div>
              )}
              {running && <div className={ui.empty}>The AI is working on it...</div>}
              {!running && !result && !error && (
                <div className={ui.empty}>Your result will appear here.</div>
              )}
              {!running && result && (
                <div className={ui.card}>
                  <Markdown content={result.result} />
                  <div className={ui.row} style={{ marginTop: 18 }}>
                    <button type="button" className={ui.btn} onClick={copyResult}>
                      {copied ? <Check size={15} /> : <Copy size={15} />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                    <button
                      type="button"
                      className={ui.btn}
                      onClick={() =>
                        onContinueInChat({
                          title: `${result.appName}: ${result.prompt.split("\n")[0]}`,
                          messages: [
                            { role: "user", content: result.prompt },
                            { role: "assistant", content: result.result },
                          ],
                        })
                      }
                    >
                      <MessageSquarePlus size={15} /> Continue in chat
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- all apps ----------
  return (
    <div className={ui.page}>
      <div className={ui.inner}>
        <h1 className={ui.title}>Apps</h1>
        <p className={ui.subtitle}>
          Small tools for everyday jobs. Pick one, fill in a few fields and get a result in seconds.
        </p>

        {error && (
          <div className={ui.error} role="alert">
            <CircleAlert size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}
        {loading && <div className={ui.empty}>Loading apps...</div>}

        <div className={ui.grid}>
          {apps.map((app) => {
            const Icon = ICONS[app.icon] || Sparkles;
            return (
              <button key={app.id} type="button" className={styles.appCard} onClick={() => openApp(app)}>
                <span className={styles.bigIcon}>
                  <Icon size={22} />
                </span>
                <span className={styles.appName}>{app.name}</span>
                <span className={styles.appDesc}>{app.description}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default AppsView;
