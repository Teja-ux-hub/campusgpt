import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Pinecone } from "@pinecone-database/pinecone";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const index = pinecone
  .index(process.env.PINECONE_INDEX_NAME)
  .namespace("placement"); // purana namespace naam

await index.deleteAll();

console.log("Deleted all vectors from namespace: placement");