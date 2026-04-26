import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const rawSupabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

function normalizeSupabaseUrl(input: string): string {
  if (!input) return "";
  let url = input;
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url.replace(/\/+$/, "").replace(/\/(rest|auth|storage|realtime)\/v\d+.*$/i, "");
  }
}

const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl);

if (rawSupabaseUrl && rawSupabaseUrl !== supabaseUrl) {
  console.warn(
    `[Supabase] EXPO_PUBLIC_SUPABASE_URL contained a path ("${rawSupabaseUrl}"). ` +
    `Using normalized base URL "${supabaseUrl}" instead. Please update the secret to just the project URL.`
  );
}

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

export const mailer = {
  host: "smtp-relay.brevo.com",
  port: 587,
  user: "892523002@smtp-brevo.com",
  fromEmail: "hello@prayerspace.app",
};

/*
  REQUIRED DATABASE TABLES — Run this SQL in your Supabase dashboard:

  -- profiles
  create table public.profiles (
    id uuid references auth.users on delete cascade not null primary key,
    full_name text,
    avatar_url text,
    bio text,
    favorite_verse text,
    date_of_birth date,
    deletion_requested_at timestamptz default null,
    updated_at timestamptz default now()
  );
  alter table public.profiles enable row level security;
  create policy "Users can read all profiles" on public.profiles for select using (true);
  create policy "Users manage own profile" on public.profiles for insert with check (auth.uid() = id);
  create policy "Users update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
  create policy "Users delete own profile" on public.profiles for delete using (auth.uid() = id);

  -- If profiles table already exists, add the DOB column:
  -- alter table public.profiles add column if not exists date_of_birth date;

  -- Auto-create profile on signup (IMPORTANT — run this too)
  create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer set search_path = public
  as $
  declare
    dob_text text;
    dob_value date;
  begin
    dob_text := new.raw_user_meta_data->>'date_of_birth';
    begin
      dob_value := nullif(dob_text, '')::date;
    exception when others then
      dob_value := null;
    end;

    insert into public.profiles (id, full_name, date_of_birth, updated_at)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      dob_value,
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

  -- ============================================================
  -- AGE VERIFICATION (server-side, authoritative)
  -- Rejects ANY auth.users insert without a valid date_of_birth in
  -- raw_user_meta_data, or whose age computes to less than 13.
  -- This trigger is the source of truth — the frontend check is
  -- only there for UX. Anyone calling supabase.auth.signUp must
  -- include date_of_birth in options.data, or signup fails.
  --
  -- IMPORTANT — admin-created users (service role) MUST also include
  -- a valid date_of_birth in user_metadata when calling
  -- /auth/v1/admin/users (POST). The current admin route in this
  -- app (/api/admin/delete-users) only deletes users, so it is not
  -- affected. If you add an admin user-creation endpoint later, be
  -- sure to pass user_metadata: { full_name, date_of_birth } where
  -- date_of_birth is an ISO yyyy-mm-dd string for someone aged 13+.
  -- ============================================================
  create or replace function public.enforce_min_signup_age()
  returns trigger
  language plpgsql
  security definer set search_path = public
  as $
  declare
    dob_text text;
    dob_value date;
    age_years integer;
    auth_provider text;
  begin
    -- OAuth signups (e.g. Google, Apple) do not pass DOB through the
    -- /signup endpoint — the user is created by the OAuth callback.
    -- Skip the trigger for non-email providers; DOB must be collected
    -- in a post-signup completion screen for those users.
    auth_provider := coalesce(new.raw_app_meta_data->>'provider', 'email');
    if auth_provider <> 'email' then
      return new;
    end if;

    dob_text := new.raw_user_meta_data->>'date_of_birth';

    if dob_text is null or dob_text = '' then
      raise exception 'dob_required: Date of birth is required to create an account.'
        using errcode = 'P0001';
    end if;

    begin
      dob_value := dob_text::date;
    exception when others then
      raise exception 'dob_required: Date of birth is invalid.'
        using errcode = 'P0001';
    end;

    if dob_value > current_date then
      raise exception 'dob_required: Date of birth is invalid.'
        using errcode = 'P0001';
    end if;

    age_years := extract(year from age(current_date, dob_value))::int;
    if age_years < 13 then
      raise exception 'age_verification_failed: You must be at least 13 years old to create an account.'
        using errcode = 'P0001';
    end if;

    return new;
  end;
  $;

  drop trigger if exists on_auth_user_age_check on auth.users;
  create trigger on_auth_user_age_check
    before insert on auth.users
    for each row execute procedure public.enforce_min_signup_age();

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
  -- EMAIL CONFIRMATION (6-digit OTP):
  -- Handled natively by Supabase Auth — no custom tables needed.
  -- In Supabase Dashboard:
  --   1. Authentication → Providers → Email: keep "Confirm email" enabled.
  --   2. Authentication → Email Templates → Confirm signup: ensure the
  --      template body includes the 6-digit token via {{ .Token }}, e.g.
  --      "Your Prayer Space verification code is {{ .Token }}".
  -- ============================================================

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

  -- =================================================================
  -- PRAYER REQUESTS (date-based reminders)
  -- =================================================================

  -- prayer_requests
  create table public.prayer_requests (
    id uuid default gen_random_uuid() primary key,
    author_id uuid references auth.users on delete cascade not null,
    content text not null,
    is_anonymous boolean default false,
    is_urgent boolean default false,
    is_time_sensitive boolean default false,
    audience text default 'everyone' check (audience in ('everyone', 'friends', 'private')),
    tags text[] default '{}',
    image_url text,
    -- date-based reminder fields
    event_date date,
    event_time time,
    has_prayer_date boolean generated always as (event_date is not null) stored,
    reminder_sent boolean default false,
    follow_up_prompt_shown boolean default false,
    -- status lifecycle
    status text default 'ongoing' check (status in ('ongoing', 'answered', 'still_need_prayer', 'archived')),
    prayer_count integer default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
  alter table public.prayer_requests enable row level security;
  create policy "Authors can manage own prayer requests" on public.prayer_requests
    for all using (auth.uid() = author_id) with check (auth.uid() = author_id);
  create policy "Anyone can view public prayer requests" on public.prayer_requests
    for select using (audience = 'everyone' and status != 'archived');

  -- prayer_engagements — tracks who prayed for a request
  create table public.prayer_engagements (
    id uuid default gen_random_uuid() primary key,
    request_id uuid references public.prayer_requests on delete cascade not null,
    user_id uuid references auth.users on delete cascade not null,
    created_at timestamptz default now(),
    unique(request_id, user_id)
  );
  alter table public.prayer_engagements enable row level security;
  create policy "Authenticated users can log prayer engagement" on public.prayer_engagements
    for insert with check (auth.uid() = user_id);
  create policy "Users can view engagements" on public.prayer_engagements
    for select using (true);
  create policy "Users remove own engagement" on public.prayer_engagements
    for delete using (auth.uid() = user_id);

  -- prayer_request_updates — status updates / follow-up posts
  create table public.prayer_request_updates (
    id uuid default gen_random_uuid() primary key,
    request_id uuid references public.prayer_requests on delete cascade not null,
    author_id uuid references auth.users on delete cascade not null,
    content text not null,
    follow_up_option text check (follow_up_option in ('share_update', 'still_need_prayer', 'mark_answered', 'archive')),
    created_at timestamptz default now()
  );
  alter table public.prayer_request_updates enable row level security;
  create policy "Authors can post updates" on public.prayer_request_updates
    for insert with check (
      auth.uid() = author_id and
      exists (
        select 1 from public.prayer_requests
        where id = request_id and author_id = auth.uid()
      )
    );
  create policy "Anyone can view updates on visible requests" on public.prayer_request_updates
    for select using (
      exists (
        select 1 from public.prayer_requests
        where id = request_id and audience = 'everyone'
      )
    );

  -- Trigger: increment/decrement prayer_count on prayer_requests automatically
  create or replace function public.update_prayer_count()
  returns trigger language plpgsql as $$
  begin
    if tg_op = 'INSERT' then
      update public.prayer_requests set prayer_count = prayer_count + 1 where id = new.request_id;
    elsif tg_op = 'DELETE' then
      update public.prayer_requests set prayer_count = prayer_count - 1 where id = old.request_id;
    end if;
    return null;
  end;
  $$;
  create trigger trg_prayer_count
    after insert or delete on public.prayer_engagements
    for each row execute procedure public.update_prayer_count();

  -- Index for reminder queries (find requests with event_date tomorrow where reminder not yet sent)
  create index if not exists idx_prayer_requests_event_date
    on public.prayer_requests (event_date)
    where reminder_sent = false and status = 'ongoing';
*/
