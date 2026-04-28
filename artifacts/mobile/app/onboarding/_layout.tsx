import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="user-type" />
      {/* Personal flow */}
      <Stack.Screen name="goals" />
      <Stack.Screen name="habits" />
      <Stack.Screen name="focus" />
      <Stack.Screen name="improvement" />
      <Stack.Screen name="paywall" />
      {/* Church / group flow */}
      <Stack.Screen name="church-group-type" />
      <Stack.Screen name="church-purpose" />
      <Stack.Screen name="church-size" />
      <Stack.Screen name="church-setup" />
      <Stack.Screen name="church-invite" />
      <Stack.Screen name="church-value" />
      <Stack.Screen name="church-paywall" />
      {/* Shared closing steps */}
      <Stack.Screen name="contact-permissions" />
      <Stack.Screen name="import-loading" />
    </Stack>
  );
}
