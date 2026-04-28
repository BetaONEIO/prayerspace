import { useState, useEffect } from "react";

export interface ChurchMembershipState {
  isChurchMember: boolean;
  churchName: string | null;
}

let _state: ChurchMembershipState = { isChurchMember: false, churchName: null };
const _listeners = new Set<(s: ChurchMembershipState) => void>();

function notify() {
  _listeners.forEach((fn) => fn({ ..._state }));
}

export const churchMembershipStore = {
  getState(): ChurchMembershipState {
    return { ..._state };
  },

  setMember(churchName: string | null = null) {
    _state = { isChurchMember: true, churchName };
    console.log("[ChurchMembership] Member set. Church:", churchName);
    notify();
  },

  clearMember() {
    _state = { isChurchMember: false, churchName: null };
    console.log("[ChurchMembership] Membership cleared.");
    notify();
  },

  subscribe(fn: (s: ChurchMembershipState) => void): () => void {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },
};

export function useChurchMembership(): ChurchMembershipState {
  const [state, setState] = useState<ChurchMembershipState>(
    () => churchMembershipStore.getState()
  );
  useEffect(() => {
    setState(churchMembershipStore.getState());
    return churchMembershipStore.subscribe(setState);
  }, []);
  return state;
}
