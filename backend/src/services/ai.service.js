import { GoogleGenAI } from "@google/genai";
import { AppError } from "../utils/app-error.js";
// Preserve chat's own AI provider; this module supports the three optional tabs.
const httpError = (status, message) => { const err = new AppError(message, status); err.status = status; err.expose = true; return err; };

export { httpError };

export const getTextModel = () =>
  process.env.GEMINI_MODEL?.trim() || "gemini-flash-latest";
export const getImageModel = () =>
  process.env.GEMINI_IMAGE_MODEL?.trim() || "gemini-3.1-flash-image";

// Create the Gemini client on first use so a missing key gives a clear
// message to the user instead of crashing the server at startup.
let client;
function getClient() {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    throw httpError(500, "The AI is not configured: GEMINI_API_KEY is missing in backend/.env.");
  }
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY.trim() });
  return client;
}

// Turn Gemini API failures into messages a user can understand.
export function toFriendlyAiError(error, { model, kind = "text" } = {}) {
  if (error?.expose) return error;

  const raw = String(error?.message || "");
  const status = Number(error?.status);
  console.error(`Gemini ${kind} error:`, raw.slice(0, 500));

  if (status === 429 || /quota|RESOURCE_EXHAUSTED/i.test(raw)) {
    return httpError(429, "The AI is busy or the free quota is used up. Please wait a minute and try again.");
  }
  if (kind === "image" && [400, 403, 404].includes(status)) {
    return httpError(
      502,
      `Image generation is not available for this API key or model ("${model}"). ` +
        "Image models are often not included in the free tier. You can set GEMINI_IMAGE_MODEL in backend/.env.",
    );
  }
  if (status === 401 || status === 403 || /API key|API_KEY_INVALID|PERMISSION_DENIED|UNAUTHENTICATED/i.test(raw)) {
    return httpError(502, "The Gemini API key is invalid or not allowed. Check GEMINI_API_KEY in backend/.env.");
  }
  if (status === 404 || /no longer available|not found|not supported/i.test(raw)) {
    return httpError(502, `The AI model "${model}" is not available. Check GEMINI_MODEL in backend/.env.`);
  }
  if (status === 503 || /overloaded|UNAVAILABLE/i.test(raw)) {
    return httpError(503, "The AI service is overloaded right now. Please try again in a moment.");
  }
  if (/timeout|timed out|aborted/i.test(raw)) {
    return httpError(504, "The AI took too long to answer. Please try again.");
  }
  return httpError(502, "The AI could not answer right now. Please try again.");
}

// Collect the web pages Gemini used when Google Search grounding is on.
function extractSources(response) {
  const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  return chunks
    .map((chunk) => chunk.web)
    .filter((web) => web?.uri)
    .map((web) => ({ title: web.title || web.uri, url: web.uri }));
}

/**
 * Ask Gemini for text.
 * @param {object} options
 * @param {string|Array} options.contents - a string or a [{role, parts}] history
 * @param {string} [options.systemInstruction]
 * @param {boolean} [options.search] - ground the answer with Google Search
 * @param {boolean} [options.json] - ask for a JSON reply
 * @param {number} [options.timeoutMs]
 */
export async function generateText({
  contents,
  systemInstruction,
  search = false,
  json = false,
  timeoutMs = 90_000,
}) {
  const model = getTextModel();
  const ai = getClient();

  const config = { httpOptions: { timeout: timeoutMs } };
  if (systemInstruction) config.systemInstruction = systemInstruction;
  if (search) config.tools = [{ googleSearch: {} }];
  if (json) config.responseMimeType = "application/json";

  let response;
  try {
    response = await ai.models.generateContent({ model, contents, config });
  } catch (error) {
    throw toFriendlyAiError(error, { model });
  }

  const text = response.text;
  if (!text) {
    throw httpError(502, "The AI returned an empty response. Please try again.");
  }
  return {
    text,
    totalTokens: response.usageMetadata?.totalTokenCount || 0,
    sources: extractSources(response),
  };
}

// Same as generateText, but retries a few times on busy / rate-limit errors.
export async function generateTextWithRetry(options, { retries = 2, delayMs = 4000 } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await generateText(options);
    } catch (error) {
      const retryable = error.status === 429 || error.status === 503 || error.status === 504;
      if (!retryable || attempt >= retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
}

const IMAGE_EXTENSIONS = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

// Ask Gemini for an image. Returns the raw bytes.
export async function generateImage(prompt) {
  const model = getImageModel();
  const ai = getClient();

  let response;
  try {
    response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        httpOptions: { timeout: 120_000 },
      },
    });
  } catch (error) {
    throw toFriendlyAiError(error, { model, kind: "image" });
  }

  const parts = response?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((part) => part.inlineData?.data);
  if (!imagePart) {
    const reason = parts.find((part) => part.text)?.text;
    throw httpError(
      422,
      reason
        ? `The AI did not create an image: ${reason.slice(0, 200)}`
        : "The AI did not create an image. Try describing it differently.",
    );
  }

  const mimeType = imagePart.inlineData.mimeType || "image/png";
  return {
    buffer: Buffer.from(imagePart.inlineData.data, "base64"),
    mimeType,
    extension: IMAGE_EXTENSIONS[mimeType] || "png",
  };
}
