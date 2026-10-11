import createContextHook from "@nkzw/create-context-hook";
import { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";
import { communityStore } from "@/lib/communityStore";
import { churchMembershipStore } from "@/lib/churchMembershipStore";
import { getLocalDataIdentity, setLocalDataIdentity, assertLocalDataIdentity } from "@/lib/accountLocalData";
import { removeDeletedAccountLocalData } from "@/lib/accountPrivacy";
import { requestAccountDeletion } from "@workspace/api-client-react";
import { groupStore, groupCreatedStore } from "@/lib/groupStore";
import { synchronizeAccountReminders } from "@/lib/accountReminderNotifications";
import { checkRegistrationStorage, loadEmailRegistrationProfile, readOwnRegistrationProfile, writeOwnRegistrationProfile, validateDateOfBirth } from "@/lib/registrationProfile";
import type { UserProfile } from "@/lib/registrationProfile";
export type { UserProfile } from "@/lib/registrationProfile";

export const [AuthProvider, useAuth] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [localDataEpoch, setLocalDataEpoch] = useState(0);
  const requestedDeletionAccounts = useRef(new Set<string>());
  const accountIdentity = useMemo(() => ({ ...getLocalDataIdentity() }), [session?.user.id, localDataEpoch]);

  useEffect(() => {
    console.log("[Auth] Checking initial session...");
    let isActive = true;
    let oauthProfileTimer: ReturnType<typeof setTimeout> | null = null;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (s && requestedDeletionAccounts.current.has(s.user.id)) s = null;
      console.log("[Auth] State changed:", event, s ? "signed in" : "no user");
      const previousUserId = getLocalDataIdentity().userId;
      const nextIdentity = setLocalDataIdentity(s?.user.id ?? null);
      setLocalDataEpoch(nextIdentity.epoch);
      if (previousUserId !== nextIdentity.userId) {
        communityStore.clear();
        churchMembershipStore.clearMember();
        groupStore.clear();
        groupCreatedStore.clear();
        void queryClient.cancelQueries();
        queryClient.clear();
      }
      if (event === "INITIAL_SESSION" || previousUserId !== nextIdentity.userId) {
        void synchronizeAccountReminders().catch(() => {
          console.warn("[Auth] Could not pause earlier account reminders.");
          Alert.alert("Could not pause reminders",
            "Your device could not remove earlier scheduled reminders. Please turn off Prayer Space notifications in device settings until this is resolved.");
        });
      }
      setSession(s);
      if (event === "INITIAL_SESSION") {
        setIsInitialized(true);
      }
      if (!s) {
        communityStore.clear();
        churchMembershipStore.clearMember();
        queryClient.clear();
        return;
      }
      if (event === "SIGNED_IN") {
        const provider = s.user.app_metadata?.provider;
        if (provider && provider !== "email") {
          // Auth callbacks run while Supabase coordinates access to persisted
          // tokens. Do not make Supabase requests until this callback returns:
          // those requests may ask the same client for a token and contend for
          // the auth lock.
          if (oauthProfileTimer) clearTimeout(oauthProfileTimer);
          oauthProfileTimer = setTimeout(() => {
            oauthProfileTimer = null;
            if (!isActive) return;
            void (async () => {
              const { data: existingProfile, error: profileCheckErr } = await supabase
                .from("profiles")
                .select("id, deletion_requested_at")
                .eq("id", s.user.id)
                .single();

              if (profileCheckErr && profileCheckErr.code !== "PGRST116") {
                console.error("[Auth] OAuth profile check error (non-fatal):", profileCheckErr.message);
                return;
              }

              if (existingProfile?.deletion_requested_at) {
                console.log("[Auth] OAuth sign in blocked — account pending deletion:", s.user.id);
                await supabase.auth.signOut();
                return;
              }

              if (!existingProfile) {
                console.log("[Auth] Creating profile for new OAuth user (provider:", provider, ")...");
                const fullName = s.user.user_metadata?.full_name ?? s.user.user_metadata?.name ?? "";
                const avatarUrl = s.user.user_metadata?.avatar_url ?? s.user.user_metadata?.picture ?? null;
                const { error: upsertError } = await supabase.from("profiles").upsert(
                  {
                    id: s.user.id,
                    full_name: fullName,
                    avatar_url: avatarUrl,
                    updated_at: new Date().toISOString(),
                  },
                  { onConflict: "id" }
                );
                if (upsertError) {
                  console.error("[Auth] Failed to create OAuth user profile (non-fatal):", upsertError.message);
                } else {
                  console.log("[Auth] OAuth user profile created");
                  void queryClient.invalidateQueries({ queryKey: ["profile"] });
                }
              }
            })();
          }, 0);
        }
      }
    });

    return () => {
      isActive = false;
      if (oauthProfileTimer) clearTimeout(oauthProfileTimer);
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const profileQuery = useQuery({
    queryKey: ["profile", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      console.log("[Auth] Fetching profile:", session.user.id);
      if ((session.user.app_metadata?.provider ?? "email") === "email") {
        return await loadEmailRegistrationProfile(supabase, session.user) as UserProfile | null;
      }
      const data = await readOwnRegistrationProfile(supabase);
      return data as UserProfile;
    },
    enabled: !!session?.user?.id && isInitialized,
    retry: false,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<Omit<UserProfile, "id">>) => {
      if (!session?.user?.id) throw new Error("No user session");
      console.log("[Auth] Updating profile...");
      const data = await writeOwnRegistrationProfile(supabase, session.user.id, updates);
      return data as UserProfile;
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(["profile", profile.id], profile);
      void queryClient.invalidateQueries({ queryKey: ["profile", profile.id] });
    },
    onError: (error) => {
      console.error("[Auth] Profile update error:", error);
    },
  });

  const signIn = useCallback(async (email: string, password: string) => {
    console.log("[Auth] Signing in:", email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("[Auth] Sign in error:", error.name, error.message, error.status);
      if (error.name === "AuthRetryableFetchError" || !error.message) {
        throw new Error("Unable to reach authentication server. Please check your internet connection and try again.");
      }
      throw error;
    }
    if (data.user) {
      let profile: UserProfile | null;
      try {
        profile = await loadEmailRegistrationProfile(supabase, data.user) as UserProfile | null;
      } catch (error) {
        await supabase.auth.signOut();
        throw error;
      }

      if (profile?.deletion_requested_at) {
        console.log("[Auth] Sign in blocked — account pending deletion:", data.user.id);
        await supabase.auth.signOut();
        throw new Error("ACCOUNT_DELETED");
      }

    }
    return data;
  }, []);

  const signUp = useCallback(async (
    email: string,
    password: string,
    fullName: string,
    dateOfBirth: string,
  ) => {
    console.log("[Auth] Signing up:", email);

    validateDateOfBirth(dateOfBirth);
    await checkRegistrationStorage(supabase);

    let data: Awaited<ReturnType<typeof supabase.auth.signUp>>["data"];
    let error: Awaited<ReturnType<typeof supabase.auth.signUp>>["error"];
    try {
      const res = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            date_of_birth: dateOfBirth,
            age_verified: true,
          },
        },
      });
      data = res.data;
      error = res.error;
    } catch (thrown) {
      console.error("[Auth] Sign up threw:", thrown);
      const msg = thrown instanceof Error ? thrown.message : String(thrown);
      throw new Error(msg || "Unable to reach authentication server. Please check your internet connection and try again.");
    }

    if (error) {
      console.warn("[Auth] Sign up error details:", {
        name: error.name,
        message: error.message,
        status: error.status,
        code: (error as { code?: string }).code,
      });
      if (error.name === "AuthRetryableFetchError" || !error.message) {
        throw new Error("Unable to reach authentication server. Please check your internet connection and try again.");
      }
      const lower = (error.message ?? "").toLowerCase();
      if (lower.includes("at least 13") || lower.includes("age_verification_failed")) {
        throw new Error("You must be at least 13 years old to create an account.");
      }
      if (lower.includes("date of birth") || lower.includes("dob_required")) {
        throw new Error("Date of birth is required to create an account.");
      }
      if (lower.includes("database error") || lower.includes("saving new user")) {
        throw new Error("We couldn't create your account due to a server issue. Please try again or contact support.");
      }
      throw error;
    }

    const emailConfirmationRequired = !data.session;
    console.log("[Auth] Sign up complete. Email confirmation required:", emailConfirmationRequired, "user:", data.user?.id);

    if (data.user && data.session) {
      try {
        const profile = await loadEmailRegistrationProfile(supabase, data.user);
        if (profile?.date_of_birth !== dateOfBirth) throw new Error("Your date of birth was not saved.");
      } catch (error) {
        await supabase.auth.signOut();
        throw error;
      }
    }

    return { ...data, emailConfirmationRequired };
  }, []);

  const verifyRegistration = useCallback(async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });
    if (error) throw error;
    try {
      if (!data.user || !data.session) throw new Error("Verification did not create a session. Please sign in again.");
      const profile = await loadEmailRegistrationProfile(supabase, data.user);
      if (profile?.deletion_requested_at) throw new Error("ACCOUNT_DELETED");
      if (!profile?.date_of_birth) throw new Error("Your required date of birth is missing. Please sign in to complete your profile.");
      queryClient.setQueryData(["profile", data.user.id], profile);
    } catch (error) {
      await supabase.auth.signOut();
      throw new Error(`${error instanceof Error ? error.message : "Profile could not be saved."} Your email is verified; sign in to retry.`);
    }
  }, [queryClient]);

  const signInWithGoogle = useCallback(async () => {
    console.log("[Auth] Starting Google sign in...");

    const redirectTo = Linking.createURL("/");

    if (Platform.OS === "web") {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) {
        console.error("[Auth] Google OAuth error (web):", error.message);
        throw error;
      }
      return;
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        skipBrowserRedirect: true,
        redirectTo,
      },
    });

    if (error) {
      console.error("[Auth] Google OAuth error:", error.message);
      throw error;
    }
    if (!data?.url) throw new Error("No OAuth URL returned from Supabase");

    console.log("[Auth] Opening Google auth browser, redirectTo:", redirectTo);
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    console.log("[Auth] WebBrowser result type:", result.type);

    if (result.type === "success" && result.url) {
      console.log("[Auth] Exchanging code for session...");
      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(result.url);
      if (sessionError) {
        console.error("[Auth] exchangeCodeForSession error:", sessionError.message);
        throw sessionError;
      }
      console.log("[Auth] Google sign in successful");

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: existingProfile, error: profileCheckErr } = await supabase
          .from("profiles")
          .select("id, deletion_requested_at")
          .eq("id", user.id)
          .single();

        if (profileCheckErr && profileCheckErr.code !== "PGRST116") {
          console.error("[Auth] Google profile check error (non-fatal):", profileCheckErr.message);
        }

        if (existingProfile?.deletion_requested_at) {
          console.log("[Auth] Google sign in blocked — account pending deletion:", user.id);
          await supabase.auth.signOut();
          throw new Error("ACCOUNT_DELETED");
        }

        if (!existingProfile) {
          console.log("[Auth] Creating profile for new Google user...");
          const fullName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? "";
          const avatarUrl = user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null;
          const { error: upsertError } = await supabase.from("profiles").upsert(
            {
              id: user.id,
              full_name: fullName,
              avatar_url: avatarUrl,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );
          if (upsertError) {
            console.error("[Auth] Failed to create Google user profile (non-fatal):", upsertError.message);
          } else {
            console.log("[Auth] Google user profile created");
          }
        }
      }
    } else {
      console.log("[Auth] Google sign in cancelled or failed:", result.type);
    }
  }, []);

  const signOut = useCallback(async () => {
    console.log("[Auth] Signing out...");
    const { error } = await supabase.auth.signOut();
    if (error) console.error("[Auth] Sign out error:", error.message);
  }, []);

  const markAccountForDeletion = useCallback(async (confirmation: "DELETE") => {
    assertLocalDataIdentity(accountIdentity);
    if (!process.env.EXPO_PUBLIC_DOMAIN) throw new Error("Account deletion service URL is not configured");
    const result = await requestAccountDeletion({ expectedUserId: accountIdentity.userId!, confirmation }, { signal: AbortSignal.timeout(45000) });
    if (result.status !== "requested") throw new Error("Deletion was not confirmed");
    requestedDeletionAccounts.current.add(accountIdentity.userId!);
    // Even if another account became active while awaiting the receipt, clean
    // only the account named in the accepted request; never sign out the new one.
    const active = getLocalDataIdentity();
    if (active.userId === accountIdentity.userId && active.epoch === accountIdentity.epoch) {
      const next = setLocalDataIdentity(null);
      setLocalDataEpoch(next.epoch);
      setSession(null);
      void queryClient.cancelQueries();
      queryClient.clear();
      communityStore.clear(); churchMembershipStore.clearMember();
      groupStore.clear(); groupCreatedStore.clear();
      void synchronizeAccountReminders().catch(() => Alert.alert("Could not pause reminders",
        "Turn off Prayer Space notifications in device settings until earlier reminders can be removed."));
      await supabase.auth.signOut({ scope: "local" });
    }
    try { await removeDeletedAccountLocalData(accountIdentity.userId!); }
    catch {
      throw new Error("Deletion was requested, but device cleanup failed. Clear Prayer Space app data on this device.");
    }
    return result;
  }, [accountIdentity, queryClient]);

  return useMemo(() => ({
    session,
    user: session?.user ?? null,
    profile: profileQuery.data ?? null,
    isInitialized,
    localDataEpoch,
    isProfileLoading: profileQuery.isLoading,
    profileError: profileQuery.error,
    retryProfile: profileQuery.refetch,
    signIn,
    signUp,
    verifyRegistration,
    signOut,
    signInWithGoogle,
    markAccountForDeletion,
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,
  }), [
    session,
    profileQuery.data,
    profileQuery.isLoading,
    profileQuery.error,
    profileQuery.refetch,
    isInitialized,
    localDataEpoch,
    signIn,
    signUp,
    verifyRegistration,
    signOut,
    signInWithGoogle,
    markAccountForDeletion,
    updateProfileMutation.mutateAsync,
    updateProfileMutation.isPending,
  ]);
});
