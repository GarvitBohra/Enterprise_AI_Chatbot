# Enterprise Document Chat

Weekend-friendly starter for an internal document RAG chatbot.

## Stack

- Next.js
- Supabase Postgres
- Supabase Storage
- OpenAI API
- `pgvector`

## Setup

1. Create the Supabase tables by running `supabase.sql`.
2. Create a Storage bucket named `documents`.
3. Copy `.env.example` to `.env.local` and fill in the values.
4. Install dependencies.
5. Run `npm run dev`.

## Notes

- This starter uses a Supabase service role key on the server only.
- The upload route currently supports PDF, DOCX, TXT, and Markdown.
- If you want per-user auth next, add Supabase Auth and filter documents by user.
