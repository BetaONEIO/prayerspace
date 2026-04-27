import React from 'react';
import { Image } from 'expo-image';
import { StyleProp, ImageStyle } from 'react-native';
import { useSignedUrl } from '@/hooks/useSignedUrl';

interface AvatarImageProps {
  avatarPath: string | null | undefined;
  fallbackSeed: string;
  style?: StyleProp<ImageStyle>;
}

export default function AvatarImage({ avatarPath, fallbackSeed, style }: AvatarImageProps) {
  const fallback = `https://api.dicebear.com/7.x/lorelei/png?seed=${encodeURIComponent(fallbackSeed)}`;
  const url = useSignedUrl(avatarPath, fallback);
  return <Image source={{ uri: url }} style={style} />;
}
