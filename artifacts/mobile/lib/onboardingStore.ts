import { useState, useEffect } from "react";

export type UserType = "personal" | "church" | null;

interface OnboardingState {
  userType: UserType;
}

let _state: OnboardingState = { userType: null };
const _listeners = new Set<(s: OnboardingState) => void>();

function notify() {
  _listeners.forEach((fn) => fn({ ..._state }));
}

export const onboardingStore = {
  getState(): OnboardingState {
    return { ..._state };
  },
  setUserType(userType: UserType) {
    _state = { ..._state, userType };
    notify();
  },
  reset() {
    _state = { userType: null };
    notify();
  },
  subscribe(fn: (s: OnboardingState) => void): () => void {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },
};

export function useOnboardingStore(): OnboardingState {
  const [state, setState] = useState<OnboardingState>(() => onboardingStore.getState());
  useEffect(() => {
    setState(onboardingStore.getState());
    return onboardingStore.subscribe(setState);
  }, []);
  return state;
}
