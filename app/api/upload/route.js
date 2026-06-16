import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import pdf from "pdf-parse";
import mammoth from "mammoth";

export const runtime = "nodejs";

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
}

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function chunkText(text, size = 1000, overlap = 150) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];

  const chunks = [];
  let start = 0;

  while (start < clean.length) {
    const end = Math.min(clean.length, start + size);
    chunks.push(clean.slice(start, end));
    if (end === clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}

async function extractText(buffer, name, type) {
  const safeName = name.toLowerCase();
  const safeType = type.toLowerCase();

  if (safeType.includes("pdf") || safeName.endsWith(".pdf")) {
    const data = await pdf(buffer);
    return data.text;
  }

  if (safeType.includes("word") || safeName.endsWith(".docx")) {
    const data = await mammoth.extractRawText({ buffer });
    return data.value;
  }

  return buffer.toString("utf-8");
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return Response.json({ error: "No file uploaded." }, { status: 400 });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return Response.json(
        { error: "Missing Supabase environment variables." },
        { status: 500 },
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { error: "Missing OPENAI_API_KEY." },
        { status: 500 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractText(buffer, file.name, file.type || "");
    const chunks = chunkText(text);

    if (chunks.length === 0) {
      return Response.json(
        { error: "Could not extract any text from that file." },
        { status: 400 },
      );
    }

    const supabase = getSupabase();
    const openai = getOpenAI();

    const storagePath = `${Date.now()}-${file.name}`;
    const { error: storageError } = await supabase.storage
      .from("documents")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (storageError) {
      return Response.json({ error: storageError.message }, { status: 500 });
    }

    const { data: documentRow, error: documentError } = await supabase
      .from("documents")
      .insert({
        filename: file.name,
        storage_path: storagePath,
        mime_type: file.type,
        raw_text: text,
      })
      .select("id, filename")
      .single();

    if (documentError) {
      return Response.json({ error: documentError.message }, { status: 500 });
    }

    const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
    const embeddings = await openai.embeddings.create({
      model: embeddingModel,
      input: chunks,
    });

    const chunkRows = chunks.map((content, index) => ({
      document_id: documentRow.id,
      chunk_index: index,
      content,
      embedding: embeddings.data[index].embedding,
    }));

    const { error: chunkError } = await supabase.from("document_chunks").insert(chunkRows);

    if (chunkError) {
      return Response.json({ error: chunkError.message }, { status: 500 });
    }

    return Response.json({
      ok: true,
      document_id: documentRow.id,
      filename: documentRow.filename,
      chunks_indexed: chunkRows.length,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 500 },
    );
  }
}
