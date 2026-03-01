import { NextResponse } from "next/server";
import { ai } from "@/lib/gemini";
import { supabase } from "@/lib/supabase";

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
    const body = await request.json();
    const message = body?.message;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Missing message" },
        { status: 400 }
      );
    }

    const filename = await normalizeToFilename(message);

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(filename, 60);

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      filename,
      url: data.signedUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}