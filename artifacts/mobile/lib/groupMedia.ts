import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { uploadGroupMedia, downloadGroupMedia } from "@workspace/api-client-react";
import { supabase } from "./supabase";
import { newGroupClientId, type GroupMedia } from "./groupChat";

export type GroupMediaContext = { userId: string; groupId: string; scope: object };
const extensions: Record<string,string> = { "image/jpeg":"jpg","image/png":"png","image/webp":"webp",
  "audio/mp4":"m4a","audio/webm":"webm","audio/ogg":"ogg","audio/wav":"wav","audio/aac":"aac","audio/3gpp":"3gp","audio/x-caf":"caf" };
async function assertOwner(userId: string, current: () => boolean) {
  const {data,error} = await supabase.auth.getSession();
  if (!current() || error || data.session?.user.id!==userId) throw new Error("Account changed. Reopen the group.");
}
function fileMime(uri: string, voice: boolean) {
  const ext = uri.split("?")[0].split(".").pop()?.toLowerCase();
  return Object.entries(extensions).find(([mime,suffix]) => suffix===ext && mime.startsWith(voice?"audio/":"image/"))?.[0]
    ?? (voice ? "audio/mp4" : "image/jpeg");
}
async function readLocalFile(uri: string, voice: boolean) {
  const limit = (voice ? 8 : 5)*1024*1024;
  if (Platform.OS!=="web" && uri.startsWith("file://")) {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists || info.isDirectory) throw new Error("The local file is no longer available.");
    if (info.size>limit) throw new Error(`Choose a file of at most ${voice?8:5} MB.`);
    return {base64:await FileSystem.readAsStringAsync(uri,{encoding:FileSystem.EncodingType.Base64}),mime:fileMime(uri,voice)};
  }
  if (!uri.startsWith("blob:") && !uri.startsWith("data:")) throw new Error("Choose a local photo or recording.");
  const blob = await (await fetch(uri)).blob();
  if (blob.size>limit) throw new Error(`Choose a file of at most ${voice?8:5} MB.`);
  const base64 = await new Promise<string>((resolve,reject) => {
    const reader = new FileReader();
    reader.onerror=()=>reject(new Error("Couldn't read the selected file."));
    reader.onload=()=>resolve(String(reader.result).split(",")[1]);
    reader.readAsDataURL(blob);
  });
  const mime = blob.type.split(";")[0].toLowerCase() || fileMime(uri,voice);
  return {base64,mime:mime==="audio/m4a" ? "audio/mp4" : mime};
}
export async function uploadPrivateGroupFile(context: GroupMediaContext, mediaId: string, kind: GroupMedia["kind"],
  uri: string, current: () => boolean, durationMs?: number) {
  if(kind==="voice" && (!durationMs || durationMs>300000))throw new Error("Record a voice message no longer than five minutes. Your recording has not been discarded.");
  await assertOwner(context.userId,current);
  const file = await readLocalFile(uri,kind==="voice");
  await assertOwner(context.userId,current);
  const result = await uploadGroupMedia({expectedUserId:context.userId,groupId:context.groupId,mediaId,kind,...file,durationMs});
  await assertOwner(context.userId,current);
  return result.id;
}
export async function downloadPrivateGroupFile(context: GroupMediaContext, media: GroupMedia, current: () => boolean) {
  await assertOwner(context.userId,current);
  const data = await downloadGroupMedia({expectedUserId:context.userId,groupId:context.groupId,mediaId:media.id});
  await assertOwner(context.userId,current);
  if (data.mime!==media.mime || !extensions[data.mime]) throw new Error("File metadata changed. Refresh the group.");
  const size = data.base64.length*3/4-(data.base64.endsWith("==")?2:data.base64.endsWith("=")?1:0);
  if (size!==media.bytes) throw new Error("Incomplete file download. Please retry.");
  if (Platform.OS==="web") {
    const bytes = Uint8Array.from(atob(data.base64),char=>char.charCodeAt(0));
    const uri = URL.createObjectURL(new Blob([bytes],{type:data.mime}));
    return {uri,dispose:()=>{URL.revokeObjectURL(uri);}};
  }
  if (!FileSystem.cacheDirectory) throw new Error("Private file cache unavailable.");
  const uri = `${FileSystem.cacheDirectory}group-private-${newGroupClientId()}.${extensions[data.mime]}`;
  const dispose=()=>{void FileSystem.deleteAsync(uri,{idempotent:true}).catch(()=>{});};
  try {
    await FileSystem.writeAsStringAsync(uri,data.base64,{encoding:FileSystem.EncodingType.Base64});
    await assertOwner(context.userId,current);
    return {uri,dispose};
  } catch (error) { dispose(); throw error; }
}
