import BM25 from "wink-bm25-text-search";

export function rrfFusion(denseResults, sparseResults, k = 60) {
  const scores = {};

  denseResults.forEach((item) => {
    scores[item.id] = (scores[item.id] || 0) + 1 / (k + item.rank);
  });

  sparseResults.forEach((item) => {
    scores[item.id] = (scores[item.id] || 0) + 1 / (k + item.rank);
  });

  return Object.entries(scores)
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);
}

export function rerankWithBm25(query, denseResults, topK = 3) {
  console.log("BM25_START", {
    query,
    denseCount: denseResults.length,
  });

  if (!denseResults.length) {
    console.log("BM25_NO_DENSE_RESULTS");
    return [];
  }

  let bm25;
  try {
    bm25 = BM25();

    console.log("BM25_DEFINE_CONFIG");
    bm25.defineConfig({ fldWeights: { body: 1 } });

    denseResults.forEach((doc, i) => {
      const textPreview = (doc.text || "").slice(0, 200);
      console.log("BM25_ADD_DOC", { index: i, id: doc.id, preview: textPreview });
      bm25.addDoc({ body: doc.text || "" }, i);
    });

    console.log("BM25_CONSOLIDATE");
    bm25.consolidate();

    console.log("BM25_SEARCH_START", { query });
    const sparseSearch = bm25.search(query) || [];
    console.log("BM25_SEARCH_RAW_RESULTS", sparseSearch);

    const sparseResults = sparseSearch
      .map((result, index) => {
        const denseIndex = result[0];
        const score = result[1];
        const id = denseResults[denseIndex]?.id;
        const mapped = id
          ? { id, rank: index + 1, score }
          : null;

        console.log("BM25_SPARSE_MAPPED", {
          denseIndex,
          id,
          rank: index + 1,
          score,
        });

        return mapped;
      })
      .filter(Boolean);

    console.log("BM25_DENSE_FOR_RRF", denseResults.map((d) => ({
      id: d.id,
      rank: d.rank,
    })));

    console.log("BM25_SPARSE_FOR_RRF", sparseResults.map((s) => ({
      id: s.id,
      rank: s.rank,
      score: s.score,
    })));

    const fused = rrfFusion(
      denseResults,
      sparseResults.map((s) => ({ id: s.id, rank: s.rank }))
    );

    console.log("BM25_RRF_SCORES", fused);

    let top = fused.slice(0, topK);

    const sparseWinnerId = sparseResults[0]?.id;
    if (sparseWinnerId) {
      const alreadyInTop = top.find((r) => r.id === sparseWinnerId);
      if (!alreadyInTop) {
        const sparseWinnerInFused = fused.find((r) => r.id === sparseWinnerId);
        if (sparseWinnerInFused) {
          top[topK - 1] = sparseWinnerInFused;
          console.log("BM25_SPARSE_WINNER_FORCED", {
            id: sparseWinnerId,
            replacedSlot: topK - 1,
          });
        }
      }
    }

    console.log("BM25_FINAL_RANKING", top);

    const topDocs = top
      .map((r) => {
        const doc = denseResults.find((d) => d.id === r.id);
        if (!doc) return null;
        console.log("BM25_TOP_DOC", {
          id: doc.id,
          rrfScore: r.score,
          text: doc.text,
        });
        return doc;
      })
      .filter(Boolean);

    return topDocs;
  } catch (error) {
    console.error("BM25_ERROR", error);
    console.log("BM25_FALLBACK_DENSE_ONLY", {
      topK,
      denseCount: denseResults.length,
    });
    return denseResults.slice(0, topK);
  }
}
