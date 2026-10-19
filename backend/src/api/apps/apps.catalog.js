// The mini apps shown in the Apps tab. Each one is a form plus a prompt, so
// adding a new app only means adding an object to this list.
//   icon: the name of a lucide-react icon (the frontend maps it)
export const APPS = [
  {
    id: "translator",
    name: "Translator",
    description: "Translate text into another language and keep the tone.",
    icon: "Languages",
    fields: [
      { name: "text", label: "Text to translate", type: "textarea", placeholder: "Paste or type your text", required: true },
      { name: "language", label: "Translate to", type: "select", options: ["English", "Spanish", "French", "German", "Arabic", "Amharic", "Hindi", "Chinese", "Portuguese", "Swahili"], required: true },
    ],
    system: "You are a professional translator. Keep the meaning, tone and formatting of the original. Reply with the translation only.",
    prompt: ({ text, language }) => `Translate the following text into ${language}:\n\n${text}`,
  },
  {
    id: "summarizer",
    name: "Summarizer",
    description: "Turn long text into a short summary with key points.",
    icon: "FileText",
    fields: [
      { name: "text", label: "Text to summarize", type: "textarea", placeholder: "Paste an article, email or notes", required: true },
      { name: "length", label: "Length", type: "select", options: ["Very short", "Short", "Detailed"], required: true },
    ],
    system: "You summarize text accurately. Never add facts that are not in the text. Use Markdown.",
    prompt: ({ text, length }) => `Summarize this text. Length: ${length}. Finish with a short list of key points.\n\n${text}`,
  },
  {
    id: "email-writer",
    name: "Email writer",
    description: "Draft a clear email from a few bullet points.",
    icon: "Mail",
    fields: [
      { name: "purpose", label: "What is the email for?", type: "text", placeholder: "e.g. ask my manager for a day off", required: true },
      { name: "points", label: "Key points to include", type: "textarea", placeholder: "One point per line", required: false },
      { name: "tone", label: "Tone", type: "select", options: ["Professional", "Friendly", "Formal", "Short and direct"], required: true },
    ],
    system: "You write clear, natural emails. Include a subject line. Do not invent facts, names or dates that were not provided.",
    prompt: ({ purpose, points, tone }) => `Write an email.\nPurpose: ${purpose}\nTone: ${tone}\nKey points:\n${points || "(none given)"}`,
  },
  {
    id: "study-quiz",
    name: "Study quiz",
    description: "Create practice questions with answers on any topic.",
    icon: "GraduationCap",
    fields: [
      { name: "topic", label: "Topic or notes", type: "textarea", placeholder: "e.g. photosynthesis, or paste your notes", required: true },
      { name: "count", label: "Number of questions", type: "select", options: ["5", "10", "15"], required: true },
      { name: "level", label: "Level", type: "select", options: ["Beginner", "Intermediate", "Advanced"], required: true },
    ],
    system: "You are a helpful teacher. Write accurate questions. Use Markdown. Put all answers in a separate 'Answers' section at the end.",
    prompt: ({ topic, count, level }) => `Create ${count} ${level.toLowerCase()} practice questions (a mix of multiple choice and short answer) about:\n\n${topic}`,
  },
  {
    id: "rewriter",
    name: "Rewrite and fix",
    description: "Fix grammar or rewrite text in a different style.",
    icon: "PenLine",
    fields: [
      { name: "text", label: "Your text", type: "textarea", placeholder: "Paste what you wrote", required: true },
      { name: "style", label: "Style", type: "select", options: ["Fix grammar only", "More professional", "Simpler and clearer", "More friendly", "Shorter"], required: true },
    ],
    system: "You are an editor. Keep the author's meaning. Reply with the improved text first, then a short list of what you changed.",
    prompt: ({ text, style }) => `Edit this text. Style: ${style}.\n\n${text}`,
  },
  {
    id: "recipe-maker",
    name: "Recipe maker",
    description: "Get a recipe from the ingredients you already have.",
    icon: "ChefHat",
    fields: [
      { name: "ingredients", label: "Ingredients you have", type: "textarea", placeholder: "e.g. rice, eggs, onions, tomatoes", required: true },
      { name: "diet", label: "Diet", type: "select", options: ["No preference", "Vegetarian", "Vegan", "High protein", "Low carb"], required: true },
    ],
    system: "You are a practical home cook. Suggest one recipe using mostly the given ingredients. Use Markdown with ingredients, steps and cooking time.",
    prompt: ({ ingredients, diet }) => `Suggest a recipe. Diet: ${diet}.\nIngredients I have: ${ingredients}`,
  },
];

// What the browser needs (never the prompts).
export const publicCatalog = () =>
  APPS.map(({ id, name, description, icon, fields }) => ({ id, name, description, icon, fields }));
