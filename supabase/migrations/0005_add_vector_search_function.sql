-- Enable the pgvector extension if not already enabled
create extension if not exists vector;

-- Function to match document chunks using vector similarity
create or replace function match_document_chunks(
  agent_id_param uuid,
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 5
)
returns table (
  id uuid,
  document_id uuid,
  chunk_index int,
  content text,
  similarity float
)
language sql stable
as $$
  select
    dc.id,
    dc.document_id,
    dc.chunk_index,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  join documents d on dc.document_id = d.id
  where d.agent_id = agent_id_param
    and d.status = 'ready'
    and dc.embedding is not null
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;

-- Grant execute permissions
grant execute on function match_document_chunks to authenticated;
grant execute on function match_document_chunks to service_role;
