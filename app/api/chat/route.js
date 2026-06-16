import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

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

export async function POST(request) {
  try {
    const { question, documentId } = await request.json();

    if (!question?.trim()) {
      return Response.json({ error: "Question is required." }, { status: 400 });
    }

    const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
    const chatModel = process.env.OPENAI_CHAT_MODEL || "gpt-5.5";
    const supabase = getSupabase();
    const openai = getOpenAI();

    const queryEmbedding = await openai.embeddings.create({
      model: embeddingModel,
      input: question,
    });

    const { data: vectorMatches, error: vectorError } = await supabase.rpc("match_document_chunks", {
      query_embedding: queryEmbedding.data[0].embedding,
      match_count: 8,
      target_document_id: documentId || null,
    });

    if (vectorError) {
      return Response.json({ error: vectorError.message }, { status: 500 });
    }

    const keywordMatches = await supabase.rpc("search_document_chunks", {
      search_text: question,
      match_count: 8,
      target_document_id: documentId || null,
    });

    if (keywordMatches.error) {
      return Response.json({ error: keywordMatches.error.message }, { status: 500 });
    }

    const combined = new Map();
    for (const match of [...(vectorMatches || []), ...(keywordMatches.data || [])]) {
      if (!combined.has(match.id)) {
        combined.set(match.id, match);
      }
    }

    const matches = Array.from(combined.values()).slice(0, 8);

    const context = matches
      .map(
        (match, index) =>
          `[${index + 1}] File: ${match.filename}\nChunk: ${match.content}`,
      )
      .join("\n\n");

    const completion = await openai.responses.create({
      model: chatModel,
      input: [
        {
          role: "system",
          content:
            "You are an enterprise document assistant. Use the provided document context to answer clearly and directly. If the context only partially answers the question, say what is known and what is missing instead of refusing too early.",
        },
        {
          role: "user",
          content: `Question: ${question}\n\nDocument context:\n${context || "No matching context found."}`,
        },
      ],
    });

    return Response.json({
      answer: completion.output_text || "No answer generated.",
      sources: matches,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Chat failed." },
      { status: 500 },
    );
  }
}
