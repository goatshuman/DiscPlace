-- DiscPlace marketplace schema. Apply once in the Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'DiscPlace member',
  is_suspended boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null check (char_length(title) between 3 and 64),
  description text not null check (char_length(description) between 12 and 480),
  category text not null,
  product_type text not null default 'blueprint' check (product_type in ('blueprint','setup_service')),
  price_inr integer not null check (price_inr between 1 and 1000000),
  includes jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  is_published boolean not null default false,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.products add column if not exists tags text[] not null default '{}';
create index if not exists products_public_created_idx on public.products (is_published, created_at desc);
create index if not exists products_tags_idx on public.products using gin(tags);

-- Payout identities are only readable by the trusted server role.
create table if not exists public.seller_payouts (
  seller_id uuid primary key references public.profiles(id) on delete cascade,
  razorpay_linked_account_id text unique,
  updated_at timestamptz not null default now()
);
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id),
  seller_id uuid not null references public.profiles(id),
  listing_slug text not null references public.products(slug),
  quantity integer not null default 1 check (quantity between 1 and 20),
  amount_inr integer not null check (amount_inr > 0),
  platform_fee_inr integer not null check (platform_fee_inr >= 0),
  seller_payout_inr integer not null check (seller_payout_inr >= 0),
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded')),
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
-- Upgrade the original starter tables safely if they already exist.
alter table public.orders add column if not exists seller_id uuid references public.profiles(id);
alter table public.orders add column if not exists listing_slug text references public.products(slug);
alter table public.orders add column if not exists quantity integer not null default 1;
alter table public.orders add column if not exists platform_fee_inr integer not null default 0;
alter table public.orders add column if not exists seller_payout_inr integer not null default 0;
alter table public.orders add column if not exists razorpay_payment_id text unique;
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status in ('pending','paid','failed','fulfilled','refunded','cancelled'));
create index if not exists orders_seller_created_idx on public.orders (seller_id, created_at desc);
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  listing_slug text not null references public.products(slug) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 0 and 5),
  review text not null default '' check (char_length(review) <= 800),
  created_at timestamptz not null default now(),
  unique (listing_slug, buyer_id)
);
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_slug text not null references public.products(slug) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (listing_slug, buyer_id),
  check (buyer_id <> seller_id)
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1200),
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_created_idx on public.messages (conversation_id, created_at);
create table if not exists public.payment_events (
  event_id text primary key,
  received_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.seller_payouts enable row level security;
alter table public.orders enable row level security;
alter table public.ratings enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.payment_events enable row level security;

drop policy if exists "Profiles are public" on public.profiles;
create policy "Profiles are public" on public.profiles for select using (true);
drop policy if exists "Published products or own products are visible" on public.products;
create policy "Published products or own products are visible" on public.products for select using (is_published or seller_id = auth.uid());
drop policy if exists "Members can create own safe listings" on public.products;
create policy "Members can create own safe listings" on public.products for insert with check (seller_id = auth.uid() and not coalesce((select is_suspended from public.profiles where id = auth.uid()), true));
drop policy if exists "Members can update own safe listings" on public.products;
create policy "Members can update own safe listings" on public.products for update using (seller_id = auth.uid()) with check (seller_id = auth.uid() and not coalesce((select is_suspended from public.profiles where id = auth.uid()), true));
drop policy if exists "Orders visible to buyer or seller" on public.orders;
create policy "Orders visible to buyer or seller" on public.orders for select using (buyer_id = auth.uid() or seller_id = auth.uid());
drop policy if exists "Published listing ratings are visible" on public.ratings;
create policy "Published listing ratings are visible" on public.ratings for select using (true);
drop policy if exists "Buyers can rate purchased listings" on public.ratings;
create policy "Buyers can rate purchased listings" on public.ratings for insert with check (buyer_id = auth.uid() and not coalesce((select is_suspended from public.profiles where id = auth.uid()), true) and exists (select 1 from public.orders o where o.buyer_id = auth.uid() and o.listing_slug = ratings.listing_slug and o.status = 'paid'));
drop policy if exists "Buyers can update own listing ratings" on public.ratings;
create policy "Buyers can update own listing ratings" on public.ratings for update using (buyer_id = auth.uid() and not coalesce((select is_suspended from public.profiles where id = auth.uid()), true)) with check (buyer_id = auth.uid() and not coalesce((select is_suspended from public.profiles where id = auth.uid()), true));
drop policy if exists "Conversation participants can read" on public.conversations;
create policy "Conversation participants can read" on public.conversations for select using ((buyer_id = auth.uid() or seller_id = auth.uid()) and not coalesce((select is_suspended from public.profiles where id = auth.uid()), true));
drop policy if exists "Conversation participants can read messages" on public.messages;
create policy "Conversation participants can read messages" on public.messages for select using (exists (select 1 from public.conversations c where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid()) and not exists (select 1 from public.profiles p where p.id in (c.buyer_id,c.seller_id) and p.is_suspended)));
drop policy if exists "Participants can send safe messages" on public.messages;
create policy "Participants can send safe messages" on public.messages for insert with check (sender_id = auth.uid() and exists (select 1 from public.conversations c where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())) and not coalesce((select is_suspended from public.profiles where id = auth.uid()), true));
-- seller_payouts, orders INSERT/UPDATE and payment_events are server-role only.

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'DiscPlace member')) on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users for each row execute function public.create_profile_for_new_user();

-- Safety checks are enforced in the database so browser bypasses cannot publish UPI/QR or off-platform payment details.
create or replace function public.guard_off_platform_payments()
returns trigger language plpgsql security definer set search_path = public as $$
declare content_to_check text;
declare offending_seller uuid;
begin
  if tg_table_name = 'products' then
    content_to_check := coalesce(new.title,'') || ' ' || coalesce(new.description,'') || ' ' || array_to_string(coalesce(new.tags,'{}'), ' ');
    offending_seller := new.seller_id;
  else
    content_to_check := coalesce(new.body,'');
    select seller_id into offending_seller from public.conversations where id = new.conversation_id;
  end if;
  if content_to_check ~* '(upi|gpay|google[[:space:]]*pay|phonepe|paytm|bank transfer|send money|payment qr|scan (this|to pay)|https?://|[[:alnum:]._-]{2,}@[[:alpha:]]{2,}|(\+?91[[:space:]-]?)?[6-9][0-9]{9}|(^|[^0-9])[0-9]{9,18}([^0-9]|$))' then
    update public.profiles set is_suspended = true where id in (offending_seller, auth.uid());
    update public.products set is_published = false where seller_id in (offending_seller, auth.uid()) and id is distinct from new.id;
    raise exception 'Off-platform payment details are not allowed. This account has been restricted and its listings unpublished.' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists products_block_payment_handles on public.products;
create trigger products_block_payment_handles before insert or update of title, description, tags on public.products for each row execute function public.guard_off_platform_payments();
drop trigger if exists messages_block_payment_handles on public.messages;
create trigger messages_block_payment_handles before insert on public.messages for each row execute function public.guard_off_platform_payments();

create or replace function public.open_listing_conversation(p_listing_slug text)
returns table(id uuid) language plpgsql security definer set search_path = public as $$
declare current_seller uuid;
declare current_buyer uuid := auth.uid();
declare result_id uuid;
begin
  if current_buyer is null then raise exception 'Sign in to chat.'; end if;
  if exists (select 1 from public.profiles where profiles.id = current_buyer and is_suspended) then raise exception 'This account is restricted.'; end if;
  select seller_id into current_seller from public.products where slug = p_listing_slug and is_published = true;
  if current_seller is null then raise exception 'Listing not found.'; end if;
  if current_seller = current_buyer then raise exception 'You cannot message yourself.'; end if;
  insert into public.conversations (listing_slug,buyer_id,seller_id) values (p_listing_slug,current_buyer,current_seller)
    on conflict (listing_slug,buyer_id) do update set listing_slug = excluded.listing_slug returning conversations.id into result_id;
  return query select result_id;
end;
$$;
grant execute on function public.open_listing_conversation(text) to authenticated;
