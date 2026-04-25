import React, { useCallback, useState } from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from "react-native";
import Svg, { Path, G } from "react-native-svg";
import { useAuth } from "@/providers/AuthProvider";

interface Props {
  onError?: (message: string) => void;
  variant?: "light" | "dark";
}

function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <G>
        <Path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <Path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <Path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <Path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
        <Path fill="none" d="M0 0h48v48H0z" />
      </G>
    </Svg>
  );
}

export default function GoogleSignInButton({ onError, variant = "light" }: Props) {
  const { signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = useCallback(async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google sign in failed. Please try again.";
      console.error("[GoogleSignIn] Error:", message);
      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  }, [signInWithGoogle, onError]);

  const isDark = variant === "dark";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        isDark ? styles.btnDark : styles.btnLight,
        pressed && styles.btnPressed,
        isLoading && styles.btnDisabled,
      ]}
      onPress={handlePress}
      disabled={isLoading}
      testID="google-signin-btn"
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={isDark ? "#fff" : "#1A1A1A"} />
      ) : (
        <>
          <View style={styles.logoWrap}>
            <GoogleLogo size={20} />
          </View>
          <Text style={[styles.btnText, isDark ? styles.btnTextDark : styles.btnTextLight]}>
            Continue with Google
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 54,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  btnLight: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  btnDark: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
  },
  btnPressed: {
    opacity: 0.8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  logoWrap: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  btnTextLight: {
    color: "#1A1A1A",
  },
  btnTextDark: {
    color: "#FFFFFF",
  },
});
