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
    const { question } = await request.json();

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

    const { data: matches, error } = await supabase.rpc("match_document_chunks", {
      query_embedding: queryEmbedding.data[0].embedding,
      match_count: 5,
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const context = (matches || [])
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
            "You are an enterprise document assistant. Answer only using the provided document context. If the context is insufficient, say so clearly.",
        },
        {
          role: "user",
          content: `Question: ${question}\n\nDocument context:\n${context || "No matching context found."}`,
        },
      ],
    });

    return Response.json({
      answer: completion.output_text || "No answer generated.",
      sources: matches || [],
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Chat failed." },
      { status: 500 },
    );
  }
}
