create extension if not exists pgcrypto;
create extension if not exists vector;

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  storage_path text not null,
  mime_type text,
  raw_text text,
  created_at timestamptz not null default now()
);

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);

create index if not exists document_chunks_document_id_idx on public.document_chunks(document_id);
create index if not exists document_chunks_embedding_idx
on public.document_chunks
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

create or replace function public.match_document_chunks(
  query_embedding vector(1536),
  match_count int default 5,
  target_document_id uuid default null
)
returns table (
  id uuid,
  document_id uuid,
  chunk_index int,
  content text,
  filename text,
  similarity float
)
language sql
stable
as $$
  select
    dc.id,
    dc.document_id,
    dc.chunk_index,
    dc.content,
    d.filename,
    1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  join public.documents d on d.id = dc.document_id
  where target_document_id is null or dc.document_id = target_document_id
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;

create or replace function public.search_document_chunks(
  search_text text,
  match_count int default 5,
  target_document_id uuid default null
)
returns table (
  id uuid,
  document_id uuid,
  chunk_index int,
  content text,
  filename text,
  similarity float
)
language sql
stable
as $$
  select
    dc.id,
    dc.document_id,
    dc.chunk_index,
    dc.content,
    d.filename,
    ts_rank(
      to_tsvector('english', coalesce(dc.content, '') || ' ' || coalesce(d.filename, '') || ' ' || coalesce(d.raw_text, '')),
      websearch_to_tsquery('english', search_text)
    ) as similarity
  from public.document_chunks dc
  join public.documents d on d.id = dc.document_id
  where (target_document_id is null or dc.document_id = target_document_id)
    and to_tsvector('english', coalesce(dc.content, '') || ' ' || coalesce(d.filename, '') || ' ' || coalesce(d.raw_text, ''))
        @@ websearch_to_tsquery('english', search_text)
  order by similarity desc
  limit match_count;
$$;

alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;

drop policy if exists "documents service role only" on public.documents;
drop policy if exists "document_chunks service role only" on public.document_chunks;

create policy "documents service role only"
on public.documents
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "document_chunks service role only"
on public.document_chunks
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
