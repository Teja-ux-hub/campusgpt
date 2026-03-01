import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getIndex } from "@/lib/pinecone";
import { embedQuery, generateAnswer } from "@/lib/gemini";
import { addMessage, formatHistory } from "@/lib/memory";
import {
  getExactCached,
  setExactCache,
  getSemanticCached,
  addSemanticCache,
} from "@/lib/cache";
import { rerankWithBm25 } from "@/lib/bm25";

export async function POST(request) {
  try {
    const { userId } = await auth();
    const body = await request.json();
    const query = body?.query;

    console.log("CHAT_REQUEST", {
      query,
      userId,
      timestamp: new Date().toISOString(),
    });

    if (!userId) {
      console.log("CHAT_UNAUTHORIZED_NO_USER");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Missing query" },
        { status: 400 }
      );
    }

    const exactCached = getExactCached(query);
    if (exactCached) {
      console.log("CHAT_CACHE_HIT_EXACT", {
        query,
        answerPreview: String(exactCached).slice(0, 500),
      });
      return NextResponse.json({
        fromCache: "exact",
        answer: exactCached,
      });
    } else {
      console.log("CHAT_CACHE_MISS_EXACT", { query });
    }

    const queryVector = await embedQuery(query);

    const embedLength = Array.isArray(queryVector) ? queryVector.length : 0;
    const embedFirst = embedLength ? queryVector.slice(0, Math.min(10, embedLength)) : [];
    const embedLast = embedLength ? queryVector.slice(Math.max(0, embedLength - 10)) : [];

    console.log("CHAT_EMBEDDING", {
      length: embedLength,
      type: typeof queryVector,
      firstValues: embedFirst,
      lastValues: embedLast,
    });

    const semanticCached = getSemanticCached(queryVector);
    if (semanticCached) {
      console.log("CHAT_CACHE_HIT_SEMANTIC", {
        query,
        answerPreview: String(semanticCached).slice(0, 500),
      });
      return NextResponse.json({
        fromCache: "semantic",
        answer: semanticCached,
      });
    } else {
      console.log("CHAT_CACHE_MISS_SEMANTIC", { query });
    }

    const index = getIndex();

    console.log("CHAT_PINECONE_QUERY", {
      topK: 50,
    });

    const denseSearchResults = await index.query({
      vector: queryVector,
      topK: 100,
      includeMetadata: true,
    });

    console.log("CHAT_PINECONE_RESULTS", {
      count: denseSearchResults.matches?.length || 0,
      matches: (denseSearchResults.matches || []).map((match) => ({
        id: match.id,
        score: match.score,
        text: match.metadata?.text || "",
      })),
    });

    if (!denseSearchResults.matches?.length) {
      return NextResponse.json({
        answer: "I could not find relevant information in the documents.",
      });
    }

    const denseResults = denseSearchResults.matches.map((match, index) => ({
      id: match.id,
      rank: index + 1,
      text: match.metadata?.text || "",
    }));

    console.log("CHAT_DENSE_RESULTS", denseResults.map((d) => ({
      id: d.id,
      rank: d.rank,
      textPreview: d.text.slice(0, 200),
    })));

    const topDocs = rerankWithBm25(query, denseResults, 3);

    console.log("CHAT_RERANK_TOPDOCS", {
      count: topDocs.length,
      docs: topDocs.map((doc) => ({
        id: doc.id,
        text: doc.text,
      })),
    });

    const context = topDocs
      .map((doc) => doc.text)
      .join("\n\n---\n\n");

    console.log("CHAT_CONTEXT", {
      length: context.length,
      value: context,
    });

    const history = formatHistory(userId);

    console.log("CHAT_HISTORY", {
      length: history.length,
      value: history,
    });

    const prompt = `
You are an expert assistant.
Answer ONLY from provided context.
If answer not found, say you don't know.

Conversation History:
${history}

Relevant Context:
${context}

User Question:
${query}
`;

    console.log("CHAT_PROMPT", {
      length: prompt.length,
      value: prompt,
    });

    const answer = await generateAnswer(prompt);

    console.log("CHAT_ANSWER", {
      length: answer.length,
      value: answer,
    });

    addMessage(userId, "user", query);
    addMessage(userId, "assistant", answer);

    console.log("CHAT_MEMORY_WRITE", {
      userId,
    });

    addSemanticCache(queryVector, answer, query);
    setExactCache(query, answer);

    console.log("CHAT_CACHE_WRITE", {
      query,
    });

    return NextResponse.json({
      answer,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
