-- Distingue competiciones entre torneo (bracket eliminatorio) y liga (colección separada)
alter table tournaments
  add column if not exists kind text not null default 'tournament'
  check (kind in ('tournament', 'league'));

create index if not exists tournaments_kind_idx on tournaments (kind);
