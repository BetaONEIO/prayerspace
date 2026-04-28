import React, { useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Image, Animated, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

const onboardingImage = {
  uri: "https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/Dsd9kebVr6M/components/0GnuCY4Uy2B.png",
};

const { width } = Dimensions.get("window");

export default function OnboardingWelcome() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const btnSlideAnim = useRef(new Animated.Value(60)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.timing(btnSlideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    ]).start();
  }, [fadeAnim, slideAnim, btnSlideAnim]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.imageArea}>
          <Animated.View style={{ opacity: fadeAnim }}>
            <Image source={onboardingImage} style={styles.heroImage} resizeMode="contain" />
          </Animated.View>
        </View>

        <Animated.View style={[styles.textArea, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.title}>A place to pray and connect</Text>
          <Text style={styles.subtitle}>Share prayer requests, encourage others, and stay connected.</Text>
        </Animated.View>

        <Animated.View style={[styles.footer, { opacity: fadeAnim, transform: [{ translateY: btnSlideAnim }] }]}>
          <Pressable
            style={({ pressed }) => [styles.getStartedBtn, pressed && styles.btnPressed]}
            onPress={() => router.push("/onboarding/goals" as never)}
            testID="onboarding-get-started"
          >
            <Text style={styles.getStartedText}>Get Started</Text>
          </Pressable>
          <Text style={styles.joinText}>Join thousands in prayer today.</Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    inner: { flex: 1, paddingHorizontal: 32, paddingBottom: 32, alignItems: "center", justifyContent: "space-between" },
    imageArea: { flex: 1, alignItems: "center", justifyContent: "center", width: "100%" },
    heroImage: { width: width * 0.75, height: width * 0.75 },
    textArea: { alignItems: "center", gap: 16, marginBottom: 40, paddingHorizontal: 8 },
    title: { fontSize: 34, fontWeight: "800" as const, color: colors.foreground, textAlign: "center", letterSpacing: -0.5, lineHeight: 42 },
    subtitle: { fontSize: 17, color: colors.mutedForeground, textAlign: "center", lineHeight: 26, maxWidth: 300 },
    footer: { width: "100%", gap: 12 },
    getStartedBtn: { height: 62, backgroundColor: colors.primary, borderRadius: 20, alignItems: "center" as const, justifyContent: "center" as const, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 8 },
    btnPressed: { opacity: 0.9 },
    getStartedText: { fontSize: 18, fontWeight: "700" as const, color: colors.primaryForeground },
    joinText: { fontSize: 13, color: colors.mutedForeground, textAlign: "center" },
  });
}