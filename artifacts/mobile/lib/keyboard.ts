import { Keyboard } from "react-native";

/**
 * Finishes editing without submitting the surrounding form.
 * Call this from a single-line input's onSubmitEditing handler.
 */
export function dismissKeyboard(): void {
  Keyboard.dismiss();
}