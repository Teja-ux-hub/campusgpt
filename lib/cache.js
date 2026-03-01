const MAX_CACHE_SIZE = 500;
const CACHE_TTL_MS = 15 * 60 * 1000;
const SIMILARITY_THRESHOLD = 0.92;

const exactCache = new Map();
const semanticCache = [];

function normalizeQuery(q) {
  return q.toLowerCase().trim();
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function getExactCached(query) {
  const key = normalizeQuery(query);
  const now = Date.now();

  if (!exactCache.has(key)) return null;

  const cached = exactCache.get(key);
  if (now - cached.timestamp > CACHE_TTL_MS) {
    exactCache.delete(key);
    return null;
  }

  return cached.result;
}

export function setExactCache(query, result) {
  const key = normalizeQuery(query);

  if (exactCache.size >= MAX_CACHE_SIZE) {
    const firstKey = exactCache.keys().next().value;
    if (firstKey) exactCache.delete(firstKey);
  }

  exactCache.set(key, {
    result,
    timestamp: Date.now(),
  });
}

export function getSemanticCached(embedding) {
  if (!semanticCache.length) {
    console.log("SEM_CACHE_EMPTY");
    return null;
  }

  let best = null;

  for (const item of semanticCache) {
    const similarity = cosineSimilarity(embedding, item.embedding);
    console.log("SEM_CACHE_COMPARE", {
      similarity,
      threshold: SIMILARITY_THRESHOLD,
      normalizedQuery: item.normalizedQuery,
    });
    if (similarity > SIMILARITY_THRESHOLD) {
      if (!best || similarity > best.similarity) {
        best = { similarity, result: item.result };
      }
    }
  }

  if (best) {
    console.log("SEM_CACHE_HIT", {
      similarity: best.similarity,
      threshold: SIMILARITY_THRESHOLD,
    });
    return best.result;
  }

  console.log("SEM_CACHE_MISS");
  return null;
}

export function addSemanticCache(embedding, result, query) {
  if (semanticCache.length >= MAX_CACHE_SIZE) {
    semanticCache.shift();
  }

  const normalizedQuery = query ? normalizeQuery(query) : null;

  semanticCache.push({
    embedding,
    result,
    timestamp: Date.now(),
    normalizedQuery,
  });
  console.log("SEM_CACHE_ADDED", {
    normalizedQuery,
    size: semanticCache.length,
  });
}
