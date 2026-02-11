import "dotenv/config";
import { onRequest } from "firebase-functions/v2/https";
import admin from "firebase-admin";
import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/googleai";

admin.initializeApp();
const db = admin.firestore();

const ai = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GEMINI_API_KEY }),
  ],
});

const embedder = googleAI.embedder("gemini-embedding-001");

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

const STOPWORDS = new Set([
  "the","a","an","and","or","of","to","in","on","for","with","is","was"
]);

function cleanWords(text) {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

function extractEmbedding(embedResp) {
  if (Array.isArray(embedResp?.embedding)) return embedResp.embedding;
  if (Array.isArray(embedResp?.[0]?.embedding)) return embedResp[0].embedding;
  return null;
}

function literalBoost(queryWords, text) {
  const textLC = text.toLowerCase();
  let boost = 0;
  queryWords.forEach(w => {
    if (textLC.includes(w)) boost += 15;
  });
  return boost;
}

export const semanticSearch = onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).send("");

  try {
    const { query } = req.body || {};
    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Missing or invalid query" });
    }

    console.log("===== SEMANTIC SEARCH START =====");
    console.log("Query received:", query);

    const words = cleanWords(query);
    console.log("Cleaned words:", words);
    if (!words.length) return res.json({ results: [] });

    const qEmbedRaw = await ai.embed({ embedder, content: query });
    const queryVector = extractEmbedding(qEmbedRaw);
    if (!queryVector) {
      console.error("Query embedding invalid:", JSON.stringify(qEmbedRaw, null, 2));
      return res.status(500).json({ error: "Failed to generate query embedding" });
    }
    console.log("Query embedding length:", queryVector.length);

    const snap = await db.collection("reports").get();
    console.log(`Loaded ${snap.size} report documents`);

    const results = [];

    for (const doc of snap.docs) {
      const r = doc.data();
      if (!["open","pending"].includes(r.status)) continue;

      const searchableText =
        `${r.itemName || ""} `.repeat(5) + 
        `${(r.tags || []).join(" ")} `.repeat(4) + 
        `${r.description || ""}`;

      let embedding = r.embedding;
      if (!embedding) {
        try {
          const embRaw = await ai.embed({ embedder, content: searchableText });
          embedding = extractEmbedding(embRaw);
          if (embedding) {
            await doc.ref.update({ embedding });
            console.log("Saved embedding for doc:", doc.id);
          } else {
            console.warn("Failed to generate embedding for doc:", doc.id);
            continue;
          }
        } catch (err) {
          console.error("Error generating embedding for doc:", doc.id, err);
          continue;
        }
      }

      let similarity = cosineSimilarity(queryVector, embedding) * 100;
      const boost = literalBoost(words, searchableText);
      similarity += boost;

      console.log(`Doc ${doc.id} similarity: ${similarity.toFixed(2)}% (+${boost} boost)`);
      let minSim = 30;
      if (words.length === 1) minSim = 50;
      if (words.length >= 4) minSim = 25;
      if (similarity < minSim) continue;
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

    results.sort((a,b) => b.similarity - a.similarity);

    console.log("Total matches:", results.length);
    console.log("===== SEMANTIC SEARCH END =====");

    return res.json({ results });

  } catch (err) {
    console.error("Fatal error during semantic search:", err);
    return res.status(500).json({ error: "Server error", details: String(err) });
  }
});
