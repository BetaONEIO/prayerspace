import { useCallback, useMemo } from "react";
import { Alert, Platform } from "react-native";
import { useAuth } from "@/providers/AuthProvider";
import { assertLocalDataIdentity, getLocalDataIdentity } from "@/lib/accountLocalData";
import { supabase } from "@/lib/supabase";

export function privacyNotice(title: string, message: string) {
  if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

export function useAbuseReport() {
  const { user, localDataEpoch } = useAuth();
  const owner = useMemo(() => ({ ...getLocalDataIdentity() }), [user?.id, localDataEpoch]);
  const submit = useCallback(async (kind: "post" | "user" | "conversation" | "message", targetId: string, reason: string) => {
    assertLocalDataIdentity(owner);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId)) {
      throw new Error("This record is not available for reporting. Refresh and try again.");
    }
    const { data, error } = await supabase.rpc("submit_abuse_report", {
      p_expected_user_id: owner.userId, p_kind: kind, p_target_id: targetId, p_reason: reason,
    }).abortSignal(AbortSignal.timeout(15000));
    assertLocalDataIdentity(owner);
    if (error || typeof data !== "string") throw new Error(error?.message ?? "Your report was not submitted. Please retry.");
    return data;
  }, [owner]);
  const prompt = useCallback((kind: "user" | "conversation", targetId: string) => {
    try { assertLocalDataIdentity(owner); } catch { return; }
    const send = async () => {
      try {
        await submit(kind, targetId, "Abusive or inappropriate behaviour");
        privacyNotice("Report submitted", "Your report was saved to the moderation queue.");
      } catch (error) { privacyNotice("Could not report", error instanceof Error ? error.message : "Please retry."); }
    };
    if (Platform.OS === "web") {
      if (window.confirm("Report abusive or inappropriate behaviour to the moderation team?")) void send();
    } else Alert.alert("Report", "Report abusive or inappropriate behaviour to the moderation team?", [
      { text: "Cancel", style: "cancel" }, { text: "Submit report", onPress: () => void send() },
    ]);
  }, [submit, owner]);
  return { submit, prompt };
}
