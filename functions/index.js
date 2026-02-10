import "dotenv/config";
import { onRequest } from "firebase-functions/v2/https";
import admin from "firebase-admin";
import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/googleai";

admin.initializeApp();
const db = admin.firestore();

// Initialize GenKit with GoogleAI plugin
const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY, // must be set in env vars
    }),
  ],
});

const embedder = googleAI.embedder("gemini-embedding-001"); // use latest embedding model

// Cosine similarity helper
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Stopwords
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "is", "was"
]);

function cleanWords(text) {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

// Safely extract embedding from GenKit response
function extractEmbedding(embedResp) {
  if (Array.isArray(embedResp?.embedding)) return embedResp.embedding;
  if (Array.isArray(embedResp?.[0]?.embedding)) return embedResp[0].embedding;
  return null;
}

// Main semantic search function
export const semanticSearch = onRequest({ cors: true }, async (req, res) => {
  try {
    let body = req.body;
    if (!body || typeof body !== "object") {
      try {
        body = JSON.parse(req.rawBody.toString());
      } catch {
        return res.status(400).json({ error: "Invalid JSON" });
      }
    }

    const { query } = body;
    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Missing query" });
    }

    const words = cleanWords(query);
    if (!words.length) return res.json([]);

    // Dynamic similarity threshold
    let minSimilarity = 30;
    if (words.length === 1) minSimilarity = 40;
    if (words.length >= 4) minSimilarity = 25;

    // Generate query embedding
    const qEmbedRaw = await ai.embed({ embedder, content: query });
    const queryVector = extractEmbedding(qEmbedRaw);
    if (!queryVector) return res.json([]);

    // Retrieve reports
    const snap = await db.collection("reports").get();
    const results = [];

    for (const doc of snap.docs) {
      const r = doc.data();
      if (!["open", "pending"].includes(r.status)) continue;

      const searchableText =
        `${r.itemName || ""} `.repeat(3) +
        `${(r.tags || []).join(" ")} `.repeat(2) +
        `${r.description || ""}`;

      // Use cached embedding or generate
      let embedding = r.embedding;
      if (!embedding) {
        const embRaw = await ai.embed({ embedder, content: searchableText });
        embedding = extractEmbedding(embRaw);
        if (!embedding) continue;
        await doc.ref.update({ embedding });
      }

      const similarity = cosineSimilarity(queryVector, embedding) * 100;
      if (similarity < minSimilarity) continue;

      let confidence = "LOW";
      if (similarity >= 75) confidence = "HIGH";
      else if (similarity >= 55) confidence = "MEDIUM";

      results.push({
        id: doc.id,
        itemName: r.itemName,
        description: r.description,
        location: r.location,
        imageUrl: r.imageUrl || "",
        similarity: Math.round(similarity),
        confidence,
      });
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return res.json(results);

  } catch (err) {
    console.error("FATAL SEARCH ERROR:", err);
    return res.status(500).json({ error: String(err) });
  }
});
