import React, { useMemo, useRef, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, MailCheck } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { useGroupInvitations } from "@/hooks/useGroupInvitations";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { groupRpc, groupIdResult } from "@/lib/groupChat";
import type { GroupInvitation } from "@/lib/groupInvitations";

export default function ManageInvitesScreen() {
  const {user}=useAuth();
  return <GroupInvitationsBody key={user?.id ?? "signed-out"} />;
}

function GroupInvitationsBody() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const query=useGroupInvitations();
  const client=useQueryClient();
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const respond=useMutation({
    mutationFn: ({invite,action}:{invite:GroupInvitation;action:"accept"|"decline"|"revoke"})=>{
      if(!query.user)throw new Error("Sign in to respond to invitations.");
      return groupRpc(supabase,query.user.id,"respond_group_chat_invitation",
        {p_invitation_id:invite.id,p_action:action},groupIdResult);
    },
    onSuccess: async (groupId,{action})=>{
      if(!mounted.current)return;
      await Promise.all([
        client.invalidateQueries({queryKey:["group-invitations",query.user?.id]}),
        client.invalidateQueries({queryKey:["prayer-chat-groups",query.user?.id]}),
        client.invalidateQueries({queryKey:["group-chat-invites",query.user?.id]}),
      ]);
      if(mounted.current && action==="accept")router.push({pathname:"/group/[id]",params:{id:groupId}});
    },
    onError: ()=>{if(mounted.current)void query.refetch();},
  });
  const received=query.data?.filter(i=>i.recipientId===query.user?.id) ?? [];
  const sent=query.data?.filter(i=>i.inviterId===query.user?.id) ?? [];
  const renderInvite=(invite:GroupInvitation,incoming:boolean)=>(
    <View key={invite.id} style={{backgroundColor:colors.card,padding:18,borderRadius:18,gap:10,marginBottom:12}}>
      <Text style={{color:colors.foreground,fontSize:17,fontWeight:"600"}}>{invite.groupName}</Text>
      <Text style={{color:colors.mutedForeground}}>
        {incoming ? `${invite.inviterName} invited you` : `Invited ${invite.recipientName}`} · {invite.status}
      </Text>
      {incoming && invite.status==="pending" && <Text style={{color:colors.mutedForeground}}>
        Accepting lets you read this private group's chat history. Expires {new Date(invite.expiresAt).toLocaleDateString()}.
      </Text>}
      {(invite.status==="pending" || invite.status==="unavailable") && <View style={{flexDirection:"row",gap:20}}>
        {(incoming ? (invite.status==="pending" ? ["accept","decline"] as const : ["decline"] as const) : ["revoke"] as const).map(action=>(
          <Pressable accessibilityRole="button" key={action} disabled={respond.isPending}
            accessibilityLabel={`${action==="revoke"?"Cancel invitation":action==="accept"?"Accept":"Decline"} ${invite.groupName}`}
            onPress={()=>respond.mutate({invite,action})}
            style={{paddingVertical:10,paddingHorizontal:12,backgroundColor:colors.secondary,borderRadius:10}}>
            <Text style={{color:colors.primary,fontWeight:"600"}}>
              {respond.isPending && respond.variables?.invite.id===invite.id && respond.variables.action===action
                ?"Saving…":action==="revoke"?"Cancel invitation":action==="accept"?"Accept":"Decline"}
            </Text>
          </Pressable>
        ))}
      </View>}
      {incoming && invite.status==="accepted" && <Pressable accessibilityRole="button"
        accessibilityLabel={`Open ${invite.groupName}`}
        onPress={()=>router.push({pathname:"/group/[id]",params:{id:invite.groupId}})}>
        <Text style={{color:colors.primary,paddingVertical:8}}>Open group</Text>
      </Pressable>}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Back" style={styles.backBtn} onPress={() => router.canGoBack()?router.back():router.replace("/(tabs)/community")}>
          <ArrowLeft size={20} color={colors.secondaryForeground} />
        </Pressable>
        <Text style={styles.title}>Group invitations</Text>
        <View style={{ width: 40 }} />
      </View>

      {respond.isError && <Text accessibilityRole="alert" style={{color:colors.destructive,padding:16}}>{respond.error.message}</Text>}
      {!query.user ? <Text style={styles.emptyBody}>Sign in to view your invitations.</Text> :
        query.isLoading ? <ActivityIndicator color={colors.primary} /> :
        query.isError ? <Pressable accessibilityRole="button" onPress={()=>void query.refetch()} style={{padding:24}}>
          <Text style={{color:colors.destructive}}>Couldn't load invitations. Tap to retry.</Text>
        </Pressable> :
        !query.data?.length ? <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <MailCheck size={32} color={colors.mutedForeground} />
        </View>
        <Text style={styles.emptyTitle}>No group invitations</Text>
        <Text style={styles.emptyBody}>
          Invitations you receive and send will appear here. Only the invited friend can accept.
        </Text>
      </View> : <ScrollView contentContainerStyle={{padding:20}} showsVerticalScrollIndicator={false}>
        <Text style={{color:colors.foreground,fontWeight:"700",marginBottom:12}}>Received</Text>
        {!received.length && <Text style={{color:colors.mutedForeground,marginBottom:20}}>No received invitations.</Text>}
        {received.map(i=>renderInvite(i,true))}
        <Text style={{color:colors.foreground,fontWeight:"700",marginVertical:12}}>Sent</Text>
        {!sent.length && <Text style={{color:colors.mutedForeground}}>No sent invitations.</Text>}
        {sent.map(i=>renderInvite(i,false))}
      </ScrollView>}
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    title: { fontSize: 19, fontWeight: "700" as const, color: colors.foreground },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 40,
      gap: 12,
    },
    emptyIcon: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "700" as const,
      color: colors.foreground,
      textAlign: "center",
    },
    emptyBody: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: "center",
      lineHeight: 22,
    },
  });
}
