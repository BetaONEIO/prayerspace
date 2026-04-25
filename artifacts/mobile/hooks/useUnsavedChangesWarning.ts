import { useEffect, useCallback } from "react";
import { Alert, Platform, BackHandler } from "react-native";
import { useNavigation } from "expo-router";
import { usePreventRemove } from "@react-navigation/core";

export function useUnsavedChangesWarning(
  hasUnsavedChanges: boolean,
  message: string = "If you leave now, any unsaved changes will be lost."
) {
  const navigation = useNavigation();

  usePreventRemove(hasUnsavedChanges, ({ data }) => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm("Discard changes?\n" + message);
      if (confirmed) {
        navigation.dispatch(data.action);
      }
      return;
    }

    Alert.alert(
      "Discard changes?",
      message,
      [
        { text: "Stay", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => navigation.dispatch(data.action),
        },
      ]
    );
  });
}
