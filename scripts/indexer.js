import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const CONFIG = {
  NAMESPACE: "__default__",
  EMBED_BATCH_SIZE: 50,
  UPSERT_BATCH_SIZE: 100,
  PDF_FILE: "Faculty.pdf",
};

console.log("INDEXER_CONFIG", {
  pdfFile: CONFIG.PDF_FILE,
  indexName: process.env.PINECONE_INDEX_NAME,
});

if (
  !process.env.GEMINI_API_KEY ||
  !process.env.PINECONE_API_KEY ||
  !process.env.PINECONE_INDEX_NAME
) {
  console.error("Missing required environment variables for indexing.");
  process.exit(1);
}

async function indexDocument() {
  try {
    console.log(`Indexing into namespace: ${CONFIG.NAMESPACE}\n`);

    const pdfPath = path.join(__dirname, "..", CONFIG.PDF_FILE);
    const pdfLoader = new PDFLoader(pdfPath);
    const rawDocs = await pdfLoader.load();

    console.log("INDEXER_RAW_DOCS", {
      docCount: rawDocs.length,
      firstDocPreview:
        rawDocs[0]?.pageContent?.slice(0, 300) || null,
    });

    // 🔥 NEW PERFECT RECORD-BASED SPLITTING
    const fullText = rawDocs.map(doc => doc.pageContent).join("\n");

    const records = fullText
      .split("Name:")
      .filter(r => r.trim().length > 0)
      .map(r => "Name:" + r.trim());

    console.log(`Total faculty records (chunks): ${records.length}\n`);

    console.log("INDEXER_CHUNKS", {
      chunkCount: records.length,
      firstChunks: records.slice(0, 3).map((text, i) => ({
        index: i,
        text: text.slice(0, 200),
      })),
    });

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    const pineconeIndex = pinecone
      .index(process.env.PINECONE_INDEX_NAME)
      .namespace(CONFIG.NAMESPACE);

    console.log("INDEXER_PINECONE_READY", {
      indexName: process.env.PINECONE_INDEX_NAME,
    });

    const allEmbeddings = [];

    for (let i = 0; i < records.length; i += CONFIG.EMBED_BATCH_SIZE) {
      const batchTexts = records.slice(i, i + CONFIG.EMBED_BATCH_SIZE);

      console.log(`Embedding batch ${i} → ${i + batchTexts.length - 1}`);

      const response = await ai.models.embedContent({
        model: "gemini-embedding-001",
        contents: batchTexts,
        taskType: "RETRIEVAL_DOCUMENT",
      });

      if (!response.embeddings || response.embeddings.length !== batchTexts.length) {
        throw new Error("Embedding batch mismatch.");
      }

      allEmbeddings.push(...response.embeddings);

      console.log("INDEXER_EMBED_BATCH_DONE", {
        start: i,
        end: i + batchTexts.length - 1,
        batchSize: batchTexts.length,
      });
    }

    if (allEmbeddings.length !== records.length) {
      throw new Error("Embedding count mismatch.");
    }

    console.log("INDEXER_EMBEDDINGS_READY", {
      embeddingCount: allEmbeddings.length,
      firstEmbeddingLength:
        allEmbeddings[0]?.values?.length || null,
    });

    let batch = [];

    for (let i = 0; i < records.length; i++) {
      batch.push({
        id: `chunk-${i}`,
        values: allEmbeddings[i].values,
        metadata: {
          text: records[i],
          source: CONFIG.PDF_FILE,
          chunkIndex: i,
        },
      });

      if (
        batch.length === CONFIG.UPSERT_BATCH_SIZE ||
        i === records.length - 1
      ) {
        console.log(`Upserting batch ending at chunk ${i}`);
        console.log("INDEXER_UPSERT_BATCH", {
          lastChunkIndex: i,
          batchSize: batch.length,
          sampleIds: batch.slice(0, 3).map((v) => v.id),
        });

        await pineconeIndex.upsert(batch);
        batch = [];
      }
    }

    console.log(`Indexing complete for namespace: ${CONFIG.NAMESPACE}`);
  } catch (error) {
    console.error("Indexing failed:");
    console.error(error);
  }
}

indexDocument();