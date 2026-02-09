import { onRequest } from "firebase-functions/v2/https";
import cors from "cors";
import admin from "firebase-admin";
import { genkit } from "genkit";
import googleAI from "@genkit-ai/googleai";

admin.initializeApp();
const db = admin.firestore();
const corsHandler = cors({ origin: true });

// Initialize GenKit with GoogleAI plugin using secret
// Attach the secret directly in the function below
const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY, // This comes from the attached secret
    }),
  ],
});

// Embedding model
const embedder = "models/textembedding-gecko-001";

// Cosine similarity helper
function cosineSimilarity(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Stopwords filter
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
  return embedResp?.data?.[0]?.embedding ?? null;
}

// --- Semantic Search Function ---
export const semanticSearch = onRequest(
  { secrets: ["GEMINI_API_KEY"] }, // ✅ attach the secret properly
  async (req, res) => {
    corsHandler(req, res, async () => {
      console.log("\n===== SEMANTIC SEARCH START =====");

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
        console.log("QUERY RECEIVED:", query);
        console.log("CLEAN WORDS:", words);

        if (!words.length) return res.json([]);

        // Adjust min similarity based on word count
        let minSimilarity = 30;
        if (words.length === 1) minSimilarity = 40;
        if (words.length >= 4) minSimilarity = 25;
        console.log("MIN SIMILARITY:", minSimilarity);

        // Get query embedding
        let queryVector;
        try {
          const qEmbedRaw = await ai.embed({ embedder, content: query });
          queryVector = extractEmbedding(qEmbedRaw);
          if (!queryVector) {
            console.error("QUERY EMBEDDING INVALID");
            return res.status(500).json({ error: "Query embedding invalid" });
          }
        } catch (err) {
          console.error("Failed to get query embedding:", err);
          return res.status(500).json({ error: "Query embedding failed" });
        }
        console.log("QUERY VECTOR LENGTH:", queryVector.length);

        // Fetch reports
        const snap = await db.collection("reports").get();
        const results = [];

        for (const doc of snap.docs) {
          const r = doc.data();
          if (!["open", "pending"].includes(r.status)) continue;

          const searchableText =
            `${r.itemName || ""} `.repeat(3) +
            `${(r.tags || []).join(" ")} `.repeat(2) +
            `${r.description || ""}`;

          let embedding = r.embedding;

          // Generate embedding if missing
          if (!embedding) {
            try {
              const embRaw = await ai.embed({ embedder, content: searchableText });
              embedding = extractEmbedding(embRaw);
              if (!embedding) {
                console.warn("Failed to extract embedding for doc", doc.id);
                continue;
              }
              await doc.ref.update({ embedding });
              console.log("Saved embedding for", doc.id);
            } catch (err) {
              console.error("Failed to generate/save embedding for doc", doc.id, err);
              continue;
            }
          }

          // Defensive check
          if (!queryVector || !embedding) continue;

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

          console.log(`MATCH ${doc.id}: ${Math.round(similarity)}%`);
        }

        results.sort((a, b) => b.similarity - a.similarity);
        console.log("RESULT COUNT:", results.length);
        console.log("===== SEMANTIC SEARCH END =====\n");

        return res.json(results);

      } catch (err) {
        console.error("FATAL SEARCH ERROR:", err);
        return res.status(500).json({ error: String(err) });
      }
    });
  }
);
