import db from "../../../../db/db.config.js";
import { AppError } from '../../../utils/app-error.js';
const httpError = (status,message) => new AppError(message,status);
import { generateText, generateTextWithRetry } from "../../../services/ai.service.js";


const QUESTION_COUNT = 4;
const MAX_SOURCES = 15;

const today = () =>
  new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

const parseJson = (text, fallback) => {
  try {
    return text ? JSON.parse(text) : fallback;
  } catch {
    return fallback;
  }
};

const toPublic = (row) => ({
  id: row.id,
  topic: row.topic,
  status: row.status,
  progress: parseJson(row.progress, []),
  report: row.report || null,
  sources: parseJson(row.sources, []),
  error_message: row.error_message || null,
  created_at: row.created_at,
  finished_at: row.finished_at,
});

export async function listReports(userId) {
  const [rows] = await db.execute(
    `SELECT id, topic, status, created_at, finished_at
       FROM research_reports WHERE user_id=? ORDER BY id DESC LIMIT 100`,[userId],
  );
  return rows;
}

export async function getReport(userId,id) {
  const [rows] = await db.execute(`SELECT * FROM research_reports WHERE id = ? AND user_id=?`, [id,userId]);
  if (!rows.length) throw httpError(404, "Research report not found");
  return toPublic(rows[0]);
}

export async function deleteReport(userId,id) {
  const [rows] = await db.execute(`SELECT status FROM research_reports WHERE id = ? AND user_id=?`, [id,userId]);
  if (!rows.length) throw httpError(404, "Research report not found");
  if (rows[0].status === "running") {
    throw httpError(409, "This research is still running. Wait for it to finish first.");
  }
  await db.execute(`DELETE FROM research_reports WHERE id = ? AND user_id=?`, [id,userId]);
}

// Starts the research in the background and returns right away.
// The browser then checks getReport() every few seconds for progress.
export async function startResearch(userId,topic) {
  const [[{ active }]] = await db.execute(
    `SELECT COUNT(*) AS active FROM research_reports WHERE status = 'running' AND user_id=?`,[userId],
  );
  if (active > 0) {
    throw httpError(409, "Another research is already running. Please wait for it to finish.");
  }

  const [created] = await db.execute(
    `INSERT INTO research_reports (topic,user_id,status,progress) VALUES (?, ?, 'running', '[]')`,
    [topic,userId],
  );
  const id = created.insertId;

  // Not awaited on purpose: it runs while the browser polls for progress.
  runResearch(id, topic).catch((error) => console.error("Research crashed:", error));
  return { id };
}

async function runResearch(id, topic) {
  const steps = [];
  const saveProgress = () =>
    db.execute(`UPDATE research_reports SET progress = ? WHERE id = ?`, [JSON.stringify(steps), id]);
  const begin = async (label) => {
    steps.push({ label, status: "running" });
    await saveProgress();
    return steps.length - 1;
  };
  const complete = async (index) => {
    steps[index].status = "done";
    await saveProgress();
  };

  try {
    // 1. Plan: split the topic into focused questions.
    let step = await begin("Planning the research");
    const questions = await planQuestions(topic);
    await complete(step);

    // 2. Research each question (with Google Search when available).
    const findings = [];
    const sources = new Map();
    let usedSearch = false;
    for (const question of questions) {
      step = await begin(`Researching: ${question}`);
      const result = await researchQuestion(topic, question);
      findings.push({ question, text: result.text });
      usedSearch ||= result.searched;
      for (const source of result.sources) {
        if (!sources.has(source.url)) sources.set(source.url, source);
      }
      await complete(step);
    }

    // 3. Write the final report from the findings.
    step = await begin("Writing the report");
    const sourceList = [...sources.values()].slice(0, MAX_SOURCES);
    const report = await writeReport(topic, findings, usedSearch, sourceList);
    await complete(step);

    await db.execute(
      `UPDATE research_reports
          SET status = 'done', report = ?, sources = ?, finished_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      [report, JSON.stringify(sourceList), id],
    );
  } catch (error) {
    const failed = steps.find((item) => item.status === "running");
    if (failed) failed.status = "error";
    const message = error.expose ? error.message : "The research failed. Please try again.";
    console.error("Research failed:", error.message);
    await db
      .execute(
        `UPDATE research_reports
            SET status = 'error', progress = ?, error_message = ?, finished_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
        [JSON.stringify(steps), message.slice(0, 500), id],
      )
      .catch((dbError) => console.error("Could not save research error:", dbError.message));
  }
}

async function planQuestions(topic) {
  const fallback = [
    `What is ${topic} and why does it matter?`,
    `What are the most important facts, numbers and recent developments about ${topic}?`,
    `What are the main viewpoints, debates or trade-offs about ${topic}?`,
    `What are the practical implications and next steps regarding ${topic}?`,
  ];

  try {
    const { text } = await generateTextWithRetry({
      contents:
        `Today is ${today()}. Break this research topic into ${QUESTION_COUNT} focused, ` +
        `non-overlapping research questions that together give a thorough and balanced overview.\n` +
        `Topic: ${topic}\n` +
        `Reply with JSON only, in this shape: {"questions": ["...", "..."]}`,
      json: true,
    });
    const questions = (parseJson(text, {}).questions || [])
      .filter((q) => typeof q === "string" && q.trim())
      .map((q) => q.trim().slice(0, 300))
      .slice(0, QUESTION_COUNT);
    return questions.length >= 2 ? questions : fallback;
  } catch (error) {
    // A busy or invalid AI is a real failure; a badly formatted plan is not.
    if (error.status === 429 || error.status === 503 || error.status === 504) throw error;
    return fallback;
  }
}

async function researchQuestion(topic, question) {
  const options = {
    contents:
      `Today is ${today()}. Research this question about "${topic}":\n${question}\n\n` +
      `Write 150-250 words of findings with specific facts, numbers and dates. ` +
      `If sources disagree or something is uncertain, say so clearly. Do not guess.`,
  };

  try {
    const result = await generateTextWithRetry({ ...options, search: true });
    return { ...result, searched: true };
  } catch (error) {
    if (error.status === 429) throw error; // out of quota: asking again will not help
    // Google Search may be unavailable for this key. Answer without it.
    const result = await generateTextWithRetry(options);
    return { ...result, sources: [], searched: false };
  }
}

async function writeReport(topic, findings, usedSearch, sources) {
  const notes = findings.map((f, i) => `### Question ${i + 1}: ${f.question}\n${f.text}`).join("\n\n");

  const { text } = await generateText({
    contents:
      `Today is ${today()}. Write a clear, well-structured research report on: ${topic}\n\n` +
      `Use ONLY the research notes below. Do not invent facts, statistics, quotes or links. ` +
      `If the notes are uncertain or disagree, say so.\n\n` +
      `Use Markdown with this structure: a # title, a ## Summary (3-4 sentences), ` +
      `## Key findings (use ### subheadings), ## Different viewpoints and uncertainties, ## Conclusion. ` +
      `Do not add a sources list; it is added automatically.\n\n` +
      `RESEARCH NOTES:\n${notes}`,
    timeoutMs: 120_000,
  });

  let report = text.trim();
  if (!usedSearch) {
    report +=
      "\n\n> Note: live web search was not available, so this report is based on the AI's general knowledge and may be out of date.";
  }
  if (sources.length) {
    report +=
      "\n\n## Sources\n" +
      sources.map((s, i) => `${i + 1}. [${s.title.replace(/[\[\]]/g, "")}](${s.url})`).join("\n");
  }
  return report;
}
