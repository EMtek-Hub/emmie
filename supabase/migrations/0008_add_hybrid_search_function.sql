-- Enhanced hybrid search function that combines vector similarity with full-text search
create or replace function hybrid_search(
  query_text text,
  query_embedding vector(1536),
  match_count int default 5,
  agent_id_param uuid default null,
  similarity_threshold float default 0.7,
  rrf_k int default 50
)
returns table (
  chunk_id uuid,
  document_id uuid,
  chunk_index int,
  content text,
  metadata jsonb,
  combined_score float
)
language sql stable
as $$
  with vector_search as (
    select
      dc.id as chunk_id,
      dc.document_id,
      dc.chunk_index,
      dc.content,
      '{}'::jsonb as metadata,
      (1 - (dc.embedding <=> query_embedding)) as similarity_score,
      row_number() over (order by dc.embedding <=> query_embedding) as vector_rank
    from document_chunks dc
    join documents d on dc.document_id = d.id
    where d.status = 'ready'
      and dc.embedding is not null
      and (agent_id_param is null or d.agent_id = agent_id_param)
      and (1 - (dc.embedding <=> query_embedding)) > similarity_threshold
    order by dc.embedding <=> query_embedding
    limit match_count * 2
  ),
  fts_search as (
    select
      dc.id as chunk_id,
      dc.document_id,
      dc.chunk_index,
      dc.content,
      '{}'::jsonb as metadata,
      ts_rank_cd(to_tsvector('english', dc.content), plainto_tsquery('english', query_text)) as fts_score,
      row_number() over (order by ts_rank_cd(to_tsvector('english', dc.content), plainto_tsquery('english', query_text)) desc) as fts_rank
    from document_chunks dc
    join documents d on dc.document_id = d.id
    where d.status = 'ready'
      and (agent_id_param is null or d.agent_id = agent_id_param)
      and to_tsvector('english', dc.content) @@ plainto_tsquery('english', query_text)
    order by ts_rank_cd(to_tsvector('english', dc.content), plainto_tsquery('english', query_text)) desc
    limit match_count * 2
  ),
  combined_results as (
    select
      coalesce(vs.chunk_id, fs.chunk_id) as chunk_id,
      coalesce(vs.document_id, fs.document_id) as document_id,
      coalesce(vs.chunk_index, fs.chunk_index) as chunk_index,
      coalesce(vs.content, fs.content) as content,
      coalesce(vs.metadata, fs.metadata) as metadata,
      coalesce(vs.similarity_score, 0.0) as similarity_score,
      coalesce(fs.fts_score, 0.0) as fts_score,
      coalesce(vs.vector_rank, match_count * 2) as vector_rank,
      coalesce(fs.fts_rank, match_count * 2) as fts_rank
    from vector_search vs
    full outer join fts_search fs on vs.chunk_id = fs.chunk_id
  )
  select
    chunk_id,
    document_id,
    chunk_index,
    content,
    metadata,
    -- Reciprocal Rank Fusion (RRF) scoring
    (1.0 / (rrf_k + vector_rank) + 1.0 / (rrf_k + fts_rank)) as combined_score
  from combined_results
  order by combined_score desc
  limit match_count;
$$;

-- Grant execute permissions
grant execute on function hybrid_search to authenticated;
grant execute on function hybrid_search to service_role;

-- Create an index on document content for better FTS performance
create index if not exists idx_document_chunks_content_fts 
on document_chunks using gin(to_tsvector('english', content));
