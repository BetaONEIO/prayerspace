import { useRef, useCallback } from 'react';
import { ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';

export function useScrollToTopOnFocus() {
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  return scrollRef;
}
