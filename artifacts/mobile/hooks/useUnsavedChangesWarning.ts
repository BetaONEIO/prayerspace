import { useRef, useState, useCallback } from "react";
import React from "react";
import { useNavigation } from "expo-router";
import { usePreventRemove } from "@react-navigation/core";
import DiscardChangesModal from "@/components/DiscardChangesModal";

export function useUnsavedChangesWarning(
  hasUnsavedChanges: boolean,
  message: string = "If you leave now, any unsaved changes will be lost."
): { DiscardModal: React.ReactElement } {
  const navigation = useNavigation();
  const [visible, setVisible] = useState(false);
  const pendingAction = useRef<Parameters<typeof navigation.dispatch>[0] | null>(null);

  usePreventRemove(hasUnsavedChanges, ({ data }) => {
    pendingAction.current = data.action;
    setVisible(true);
  });

  const handleStay = useCallback(() => {
    setVisible(false);
  }, []);

  const handleDiscard = useCallback(() => {
    setVisible(false);
    if (pendingAction.current) {
      navigation.dispatch(pendingAction.current);
    }
  }, [navigation]);

  const DiscardModal = React.createElement(DiscardChangesModal, {
    visible,
    message,
    onStay: handleStay,
    onDiscard: handleDiscard,
  });

  return { DiscardModal };
}
