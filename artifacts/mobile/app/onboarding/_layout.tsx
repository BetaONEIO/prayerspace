import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="habits" />
      <Stack.Screen name="focus" />
      <Stack.Screen name="improvement" />
      <Stack.Screen name="paywall" />
      <Stack.Screen name="contact-permissions" />
      <Stack.Screen name="import-loading" />
    </Stack>
  );
}
