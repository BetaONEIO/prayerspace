import React, { useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { ScrollView, ScrollViewProps } from 'react-native';
import { useFocusEffect } from 'expo-router';

export const AutoScrollView = forwardRef<ScrollView, ScrollViewProps>(
  (props, forwardedRef) => {
    const innerRef = useRef<ScrollView>(null);

    useImperativeHandle(forwardedRef, () => innerRef.current as ScrollView);

    useFocusEffect(
      useCallback(() => {
        innerRef.current?.scrollTo({ y: 0, animated: false });
      }, [])
    );

    return <ScrollView ref={innerRef} {...props} />;
  }
);

AutoScrollView.displayName = 'AutoScrollView';
