import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type RefObject } from "react";
import { AccessibilityInfo, AppState, BackHandler, Keyboard, Platform, View, Pressable, Text, type PressableProps, type ScrollView } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabase";
import { dismissKeyboard } from "@/lib/keyboard";
import { TOUR_STEPS, TOUR_STEP_COUNT, TOUR_FINAL_STEP, newestTourProgress, parseTourProgress, type TourProgress, type TourStatus } from "@/lib/tourSteps";
import TourPresentation from "@/components/tour/TourPresentation";
import type { TourRect } from "@/components/tour/types";
import { useThemeColors } from "./ThemeProvider";

type Anchor = { ref: RefObject<View | null>; reveal?: () => void };
type TourContextValue = {
  isActive: boolean; isShowing: boolean; isPrayerPractice: boolean; step: number; section: "Feed" | "Groups" | "Community" | null;
  replay: () => void; register: (id: string, anchor: Anchor) => () => void;
  next: () => void; back: () => void; skip: () => void; pause: () => void;
};
const TourContext = createContext<TourContextValue | null>(null);
const storageKey = (id: string) => `@prayer_space:guided_tour:v1:${id}`;

export function GuidedTourProvider({ children }: { children: React.ReactNode }) {
  const { user, isInitialized, profile, isProfileLoading, profileError } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const rootRef = useRef<View>(null);
  const origin = useRef({ x: 0, y: 0 });
  const anchors = useRef(new Map<string, Anchor>());
  const accountRef = useRef(user?.id);
  accountRef.current = user?.id;
  const presented = useRef(false);
  const writes = useRef<Promise<void>>(Promise.resolve());
  const remoteWrites = useRef<Promise<void>>(Promise.resolve());
  const progressRef = useRef<TourProgress | null>(null);
  const [progress, setProgress] = useState<TourProgress | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"idle" | "welcome" | "resume" | "step">("idle");
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [rect, setRect] = useState<TourRect | null>(null);
  const [actualTarget, setActualTarget] = useState("");
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [keyboardY, setKeyboardY] = useState(Infinity);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [anchorVersion, setAnchorVersion] = useState(0);
  const [formPhase, setFormPhase] = useState<"write" | "audience">("write");
  const step = progress?.step ?? 0;
  const current = TOUR_STEPS[step];
  const eligible = !!user && isInitialized && !isProfileLoading && !profileError && !!profile?.date_of_birth &&
    !/^\/(login|register|verify-otp|complete-profile|password-reset|onboarding)(\/|$)/.test(pathname);
  const visible = eligible && loadedId === user?.id && mode !== "idle";
  const isActive = visible && mode === "step";

  const save = useCallback((status: TourStatus, nextStep: number) => {
    const id = accountRef.current;
    if (!id) return;
    const timestamp = Math.max(Date.now(), (progressRef.current ? Date.parse(progressRef.current.updated_at) : 0) + 1);
    const next: TourProgress = { status, step: nextStep, updated_at: new Date(timestamp).toISOString() };
    progressRef.current = next;
    setProgress(next);
    // Save locally without waiting for a slow network; serialize/coalesce remote writes separately.
    writes.current = writes.current.catch(() => {}).then(async () => {
      let localSaved = false;
      try { await AsyncStorage.setItem(storageKey(id), JSON.stringify(next)); localSaved = true; } catch { /* Report below. */ }
      if (accountRef.current !== id) return;
      remoteWrites.current = remoteWrites.current.catch(() => {}).then(async () => {
        if (accountRef.current !== id || progressRef.current?.updated_at !== next.updated_at) return;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        try {
          const { error } = await supabase.from("user_tour_progress")
            .upsert({ user_id: id, ...next }, { onConflict: "user_id" }).abortSignal(controller.signal);
          if (error) throw error;
          if (accountRef.current === id) setSyncNotice(localSaved ? null : "Progress saved to your account. Device storage is unavailable.");
        } catch {
          if (accountRef.current === id) setSyncNotice(localSaved
            ? "Progress saved on this device. We'll sync your account when you're online."
            : "Progress couldn't be saved. You can still finish or skip the tour.");
        } finally { clearTimeout(timeout); }
      });
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const id = user?.id;
    presented.current = false;
    progressRef.current = null;
    setProgress(null); setMode("idle"); setLoadedId(null); setSyncNotice(null); setRect(null);
    if (!id) { clearTimeout(timer); return; }
    void (async () => {
      const local = await AsyncStorage.getItem(storageKey(id)).then(raw => {
        try { return raw ? parseTourProgress(JSON.parse(raw)) : null; } catch { return null; }
      }).catch(() => null);
      let remote: TourProgress | null = null;
      let remoteFailed = false;
      try {
        const result = await supabase.from("user_tour_progress").select("status,step,updated_at")
          .eq("user_id", id).abortSignal(controller.signal).maybeSingle();
        if (result.error) throw result.error;
        remote = parseTourProgress(result.data);
      } catch { remoteFailed = true; }
      clearTimeout(timer);
      if (cancelled || accountRef.current !== id) return;
      const restored = newestTourProgress(progressRef.current, newestTourProgress(local, remote));
      progressRef.current = restored; setProgress(restored); setLoadedId(id);
      if (remoteFailed) setSyncNotice("Using this device's saved progress. Account sync is temporarily unavailable.");
      // Reconcile an offline completion/skip before it can reappear on another device.
      if (restored && (!remote || Date.parse(restored.updated_at) > Date.parse(remote.updated_at))) {
        save(restored.status, restored.step);
      }
    })();
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [user?.id, save]);

  useEffect(() => {
    if (!eligible || loadedId !== user?.id || presented.current) return;
    presented.current = true;
    if (!progressRef.current || progressRef.current.status === "not_started") setMode("welcome");
    else if (progressRef.current.status === "in_progress") setMode("resume");
  }, [eligible, loadedId, user?.id]);

  const register = useCallback((id: string, anchor: Anchor) => {
    anchors.current.set(id, anchor);
    setAnchorVersion(n => n + 1);
    return () => {
      if (anchors.current.get(id) === anchor) {
        anchors.current.delete(id); setAnchorVersion(n => n + 1);
      }
    };
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillChangeFrame" : "keyboardDidShow",
      e => setKeyboardY(e.endCoordinates.screenY));
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setKeyboardY(Infinity));
    void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion).catch(() => setReducedMotion(true));
    const motion = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducedMotion);
    return () => { show.remove(); hide.remove(); motion.remove(); };
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined" || !window.visualViewport) return;
    const visual = window.visualViewport;
    const update = () => {
      const tag = document.activeElement?.tagName;
      setKeyboardY(tag === "INPUT" || tag === "TEXTAREA" ? visual.height + visual.offsetTop : Infinity);
    };
    visual.addEventListener("resize", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      visual.removeEventListener("resize", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
    };
  }, []);

  const navigate = useCallback((nextStep: number) => {
    dismissKeyboard();
    setFormPhase("write");
    setRect(null);
    const next = TOUR_STEPS[nextStep];
    router.replace(next.route);
  }, [router]);

  const begin = useCallback((replay = false) => {
    if (!accountRef.current) return;
    setLoadedId(accountRef.current);
    const next = replay ? 0 : progressRef.current?.step ?? 0;
    presented.current = true;
    save("in_progress", next); setMode("step"); navigate(next);
  }, [save, navigate]);
  const close = useCallback((status: TourStatus) => {
    dismissKeyboard();
    save(status, progressRef.current?.step ?? 0);
    setMode("idle"); setRect(null); router.replace("/");
  }, [save, router]);
  const pause = useCallback(() => close("in_progress"), [close]);
  const move = useCallback((delta: number) => {
    const next = Math.max(0, Math.min(TOUR_FINAL_STEP, (progressRef.current?.step ?? 0) + delta));
    save("in_progress", next); navigate(next);
  }, [save, navigate]);

  useEffect(() => {
    if (!visible) return;
    const back = BackHandler.addEventListener("hardwareBackPress", () => {
      if (mode === "welcome") close("skipped"); else pause();
      return true;
    });
    return () => back.remove();
  }, [visible, mode, close, pause]);

  useEffect(() => {
    const listener = AppState.addEventListener("change", state => {
      const saved = progressRef.current;
      const id = accountRef.current;
      if (state === "active" && saved && id) void (async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        try {
          const { data, error } = await supabase.from("user_tour_progress").select("status,step,updated_at")
            .eq("user_id", id).abortSignal(controller.signal).maybeSingle();
          if (error) throw error;
          if (accountRef.current !== id) return;
          const remote = parseTourProgress(data);
          const selected = newestTourProgress(progressRef.current, remote);
          if (selected === remote && remote) {
            progressRef.current = remote; setProgress(remote);
            await AsyncStorage.setItem(storageKey(id), JSON.stringify(remote));
            if (remote.status === "completed" || remote.status === "skipped") setMode("idle");
          } else if (selected) save(selected.status, selected.step);
        } catch {
          if (accountRef.current === id && progressRef.current) save(progressRef.current.status, progressRef.current.step);
        } finally { clearTimeout(timeout); }
      })();
      if (state !== "active") dismissKeyboard();
    });
    return () => listener.remove();
  }, [save]);

  const formOpen = isActive && step === 1 && pathname === "/new-request";
  useEffect(() => {
    // Following the real empty-feed Find Friends button moves into its matching step.
    if (isActive && step === 2 && pathname === "/find-friend") save("in_progress", 3);
    // If someone chooses to begin a real solo session, let them pray normally
    // rather than keeping an unrelated tour overlay over the session.
    if (isActive && current.target === "solo-tour" && pathname === "/meditative-prayer-session") {
      dismissKeyboard(); save("in_progress", step); setMode("idle"); setRect(null);
    }
  }, [isActive, step, pathname, save, current.target]);
  const keyboardHeight = Math.max(0, viewport.height - (keyboardY - origin.current.y));
  const wantedTarget = formOpen ? formPhase === "write" ? "prayer-form" : "prayer-audience"
    : step === 3 && keyboardHeight === 0 && anchors.current.has("friend-request") ? "friend-request" : current.target;
  useEffect(() => {
    if (!isActive || !wantedTarget) { setRect(null); return; }
    let cancelled = false;
    let revealed: Anchor | undefined;
    const measure = () => {
      const primary = anchors.current.get(wantedTarget);
      const selected = primary ?? (current.fallback ? anchors.current.get(current.fallback) : undefined);
      const id = primary ? wantedTarget : current.fallback ?? "";
      if (!selected?.ref.current) { setRect(null); setActualTarget(""); return; }
      if (revealed !== selected) { revealed = selected; selected.reveal?.(); }
      rootRef.current?.measureInWindow((x, y) => { origin.current = { x, y }; });
      selected.ref.current.measureInWindow((x, y, width, height) => {
        if (cancelled) return;
        const r = { x: x - origin.current.x, y: y - origin.current.y, width, height };
        const clipped = {
          x: Math.max(0, r.x), y: Math.max(0, r.y),
          width: Math.min(viewport.width, r.x + width) - Math.max(0, r.x),
          height: Math.min(viewport.height, r.y + height) - Math.max(0, r.y),
        };
        const onScreen = clipped.width > 0 && clipped.height > 0;
        if (!onScreen && width > 0 && height > 0) selected.reveal?.();
        setActualTarget(id);
        setRect(prev => {
          if (!onScreen) return null;
          return prev && Object.keys(clipped).every(k => Math.abs(prev[k as keyof TourRect] - clipped[k as keyof TourRect]) < 1) ? prev : clipped;
        });
      });
    };
    measure();
    const interval = setInterval(measure, 180);
    return () => { cancelled = true; clearInterval(interval); };
  }, [isActive, wantedTarget, current.fallback, pathname, anchorVersion, viewport, keyboardY]);

  useEffect(() => {
    if (isActive) AccessibilityInfo.announceForAccessibility(`Step ${step + 1} of ${TOUR_STEP_COUNT}. ${current.title}`);
  }, [isActive, step, current.title]);

  return (
    <TourContext.Provider value={{
      isActive, isShowing: visible, isPrayerPractice: mode === "step" && step === 1 && loadedId === user?.id,
      step, section: isActive && pathname === "/community" ? current.section ?? null : null,
      register, replay: () => begin(true),
       next: () => step === TOUR_FINAL_STEP ? close("completed") : move(1), skip: () => close("skipped"), pause,
      back: () => { if (formOpen) navigate(1); else if (step === 0) setMode("welcome"); else move(-1); },
    }}>
      <View ref={rootRef} style={{ flex: 1 }} collapsable={false}
        onLayout={e => setViewport({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
        {children}
        {visible && viewport.width > 0 && (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }} pointerEvents="box-none">
            <TourPresentation
              mode={mode} step={step} title={current.title}
              description={formOpen
                ? formPhase === "write"
                  ? "Tap the highlighted box to try writing what's on your heart. Then choose Choose Audience to explore who can see it. Posting and draft saving are paused. Your existing drafts are untouched."
                  : "Tap the audience selector to choose who can see your request. This is only practice—nothing is published or saved as a draft. Tap Next when you're ready."
                : step === 3 && actualTarget === "friend-request"
                  ? "This + person button sends a Friend Request to the person beside it. Sending is optional—nothing happens unless you tap it. You can keep exploring or choose Next."
                : step === 2 && actualTarget !== "prayer-controls" ? current.emptyDescription! : current.description}
              target={rect} viewport={viewport}
              insets={{ ...insets, bottom: insets.bottom + (pathname === "/community" || pathname === "/" ? 86 : 8) }}
              keyboardHeight={keyboardHeight}
              reducedMotion={reducedMotion} syncNotice={syncNotice}
              onStart={() => begin()} onNext={() => move(1)} onBack={() => {
                if (formOpen) navigate(1); else if (step === 0) setMode("welcome"); else move(-1);
              }}
              onSkip={() => close("skipped")} onPause={pause} onFinish={() => close("completed")}
              formActionLabel={formOpen ? formPhase === "write" ? "Choose Audience" : "Write a Request" : "Open Prayer Form"}
              onOpenForm={step === 1 ? () => {
                dismissKeyboard();
                if (formOpen) setFormPhase(formPhase === "write" ? "audience" : "write");
                else { setFormPhase("write"); router.replace("/new-request"); }
              } : undefined}
            />
          </View>
        )}
      </View>
    </TourContext.Provider>
  );
}

export function useGuidedTour() {
  const value = useContext(TourContext);
  if (!value) throw new Error("GuidedTourProvider is missing");
  return value;
}

export function useTourTarget(id: string | null, reveal?: () => void, scrollRef?: RefObject<ScrollView | null>, scrollOffset?: RefObject<number>) {
  const { register } = useGuidedTour();
  const insets = useSafeAreaInsets();
  const ref = useRef<View>(null);
  const revealTarget = useCallback(() => {
    reveal?.();
    if (scrollRef?.current) {
      ref.current?.measureInWindow((_x, y) => {
        const scroll = (top: number) => scrollRef.current?.scrollTo({
          y: Math.max(0, (scrollOffset?.current ?? 0) + y - top), animated: false,
        });
        const nativeScroll = scrollRef.current?.getNativeScrollRef?.();
        if (typeof nativeScroll?.measureInWindow === "function") {
          nativeScroll.measureInWindow((_px, py) => scroll(py + 20));
        } else scroll(insets.top + 180);
      });
    }
  }, [reveal, scrollRef, scrollOffset, insets.top]);
  useEffect(() => {
    if (id) return register(id, { ref, reveal: revealTarget });
  }, [id, register, revealTarget]);
  return { ref, collapsable: false as const };
}

export function TourPressable({ tourId, ...props }: PressableProps & { tourId: string }) {
  const target = useTourTarget(tourId);
  return <Pressable {...props} {...target} />;
}

// Keep tour exit/continuation reachable inside existing native modal editors.
export function NativeTourControls({ onDismiss }: { onDismiss: () => void }) {
  const { isActive, step, next, back, skip, pause } = useGuidedTour();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  if (!isActive) return null;
  return (
    <View style={{ padding: 12, paddingBottom: 12 + insets.bottom, gap: 8, backgroundColor: colors.card, borderTopWidth: 1, borderColor: colors.border }}>
      <Text accessibilityRole="header" style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
        Step {step + 1} of {TOUR_STEP_COUNT} · {TOUR_STEPS[step].title}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Pressable testID="tour-native-back" accessibilityRole="button" onPress={() => { onDismiss(); back(); }}
          style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 12 }}>
          <Text style={{ color: colors.foreground }}>Back</Text>
        </Pressable>
        <Pressable testID="tour-native-next" accessibilityRole="button" onPress={() => { onDismiss(); next(); }}
          style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 16, borderRadius: 14, backgroundColor: colors.primary }}>
          <Text style={{ color: colors.primaryForeground }}>{step === TOUR_FINAL_STEP ? "Explore Prayer Space" : "Next"}</Text>
        </Pressable>
        <Pressable testID="tour-native-skip" accessibilityRole="button" onPress={() => { onDismiss(); skip(); }}
          style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 12 }}>
          <Text style={{ color: colors.foreground }}>Skip Tutorial</Text>
        </Pressable>
        <Pressable testID="tour-native-pause" accessibilityRole="button" onPress={() => { onDismiss(); pause(); }}
          style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 12 }}>
          <Text style={{ color: colors.mutedForeground }}>Pause Tour</Text>
        </Pressable>
      </View>
    </View>
  );
}
