import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Audio } from "expo-av";
import { Play, Pause, ImageIcon } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import ImageViewer from "./ImageViewer";
import type { GroupMedia } from "@/lib/groupChat";
import { downloadPrivateGroupFile, type GroupMediaContext } from "@/lib/groupMedia";

export default function PrivateGroupAttachment({media,context,onLongPress}:{
  media:GroupMedia; context:GroupMediaContext; onLongPress?:()=>void;
}) {
  const colors=useThemeColors();
  const [uri,setUri]=useState<string|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState<string|null>(null);
  const [playing,setPlaying]=useState(false),[viewing,setViewing]=useState(false);
  const asset=useRef<{uri:string;dispose:()=>void}|null>(null),sound=useRef<Audio.Sound|null>(null);
  const lifetime=useRef<object>({}),busy=useRef(false);
  useEffect(()=>{
    const token={};lifetime.current=token;busy.current=false;
    setUri(null);setError(null);setLoading(false);setPlaying(false);setViewing(false);
    return ()=>{
      if(lifetime.current===token) lifetime.current={};
      const oldSound=sound.current;sound.current=null;
      if(oldSound) void oldSound.unloadAsync().catch(()=>{});
      asset.current?.dispose();asset.current=null;
    };
  },[context.scope,media.id]);
  useEffect(()=>{
    if(!playing)return;
    const token=lifetime.current;
    const timer=setInterval(()=>{
      const player=sound.current;
      if(!player || busy.current)return;
      void player.getStatusAsync().then(status=>{
        if(lifetime.current!==token || busy.current || sound.current!==player)return;
        if(!status.isLoaded || status.didJustFinish ||
          (status.durationMillis && status.positionMillis>=status.durationMillis) ||
          (!status.isPlaying && !status.shouldPlay))setPlaying(false);
      }).catch(()=>{if(lifetime.current===token)setPlaying(false);});
    },250);
    return()=>clearInterval(timer);
  },[playing,context.scope,media.id]);
  const open=async()=>{
    if(busy.current)return;
    busy.current=true;
    const token=lifetime.current,active=()=>lifetime.current===token;
    setLoading(true);setError(null);
    try {
      let file=asset.current;
      if(!file){
        file=await downloadPrivateGroupFile(context,media,active);
        if(!active()){file.dispose();return;}
        asset.current=file;setUri(file.uri);
      }
      if(media.kind!=="voice"){if(active())setViewing(true);return;}
      let player=sound.current;
      if(!player){
        await Audio.setAudioModeAsync({playsInSilentModeIOS:true,allowsRecordingIOS:false});
        if(!active())return;
        const loaded=await Audio.Sound.createAsync({uri:file.uri},{shouldPlay:false},status=>{
          if(active() && !busy.current && status.isLoaded)setPlaying(status.isPlaying && !status.didJustFinish);
        });
        player=loaded.sound;
        if(!active()){await player.unloadAsync().catch(()=>{});return;}
        sound.current=player;
      }
      const status=await player.getStatusAsync();
      if(!active())return;
      if(!status.isLoaded){sound.current=null;throw new Error("Audio isn't loaded. Tap to retry.");}
      if(playing){
        await player.pauseAsync();
        if(active())setPlaying(false);
      }
      else {
        if(status.durationMillis && status.positionMillis>=status.durationMillis)await player.setPositionAsync(0);
        if(active()){
          await player.playAsync();
          if(active())setPlaying(true);
        }
      }
    }catch(e){
      if(active()){setPlaying(false);setError(e instanceof Error?e.message:"Couldn't load this file. Tap to retry.");}
    }finally{if(active()){busy.current=false;setLoading(false);}}
  };
  return <View style={{maxWidth:240,gap:6}}>
    <Pressable accessibilityRole="button" disabled={loading}
      accessibilityLabel={media.kind==="voice"?(playing?"Pause voice message":"Play voice message"):"Open private group photo"}
      onPress={()=>void open()} onLongPress={onLongPress} delayLongPress={300}
      style={{padding:12,borderRadius:14,backgroundColor:colors.card,borderWidth:1,borderColor:colors.border,gap:8}}>
      {loading?<ActivityIndicator color={colors.primary}/>:media.kind==="voice"?
        (playing?<Pause color={colors.primary}/>:<Play color={colors.primary}/>):
        uri?<Image source={{uri}} style={{width:190,height:140,borderRadius:8}} contentFit="cover"/>:<ImageIcon color={colors.primary}/>}
      <Text style={{color:colors.foreground}}>{media.kind==="voice"?
        `${playing?"Pause":"Play"} voice message · ${Math.ceil((media.durationMs??0)/1000)}s`:
        uri?"Open photo":media.kind==="cover"?"Load group photo":"Load private photo"}</Text>
    </Pressable>
    {error && <Text accessibilityRole="alert" style={{color:colors.destructive}}>{error}</Text>}
    {media.kind!=="voice" && <ImageViewer uri={uri} visible={viewing && !!uri} onClose={()=>setViewing(false)}/>}
  </View>;
}
