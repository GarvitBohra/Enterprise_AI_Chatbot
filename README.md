# Enterprise AI Chatbot

An enterprise document RAG chatbot built with Next.js, Supabase, and OpenAI.

## What it does

- Upload a document once
- Extract and chunk the text on the server
- Store the file and chunks in Supabase
- Create embeddings with OpenAI
- Ask questions later without re-uploading
- Retrieve the best matching chunks and generate grounded answers

The UI is intentionally simple: upload a file, ask a question, and get the answer.

## Tech Stack

- Next.js App Router
- React
- Supabase Postgres
- Supabase Storage
- `pgvector`
- OpenAI API
- `pdf-parse`
- `mammoth`

## Project Flow

1. **Upload**
   - The file is sent to `/api/upload`
   - The server extracts text from PDF, DOCX, TXT, or Markdown files
   - The original file is stored in Supabase Storage
   - Metadata is saved in the `documents` table

2. **Index**
   - The extracted text is split into chunks
   - Each chunk is embedded with OpenAI
   - The embeddings are saved in the `document_chunks` table

3. **Ask**
   - Your question is embedded with OpenAI
   - Supabase retrieves the most relevant chunks using vector search
   - OpenAI generates an answer from that retrieved context

This is classic RAG: retrieve, augment, generate.

## Setup

### 1. Create the Supabase schema

Run the SQL in [`supabase.sql`](./supabase.sql) in the Supabase SQL editor.

This creates:

- `documents`
- `document_chunks`
- the `match_document_chunks` function
- the `search_document_chunks` function
- the `documents` storage bucket

### 2. Create your environment file

Copy `.env.example` to `.env.local` and fill in your keys:

```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=your_openai_api_key
OPENAI_CHAT_MODEL=gpt-5.5
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

### 3. Install dependencies

```bash
npm install
```

### 4. Run locally

```bash
npm run dev
```

Open the app in your browser and upload a document.

## Supported Files

- PDF
- DOCX
- TXT
- Markdown

## Notes

- The service role key is only used on the server.
- Uploaded documents are stored in Supabase, so you can ask follow-up questions later without uploading again.
- The UI does not show the saved document list; it only focuses on upload and chat.
- If your PDF is scanned or image-based, text extraction may be weak unless you add OCR later.

## Deployment

### Vercel

1. Push the repo to GitHub
2. Import the repo into Vercel
3. Add the same environment variables in Vercel
4. Deploy

### Supabase

Make sure your Supabase project has:

- the SQL schema applied
- a `documents` storage bucket
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Example Usage

- Upload a company policy PDF
- Ask: `What is the data retention policy?`
- Ask: `Who is the topper in this report?`
- Ask follow-up questions without uploading again

## Troubleshooting

- **"Missing Supabase environment variables."**
  - Check `.env.local` or Vercel environment variables

- **"Could not find the function public.match_document_chunks..."**
  - Re-run `supabase.sql` in Supabase

- **No answer or weak answer**
  - Check whether the PDF text is actually extractable
  - Try a text-based PDF instead of a scanned image

## Scripts

- `npm run dev` - start the dev server
- `npm run build` - create a production build
- `npm start` - start the production server
