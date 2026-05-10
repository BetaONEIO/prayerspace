import React, { useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { ScrollView, ScrollViewProps } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { KeyboardAwareScrollView, type KeyboardAwareScrollViewProps } from 'react-native-keyboard-controller';

type AutoScrollViewProps = KeyboardAwareScrollViewProps & ScrollViewProps;

export const AutoScrollView = forwardRef<ScrollView, AutoScrollViewProps>(
  ({ bottomOffset = 20, ...props }, forwardedRef) => {
    const innerRef = useRef<ScrollView>(null);

    useImperativeHandle(forwardedRef, () => innerRef.current as ScrollView);

    useFocusEffect(
      useCallback(() => {
        innerRef.current?.scrollTo({ y: 0, animated: false });
      }, [])
    );

    return (
      <KeyboardAwareScrollView
        ref={innerRef}
        bottomOffset={bottomOffset}
        keyboardShouldPersistTaps="handled"
        {...props}
      />
    );
  }
);

AutoScrollView.displayName = 'AutoScrollView';
