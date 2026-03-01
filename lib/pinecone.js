import { Pinecone } from "@pinecone-database/pinecone";

const apiKey = process.env.PINECONE_API_KEY;
const indexName = process.env.PINECONE_INDEX_NAME;

if (!apiKey || !indexName) {
  throw new Error("PINECONE_API_KEY and PINECONE_INDEX_NAME must be set");
}

const client = new Pinecone({ apiKey });

export function getIndex() {
  return client.index(indexName);
}
