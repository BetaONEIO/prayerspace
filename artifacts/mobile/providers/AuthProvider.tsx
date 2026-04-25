import createContextHook from "@nkzw/create-context-hook";
import { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";

export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  favorite_verse: string | null;
  updated_at: string | null;
  deletion_requested_at: string | null;
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    console.log("[Auth] Checking initial session...");
    void supabase.auth.getSession().then(({ data: { session: s } }) => {
      console.log("[Auth] Initial session:", s ? `Found (${s.user.email})` : "None");
      setSession(s);
      setIsInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      console.log("[Auth] State changed:", event, s?.user?.email ?? "no user");
      setSession(s);
      if (!s) {
        queryClient.clear();
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const profileQuery = useQuery({
    queryKey: ["profile", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      console.log("[Auth] Fetching profile:", session.user.id);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      if (error) {
        if (error.code !== "PGRST116") {
          console.error("[Auth] Profile fetch error:", error.message);
        }
        return null;
      }
      return data as UserProfile;
    },
    enabled: !!session?.user?.id && isInitialized,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<Omit<UserProfile, "id">>) => {
      if (!session?.user?.id) throw new Error("No user session");
      console.log("[Auth] Updating profile...");
      const { data, error } = await supabase
        .from("profiles")
        .upsert({
          id: session.user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data as UserProfile;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
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
      const { data: profile, error: profileFetchError } = await supabase
        .from("profiles")
        .select("deletion_requested_at")
        .eq("id", data.user.id)
        .single();

      if (profileFetchError && profileFetchError.code !== "PGRST116") {
        console.error("[Auth] Profile check error (non-fatal):", profileFetchError.message);
      }

      if (profile?.deletion_requested_at) {
        console.log("[Auth] Sign in blocked — account pending deletion:", data.user.id);
        await supabase.auth.signOut();
        throw new Error("ACCOUNT_DELETED");
      }

      if (!profile && !profileFetchError?.message?.includes("schema cache")) {
        console.log("[Auth] No profile found on sign in, creating one...");
        const fullName = data.user.user_metadata?.full_name ?? "";
        const { error: upsertError } = await supabase.from("profiles").upsert(
          {
            id: data.user.id,
            full_name: fullName,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
        if (upsertError) {
          console.error("[Auth] Failed to create profile on sign in (non-fatal):", upsertError.message);
        } else {
          console.log("[Auth] Profile created on sign in");
        }
      }
    }
    return data;
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    console.log("[Auth] Signing up:", email);

    let data: Awaited<ReturnType<typeof supabase.auth.signUp>>["data"];
    let error: Awaited<ReturnType<typeof supabase.auth.signUp>>["error"];
    try {
      const res = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
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
      if (lower.includes("database error") || lower.includes("saving new user")) {
        throw new Error("We couldn't create your account due to a server issue. Please try again or contact support.");
      }
      throw error;
    }

    const emailConfirmationRequired = !data.session;
    console.log("[Auth] Sign up complete. Email confirmation required:", emailConfirmationRequired, "user:", data.user?.id);

    if (data.user && data.session) {
      console.log("[Auth] Creating profile for new user...");
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: data.user.id,
          full_name: fullName,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
      if (profileError) {
        console.warn("[Auth] Failed to create profile (non-fatal):", profileError.message);
      } else {
        console.log("[Auth] Profile created successfully");
      }
    }

    return { ...data, emailConfirmationRequired };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    console.log("[Auth] Starting Google sign in...");
    const redirectTo = `https://${process.env.EXPO_PUBLIC_DOMAIN ?? ""}/`;
    console.log("[Auth] Google redirect URI:", redirectTo);

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
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      console.error("[Auth] Google OAuth error:", error.message);
      throw error;
    }
    if (!data?.url) throw new Error("No OAuth URL returned from Supabase");

    console.log("[Auth] Opening Google auth browser...");
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
    } else {
      console.log("[Auth] Google sign in cancelled or failed:", result.type);
    }
  }, []);

  const signOut = useCallback(async () => {
    console.log("[Auth] Signing out...");
    const { error } = await supabase.auth.signOut();
    if (error) console.error("[Auth] Sign out error:", error.message);
  }, []);

  const markAccountForDeletion = useCallback(async () => {
    if (!session?.user?.id) throw new Error("No user session");
    console.log("[Auth] Marking account for deletion:", session.user.id);
    const { error } = await supabase
      .from("profiles")
      .update({ deletion_requested_at: new Date().toISOString() })
      .eq("id", session.user.id);
    if (error) {
      console.error("[Auth] Failed to mark account for deletion:", error.message);
      throw error;
    }
    console.log("[Auth] Account marked for deletion, signing out...");
    await supabase.auth.signOut();
  }, [session?.user?.id]);

  return useMemo(() => ({
    session,
    user: session?.user ?? null,
    profile: profileQuery.data ?? null,
    isInitialized,
    isProfileLoading: profileQuery.isLoading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    markAccountForDeletion,
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,
  }), [
    session,
    profileQuery.data,
    profileQuery.isLoading,
    isInitialized,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    markAccountForDeletion,
    updateProfileMutation.mutateAsync,
    updateProfileMutation.isPending,
  ]);
});
