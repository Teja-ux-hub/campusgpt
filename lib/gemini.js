import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY must be set");
}

export const ai = new GoogleGenAI({
  apiKey,
});

export async function embedQuery(text) {
  const start = Date.now();

  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: [text],
    taskType: "RETRIEVAL_QUERY",
  });

  const embedding = response.embeddings?.[0]?.values;
  if (!embedding) {
    throw new Error("Failed to generate query embedding");
  }

  const end = Date.now();
  const length = Array.isArray(embedding) ? embedding.length : 0;
  const firstValues = length ? embedding.slice(0, Math.min(15, length)) : [];
  const lastValues = length ? embedding.slice(Math.max(0, length - 15)) : [];

  let min = Infinity;
  let max = -Infinity;
  let sum = 0;

  for (let i = 0; i < length; i++) {
    const v = embedding[i];
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }

  const mean = length ? sum / length : 0;

  console.log("GEMINI_EMBED_STATS", {
    dims: length,
    firstValues,
    lastValues,
    min,
    max,
    mean,
    durationMs: end - start,
  });

  return embedding;
}

export async function generateAnswer(prompt) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return response.text;
}
