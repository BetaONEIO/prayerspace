import React, { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { supabase } from "@/lib/supabase";
import { groupIdResult, groupRpc, inviteCandidatesSchema, newGroupClientId } from "@/lib/groupChat";

export default function GroupInviteSheet({ groupId, userId, visible, onClose, onChanged }: {
  groupId: string; userId: string; visible: boolean; onClose: () => void; onChanged: () => Promise<unknown>;
}) {
  const colors = useThemeColors();
  const client = useQueryClient();
  const operationIds = useRef(new Map<string,string>());
  const [sent, setSent] = useState(false);
  const key = useMemo(() => ["group-chat-invites", userId, groupId], [userId, groupId]);
  const query = useQuery({
    queryKey: key, enabled: visible,
    queryFn: () => groupRpc(supabase, userId, "group_chat_invite_candidates", { p_group_id: groupId }, inviteCandidatesSchema),
    staleTime: 0, refetchInterval: visible ? 5000 : false, retry: 1,
  });
  const add = useMutation({
    mutationFn: (id: string) => {
      if (!operationIds.current.has(id)) operationIds.current.set(id,newGroupClientId());
      return groupRpc(supabase, userId, "invite_group_chat_friend",
        { p_group_id: groupId, p_recipient_id: id, p_client_id: operationIds.current.get(id) }, groupIdResult);
    },
    onSuccess: async (_,id) => {
      operationIds.current.delete(id); setSent(true);
      await Promise.all([client.invalidateQueries({ queryKey: key }),
        client.invalidateQueries({ queryKey: ["group-invitations",userId] }), onChanged()]);
    },
  });
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, padding: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: colors.foreground, fontSize: 22, fontWeight: "600" }}>Invite friends</Text>
          <Pressable onPress={onClose} accessibilityLabel="Close" hitSlop={12}><X color={colors.foreground} size={24} /></Pressable>
        </View>
        <Text style={{ color: colors.mutedForeground, marginVertical: 16 }}>Invite accepted friends. They must accept before joining and reading this group's chat history. Invitations expire after 7 days.</Text>
        {sent && <Text accessibilityRole="alert" style={{color:colors.primary,marginBottom:12}}>Invitation sent. Your friend can respond in Group invitations.</Text>}
        {query.isLoading ? <ActivityIndicator color={colors.primary} /> : query.isError ? (
          <Pressable onPress={() => void query.refetch()}><Text style={{ color: colors.destructive }}>Couldn't load friends. Tap to retry.</Text></Pressable>
        ) : (
          <ScrollView keyboardShouldPersistTaps="handled">
            {!query.data?.length && <Text style={{ color: colors.mutedForeground }}>No eligible friends to invite. They may already be members, have a pending invitation, or have turned off invitations.</Text>}
            {query.data?.map(friend => (
              <View key={friend.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.foreground, flex: 1 }}>{friend.name}</Text>
                <Pressable accessibilityRole="button" disabled={add.isPending} onPress={() => {setSent(false);add.mutate(friend.id);}} accessibilityLabel={`Invite ${friend.name}`}>
                  <Text style={{ color: colors.primary }}>{add.isPending && add.variables === friend.id ? "Sending…" : "Invite"}</Text>
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
