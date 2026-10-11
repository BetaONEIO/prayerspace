import React, { useMemo } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { supabase } from "@/lib/supabase";
import { emptyGroupResult, groupRpc, inviteCandidatesSchema } from "@/lib/groupChat";

export default function GroupInviteSheet({ groupId, userId, visible, onClose, onChanged }: {
  groupId: string; userId: string; visible: boolean; onClose: () => void; onChanged: () => Promise<unknown>;
}) {
  const colors = useThemeColors();
  const client = useQueryClient();
  const key = useMemo(() => ["group-chat-invites", userId, groupId], [userId, groupId]);
  const query = useQuery({
    queryKey: key, enabled: visible,
    queryFn: () => groupRpc(supabase, userId, "group_chat_invite_candidates", { p_group_id: groupId }, inviteCandidatesSchema),
    staleTime: 0, retry: 1,
  });
  const add = useMutation({
    mutationFn: (id: string) => groupRpc(supabase, userId, "change_group_chat_member", { p_group_id: groupId, p_user_id: id, p_action: "add" }, emptyGroupResult),
    onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: key }), onChanged()]); },
  });
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, padding: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: colors.foreground, fontSize: 22, fontWeight: "600" }}>Add friends</Text>
          <Pressable onPress={onClose} accessibilityLabel="Close" hitSlop={12}><X color={colors.foreground} size={24} /></Pressable>
        </View>
        <Text style={{ color: colors.mutedForeground, marginVertical: 16 }}>Only accepted friends can be added. They will be able to read this group's chat history.</Text>
        {query.isLoading ? <ActivityIndicator color={colors.primary} /> : query.isError ? (
          <Pressable onPress={() => void query.refetch()}><Text style={{ color: colors.destructive }}>Couldn't load friends. Tap to retry.</Text></Pressable>
        ) : (
          <ScrollView keyboardShouldPersistTaps="handled">
            {!query.data?.length && <Text style={{ color: colors.mutedForeground }}>No eligible friends to add.</Text>}
            {query.data?.map(friend => (
              <View key={friend.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.foreground, flex: 1 }}>{friend.name}</Text>
                <Pressable disabled={add.isPending} onPress={() => add.mutate(friend.id)} accessibilityLabel={`Add ${friend.name}`}>
                  <Text style={{ color: colors.primary }}>{add.isPending && add.variables === friend.id ? "Adding…" : "Add"}</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}
        {add.isError && <Text style={{ color: colors.destructive, marginTop: 12 }}>{add.error.message}</Text>}
      </SafeAreaView>
    </Modal>
  );
}
