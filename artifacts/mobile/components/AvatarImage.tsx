import React from 'react';
import { Image } from 'expo-image';
import { StyleProp, ImageStyle } from 'react-native';
import { useSignedUrl } from '@/hooks/useSignedUrl';

const ANON_AVATAR = require('../assets/images/anon_user.png');

interface AvatarImageProps {
  avatarPath: string | null | undefined;
  fallbackSeed: string;
  style?: StyleProp<ImageStyle>;
}

export default function AvatarImage({ avatarPath, fallbackSeed, style }: AvatarImageProps) {
  const url = useSignedUrl(avatarPath, '');

  if (url) {
    return <Image source={{ uri: url }} style={style} />;
  }

  return <Image source={ANON_AVATAR} style={style} />;
}
