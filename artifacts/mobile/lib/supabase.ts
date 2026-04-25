import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

console.log("[Supabase] URL configured:", supabaseUrl ? `✓ ${supabaseUrl}` : "✗ Missing");
console.log("[Supabase] Anon key configured:", supabaseAnonKey ? `✓ (${supabaseAnonKey.length} chars)` : "✗ Missing");

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS !== "web" ? AsyncStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web",
    flowType: "pkce",
  },
});

/*
  REQUIRED DATABASE TABLES — Run this SQL in your Supabase dashboard:

  -- profiles
  create table public.profiles (
    id uuid references auth.users on delete cascade not null primary key,
    full_name text,
    avatar_url text,
    bio text,
    favorite_verse text,
    deletion_requested_at timestamptz default null,
    updated_at timestamptz default now()
  );
  alter table public.profiles enable row level security;
  create policy "Users can read all profiles" on public.profiles for select using (true);
  create policy "Users manage own profile" on public.profiles for insert with check (auth.uid() = id);
  create policy "Users update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
  create policy "Users delete own profile" on public.profiles for delete using (auth.uid() = id);

  -- Auto-create profile on signup (IMPORTANT — run this too)
  create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer set search_path = public
  as $
  begin
    insert into public.profiles (id, full_name, updated_at)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      now()
    )
    on conflict (id) do nothing;
    return new;
  end;
  $;

  drop trigger if exists on_auth_user_created on auth.users;
  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

  -- notification_preferences
  create table public.notification_preferences (
    user_id uuid references auth.users on delete cascade not null primary key,
    push_notifications boolean default true,
    email_digest boolean default false,
    whatsapp_alerts boolean default true,
    daily_verse boolean default true,
    prayer_streak boolean default true,
    updated_at timestamptz default now()
  );
  alter table public.notification_preferences enable row level security;
  create policy "Users manage own prefs" on public.notification_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

  -- prayer_stats
  create table public.prayer_stats (
    user_id uuid references auth.users on delete cascade not null primary key,
    total_prayers integer default 0,
    current_streak integer default 0,
    longest_streak integer default 0,
    last_prayer_date date,
    updated_at timestamptz default now()
  );
  alter table public.prayer_stats enable row level security;
  create policy "Users manage own stats" on public.prayer_stats for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

  -- If profiles table already exists, add missing column:
  -- alter table public.profiles add column if not exists deletion_requested_at timestamptz default null;

  -- ============================================================
  -- OTP CODES TABLE — Required for Brevo email verification:
  -- ============================================================

  -- otp_codes (custom email verification via Brevo)
  create table public.otp_codes (
    id uuid default gen_random_uuid() primary key,
    email text not null,
    code text not null,
    expires_at timestamptz not null,
    used boolean default false,
    created_at timestamptz default now()
  );
  create index otp_codes_email_idx on public.otp_codes(email);

  -- email_verified column on profiles
  alter table public.profiles add column if not exists email_verified boolean default false;

  -- ============================================================
  -- CHAT TABLES — Run this SQL in your Supabase dashboard:
  -- ============================================================

  -- conversations
  create table public.conversations (
    id uuid default gen_random_uuid() primary key,
    type text default 'dm' check (type in ('dm', 'group')),
    name text,
    updated_at timestamptz default now(),
    created_at timestamptz default now()
  );
  alter table public.conversations enable row level security;
  create policy "Participants can read conversations" on public.conversations
    for select using (
      exists (
        select 1 from public.conversation_participants
        where conversation_id = conversations.id and user_id = auth.uid()
      )
    );
  create policy "Authenticated users can create conversations" on public.conversations
    for insert with check (auth.role() = 'authenticated');
  create policy "Participants can update conversations" on public.conversations
    for update using (
      exists (
        select 1 from public.conversation_participants
        where conversation_id = conversations.id and user_id = auth.uid()
      )
    );

  -- conversation_participants
  create table public.conversation_participants (
    conversation_id uuid references public.conversations on delete cascade not null,
    user_id uuid references auth.users on delete cascade not null,
    is_muted boolean default false,
    last_read_at timestamptz,
    joined_at timestamptz default now(),
    primary key (conversation_id, user_id)
  );
  alter table public.conversation_participants enable row level security;
  create policy "Users can read own participant rows" on public.conversation_participants
    for select using (auth.uid() = user_id or
      exists (
        select 1 from public.conversation_participants cp2
        where cp2.conversation_id = conversation_participants.conversation_id and cp2.user_id = auth.uid()
      )
    );
  create policy "Authenticated users can insert participants" on public.conversation_participants
    for insert with check (auth.role() = 'authenticated');
  create policy "Users can update own participant row" on public.conversation_participants
    for update using (auth.uid() = user_id);

  -- messages
  create table public.messages (
    id uuid default gen_random_uuid() primary key,
    conversation_id uuid references public.conversations on delete cascade not null,
    sender_id uuid references auth.users on delete set null,
    content text not null,
    type text default 'text' check (type in ('text', 'prayer_share')),
    prayer_request_content text,
    is_edited boolean default false,
    edited_at timestamptz,
    deleted_for_everyone boolean default false,
    deleted_for_sender boolean default false,
    created_at timestamptz default now()
  );
  alter table public.messages enable row level security;
  create policy "Participants can read messages" on public.messages
    for select using (
      exists (
        select 1 from public.conversation_participants
        where conversation_id = messages.conversation_id and user_id = auth.uid()
      )
    );
  create policy "Participants can send messages" on public.messages
    for insert with check (
      auth.uid() = sender_id and
      exists (
        select 1 from public.conversation_participants
        where conversation_id = messages.conversation_id and user_id = auth.uid()
      )
    );
  create policy "Senders can update own messages" on public.messages
    for update using (auth.uid() = sender_id);

  -- message_reactions
  create table public.message_reactions (
    id uuid default gen_random_uuid() primary key,
    message_id uuid references public.messages on delete cascade not null,
    user_id uuid references auth.users on delete cascade not null,
    reaction_type text check (reaction_type in ('pray', 'amen', 'support')) not null,
    created_at timestamptz default now(),
    unique(message_id, user_id)
  );
  alter table public.message_reactions enable row level security;
  create policy "Participants can read reactions" on public.message_reactions
    for select using (
      exists (
        select 1 from public.messages m
        join public.conversation_participants cp on cp.conversation_id = m.conversation_id
        where m.id = message_reactions.message_id and cp.user_id = auth.uid()
      )
    );
  create policy "Authenticated users can react" on public.message_reactions
    for insert with check (auth.uid() = user_id);
  create policy "Users can remove own reactions" on public.message_reactions
    for delete using (auth.uid() = user_id);

  -- friend_requests
  create table public.friend_requests (
    id uuid default gen_random_uuid() primary key,
    sender_id uuid references auth.users on delete cascade not null,
    receiver_id uuid references auth.users on delete cascade not null,
    status text default 'pending' check (status in ('pending', 'accepted', 'declined')),
    created_at timestamptz default now(),
    unique(sender_id, receiver_id)
  );
  alter table public.friend_requests enable row level security;
  create policy "Users can read own requests" on public.friend_requests
    for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
  create policy "Authenticated users can send requests" on public.friend_requests
    for insert with check (auth.uid() = sender_id);
  create policy "Receivers can update status" on public.friend_requests
    for update using (auth.uid() = receiver_id);
  create policy "Users can delete own sent requests" on public.friend_requests
    for delete using (auth.uid() = sender_id);

  -- blocked_users
  create table public.blocked_users (
    blocker_id uuid references auth.users on delete cascade not null,
    blocked_id uuid references auth.users on delete cascade not null,
    created_at timestamptz default now(),
    primary key (blocker_id, blocked_id)
  );
  alter table public.blocked_users enable row level security;
  create policy "Users manage own blocks" on public.blocked_users
    for all using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);

  -- Enable realtime for chat tables:
  -- alter publication supabase_realtime add table public.messages;
  -- alter publication supabase_realtime add table public.message_reactions;
*/
