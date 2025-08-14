-- Add updated_at field to chats table for sorting chat history
alter table chats add column if not exists updated_at timestamptz default now();

-- Create trigger to automatically update updated_at when chats are modified
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger update_chats_updated_at
    before update on chats
    for each row execute procedure update_updated_at_column();

-- Set initial updated_at values for existing chats
update chats set updated_at = created_at where updated_at is null;
