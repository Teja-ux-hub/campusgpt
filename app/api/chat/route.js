import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getIndex } from "@/lib/pinecone";
import { embedQuery, generateAnswer } from "@/lib/gemini";
import { addMessage, formatHistory, getUserMemory } from "@/lib/memory";
import {
  getExactCached,
  setExactCache,
  getSemanticCached,
  addSemanticCache,
} from "@/lib/cache";
import { rerankWithBm25 } from "@/lib/bm25";
import { checkRateLimit, getRateLimit } from "@/lib/ratelimit";

const PINECONE_TOP_K = 100;

async function tavilySearch(query) {
  if (!process.env.TAVILY_API_KEY) {
    console.log("TAVILY_NOT_CONFIGURED");
    return null;
  }
  try {
    console.log("TAVILY_SEARCH_START", { query });
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: "advanced",
        max_results: 2,
        include_answer: true,
      }),
    });
    const data = await response.json();
    console.log("TAVILY_SEARCH_DONE", { results: data.results?.length || 0 });

    const text = (data.results || [])
        .map((r) => `${r.title}: ${r.content}`)
        .join("\n\n")
        .slice(0, 400)

    console.log("TAVILY_CONTEXT_LENGTH", { length: text.length });
    return text || null;
  } catch (err) {
    console.error("TAVILY_SEARCH_FAILED", err.message);
    return null;
  }
}

async function pineconeSearch(queryVector, namespace) {
  const index = getIndex().namespace(namespace);
  let results;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      results = await index.query({
        vector: queryVector,
        topK: PINECONE_TOP_K,
        includeMetadata: true,
      });
      break;
    } catch (err) {
      console.error(`PINECONE_ATTEMPT_${attempt}_FAILED`, err.message);
      if (attempt === 3) throw err;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  return results;
}

function detectNamespace(query) {
  const lower = query.toLowerCase();
  if (
    lower.includes("placement") ||
    lower.includes("company") ||
    lower.includes("drive") ||
    lower.includes("ctc") ||
    lower.includes("package") ||
    lower.includes("job") ||
    lower.includes("hire") ||
    lower.includes("cisco") ||
    lower.includes("tcs") ||
    lower.includes("capgemini") ||
    lower.includes("salesforce") ||
    lower.includes("siemens") ||
    lower.includes("pwc") ||
    lower.includes("lpa") ||
    lower.includes("recruit") ||
    lower.includes("campus drive") ||
    lower.includes("eligible") ||
    lower.includes("criteria") ||
    lower.includes("offer") ||
    lower.includes("selection process") ||
    lower.includes("backlog") ||
    lower.includes("gpa cutoff")
  ) {
    return "placements";
  }
  if (
    lower.includes("library") ||
    lower.includes("book") ||
    lower.includes("issue") ||
    lower.includes("return") ||
    lower.includes("borrow") ||
    lower.includes("fine") ||
    lower.includes("due date") ||
    lower.includes("catalogue") ||
    lower.includes("catalog") ||
    lower.includes("librarian") ||
    lower.includes("reading room") ||
    lower.includes("journal") ||
    lower.includes("magazine") ||
    lower.includes("reference") ||
    lower.includes("renew") ||
    lower.includes("overdue")
  ) {
    return "library";
  }
  return "__default__";
}

function isAgenticQuery(query) {
  const lower = query.toLowerCase();
  return (
    lower.includes("tips") ||
    lower.includes("prepare") ||
    lower.includes("preparation") ||
    lower.includes("interview") ||
    lower.includes("questions") ||
    lower.includes("crack") ||
    lower.includes("kaise") ||
    lower.includes("kya kru") ||
    lower.includes("how to") ||
    lower.includes("guide") ||
    lower.includes("roadmap") ||
    lower.includes("syllabus") ||
    lower.includes("strategy") ||
    lower.includes("previous year") ||
    lower.includes("experience") ||
    lower.includes("hiring") ||
    lower.includes("trend") ||
    lower.includes("roles") ||
    lower.includes("salary") ||
    lower.includes("review")
  );
}

function rewriteQuery(query, userId) {
  const pronouns = ['his', 'her', 'their', 'he', 'she', 'they', 'him'];
  const lower = query.toLowerCase();
  const hasPronouns = pronouns.some(p => lower.includes(p));
  if (!hasPronouns) return query;
  const history = getUserMemory(userId);
  if (!history.length) return query;
  const lastUserMsg = [...history].reverse().find(m => m.role === 'user');
  if (!lastUserMsg) return query;
  const nameMatch = lastUserMsg.content.match(/[A-Z][a-z]+ [A-Z][a-z]+/);
  if (!nameMatch) return query;
  return `${nameMatch[0]} ${query}`;
}

export async function GET() {
  try {
    const { userId } = await auth();
    console.log("GET_CHAT_AUTH", { userId });
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const { count, max } = await getRateLimit(userId);
    return NextResponse.json({ queryUsed: count, queryMax: max });
  } catch (error) {
    console.error("GET_CHAT_ERROR", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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

    const rateLimit = await checkRateLimit(userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Daily limit reached. Try again in ${rateLimit.retryAfterMinutes} minutes.`,
          queryUsed: rateLimit.count,
          queryMax: rateLimit.max
        },
        { status: 429 }
      );
    }

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    const exactCached = getExactCached(query);
    if (exactCached) {
      console.log("CHAT_CACHE_HIT_EXACT", { query });
      return NextResponse.json({ fromCache: "exact", answer: exactCached, queryUsed: rateLimit.count, queryMax: rateLimit.max });
    }
    console.log("CHAT_CACHE_MISS_EXACT", { query });

    const rewrittenQuery = rewriteQuery(query, userId);
    console.log("QUERY_REWRITTEN", { original: query, rewritten: rewrittenQuery });

    const queryVector = await embedQuery(rewrittenQuery);
    console.log("CHAT_EMBEDDING", { length: queryVector?.length });

    const semanticCached = getSemanticCached(queryVector);
    if (semanticCached) {
      console.log("CHAT_CACHE_HIT_SEMANTIC", { query });
      return NextResponse.json({ fromCache: "semantic", answer: semanticCached, queryUsed: rateLimit.count, queryMax: rateLimit.max });
    }
    console.log("CHAT_CACHE_MISS_SEMANTIC", { query });

    const namespace = detectNamespace(query);
    const isPlacement = namespace === "placements";
    const agentic = isPlacement && isAgenticQuery(query);

    console.log("ROUTING_DECISION", { namespace, isPlacement, agentic });

    if (agentic) {
      console.log("AGENTIC_PATH_START");

      const tavilyQuery = `${query} campus placement India 2025`;

      const [webRaw, pineconeResults] = await Promise.all([
        tavilySearch(tavilyQuery),
        pineconeSearch(queryVector, namespace),
      ]);

      console.log("AGENTIC_PARALLEL_DONE", {
        tavilyGotData: !!webRaw,
        pineconeMatches: pineconeResults?.matches?.length || 0,
      });

      let ragContext = "";
      if (pineconeResults?.matches?.length) {
        const denseResults = pineconeResults.matches.map((match, i) => ({
          id: match.id,
          rank: i + 1,
          text: match.metadata?.text || "",
        }));
        const topDocs = rerankWithBm25(rewrittenQuery, denseResults, 2);
        ragContext = topDocs.map((doc) => doc.text).join("\n\n---\n\n");
        console.log("AGENTIC_RAG_CONTEXT", {
          chunks: topDocs.length,
          length: ragContext.length,
        });
      }

      const webContext = webRaw || "";
      console.log("AGENTIC_WEB_CONTEXT", { length: webContext.length });

      const history = formatHistory(userId);

      const prompt = `
You are CampusGPT, a placement assistant for CMRTC Hyderabad students.
Answer the student's question using BOTH college data AND web search results.

Rules:
- Format answer in clear bullet points
- Maximum 5 bullets
- Each bullet must be specific and actionable
- Total answer must be under 200 words combined
- Use college data for eligibility, dates, criteria
- Use web data for interview tips, roles, preparation

Conversation History:
${history}

📋 COLLEGE PLACEMENT DATA (CMRTC):
${ragContext || "No college data found."}

🌐 WEB SEARCH RESULTS:
${webContext || "No web data found."}

Student Question:
${query}
`;

      console.log("AGENTIC_PROMPT_READY", { length: prompt.length });

      const answer = await generateAnswer(prompt);

      console.log("CHAT_ANSWER", { length: answer.length, value: answer });

      addMessage(userId, "user", query);
      addMessage(userId, "assistant", answer);
      addSemanticCache(queryVector, answer, query);
      setExactCache(query, answer);

      console.log("CHAT_CACHE_WRITE", { query });

      return NextResponse.json({ answer, agentic: true, queryUsed: rateLimit.count, queryMax: rateLimit.max });
    }

    console.log("RAG_PATH_START", { namespace });

    const pineconeResults = await pineconeSearch(queryVector, namespace);

    console.log("CHAT_PINECONE_RESULTS", {
      count: pineconeResults?.matches?.length || 0,
    });

    if (!pineconeResults?.matches?.length) {
      return NextResponse.json({
        answer: "I could not find relevant information in the documents.",
        queryUsed: rateLimit.count,
        queryMax: rateLimit.max
      });
    }

    const denseResults = pineconeResults.matches.map((match, i) => ({
      id: match.id,
      rank: i + 1,
      text: match.metadata?.text || "",
    }));

    const topDocs = rerankWithBm25(rewrittenQuery, denseResults, 3);

    console.log("CHAT_RERANK_TOPDOCS", {
      count: topDocs.length,
      docs: topDocs.map((doc) => ({ id: doc.id, text: doc.text })),
    });

    const context = topDocs.map((doc) => doc.text).join("\n\n---\n\n");

    console.log("CHAT_CONTEXT", { length: context.length, value: context });

    const history = formatHistory(userId);
    console.log("CHAT_HISTORY", { length: history.length });

    const prompt = `
You are CampusGPT assistant for CMRTC Hyderabad.
Answer ONLY from provided context.
If answer not found, say you don't know.

Conversation History:
${history}

Relevant Context:
${context}

User Question:
${query}
`;

    console.log("CHAT_PROMPT", { length: prompt.length });

    const answer = await generateAnswer(prompt);

    console.log("CHAT_ANSWER", { length: answer.length, value: answer });

    addMessage(userId, "user", query);
    addMessage(userId, "assistant", answer);
    addSemanticCache(queryVector, answer, query);
    setExactCache(query, answer);

    console.log("CHAT_CACHE_WRITE", { query });

    return NextResponse.json({ answer, agentic: false, queryUsed: rateLimit.count, queryMax: rateLimit.max });

  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
