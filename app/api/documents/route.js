import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ai } from "@/lib/gemini";
import { supabase } from "@/lib/supabase";
import { checkRateLimit, getRateLimit } from "@/lib/ratelimit";

const BUCKET = "pdfs";

async function normalizeToFilename(message) {
  const trimmed = String(message || "").trim();

  const prompt = `
Convert the user request into this exact storage path format:

subject/SUBJECT_Unit_NUMBER.pdf

Rules:
- subject must be lowercase: flat, ml, fai, befa, stm
- SUBJECT must be uppercase
- NUMBER must be 1 to 5
- Return ONLY the final path
- No explanation

User: "${trimmed}"
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const raw = response.text ?? "";

  const cleaned = String(raw)
    .replace(/```/g, "")
    .replace(/"/g, "")
    .trim();

  const candidate = cleaned.split(/\s+/).filter(Boolean)[0] || "";
  const normalized = candidate.trim();

  const pattern =
    /^(flat|ml|fai|befa|stm)\/(FLAT|ML|FAI|BEFA|STM)_Unit_[1-5]\.pdf$/;

  if (!pattern.test(normalized)) {
    throw new Error("Invalid filename format returned by model");
  }

  return normalized;
}

export async function POST(request) {
  try {
    const { userId } = await auth();

    console.log("DOCS_REQUEST", { userId, timestamp: new Date().toISOString() });

    if (!userId) {
      console.log("DOCS_UNAUTHORIZED_NO_USER");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const message = body?.message;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Missing message" },
        { status: 400 }
      );
    }

    const rateLimit = await checkRateLimit(userId);
    if (!rateLimit.allowed) {
      console.log("DOCS_RATE_LIMIT_BLOCKED", { userId });
      return NextResponse.json(
        {
          error: `Daily limit reached. Try again in ${rateLimit.retryAfterMinutes} minutes.`,
          queryUsed: rateLimit.count,
          queryMax: rateLimit.max
        },
        { status: 429 }
      );
    }

    console.log("DOCS_NORMALIZING_FILENAME", { message });
    const filename = await normalizeToFilename(message);
    console.log("DOCS_FILENAME_NORMALIZED", { filename });

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(filename, 60);

    if (error || !data?.signedUrl) {
      console.error("DOCS_FILE_NOT_FOUND", { filename, error });
      return NextResponse.json(
        { error: "File not found", queryUsed: rateLimit.count, queryMax: rateLimit.max },
        { status: 404 }
      );
    }

    console.log("DOCS_SIGNED_URL_CREATED", { filename });
    return NextResponse.json({
      filename,
      url: data.signedUrl,
      queryUsed: rateLimit.count,
      queryMax: rateLimit.max
    });
  } catch (error) {
    console.error("Docs API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    console.log("GET_DOCS_AUTH", { userId });
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const { count, max } = await getRateLimit(userId);
    return NextResponse.json({ queryUsed: count, queryMax: max });
  } catch (error) {
    console.error("GET_DOCS_ERROR", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
