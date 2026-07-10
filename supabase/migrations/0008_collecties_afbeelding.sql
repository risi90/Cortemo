-- Bewerkbare collecties: eigen sfeerbeeld per collectie
alter table cortemo_collections add column if not exists img text not null default '';
