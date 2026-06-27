-- Lumen — Supabase schema
-- Run this in the Supabase SQL editor to set up the database.

create table if not exists transactions (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid references auth.users(id) on delete cascade,
  source                    text default 'Revolut',
  type                      text,
  product                   text,
  started_date              timestamptz,
  completed_date            timestamptz,
  description               text not null,
  amount                    numeric(12, 2),
  fee                       numeric(12, 2),
  currency                  text,
  state                     text,
  balance_after_transaction numeric(12, 2),
  category                  text default 'Uncategorized',
  is_recurring              boolean default false,
  import_batch_id           uuid,
  created_at                timestamptz default now()
);

create table if not exists import_batches (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  filename        text,
  imported_count  int,
  duplicate_count int,
  created_at      timestamptz default now()
);

alter table transactions
  add constraint fk_import_batch
  foreign key (import_batch_id) references import_batches(id);

create table if not exists category_rules (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  keyword    text not null,
  category   text not null,
  created_at timestamptz default now()
);

-- Row Level Security
alter table transactions    enable row level security;
alter table import_batches  enable row level security;
alter table category_rules  enable row level security;

create policy "user owns transactions"
  on transactions for all
  using (auth.uid() = user_id);

create policy "user owns import_batches"
  on import_batches for all
  using (auth.uid() = user_id);

create policy "user owns category_rules"
  on category_rules for all
  using (auth.uid() = user_id);

-- Portfolio broker imports
create table if not exists broker_imports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  broker      text not null,
  filename    text,
  imported_at timestamptz default now()
);

create table if not exists broker_positions (
  id              uuid primary key default gen_random_uuid(),
  import_id       uuid references broker_imports(id) on delete cascade,
  user_id         uuid references auth.users(id) on delete cascade,
  broker          text not null,
  symbol          text not null,
  isin            text,
  name            text,
  quantity        numeric(18, 8) not null,
  avg_cost        numeric(18, 4) not null,
  statement_price numeric(18, 4),
  yahoo_ticker    text,
  currency        text not null default 'EUR'
);

alter table broker_imports  enable row level security;
alter table broker_positions enable row level security;

create policy "user owns broker_imports"
  on broker_imports for all
  using (auth.uid() = user_id);

create policy "user owns broker_positions"
  on broker_positions for all
  using (auth.uid() = user_id);

-- AI provider settings (Groq key for symbol resolution)
create table if not exists user_ai_settings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  provider   text not null,
  api_key    text not null,
  created_at timestamptz default now(),
  unique (user_id, provider)
);

alter table user_ai_settings enable row level security;

create policy "user owns ai_settings"
  on user_ai_settings for all
  using (auth.uid() = user_id);
