begin;
create unique index nc_username_case_insensitive on nc_users(lower(username));
alter table nc_documents add column file_path text, add column file_name text;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('nc-documents','nc-documents',false,4194304,array['application/pdf']) on conflict(id) do nothing;
commit;
