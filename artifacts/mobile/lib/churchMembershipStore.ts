import { useState, useEffect } from "react";

export type ChurchRole = "owner" | "member" | null;

export interface ChurchMembershipState {
  isChurchMember: boolean;
  isPremium: boolean;
  role: ChurchRole;
  tier: string | null;
  churchName: string | null;
}

let _state: ChurchMembershipState = {
  isChurchMember: false,
  isPremium: false,
  role: null,
  tier: null,
  churchName: null,
};
const _listeners = new Set<(s: ChurchMembershipState) => void>();

function notify() {
  _listeners.forEach((fn) => fn({ ..._state }));
}

export const churchMembershipStore = {
  getState(): ChurchMembershipState {
    return { ..._state };
  },

  /**
   * Called after the church owner completes a purchase.
   * Grants personal Pro + full admin while subscription is active.
   */
  setOwner(churchName: string | null = null, tier: string | null = null) {
    _state = {
      isChurchMember: true,
      isPremium: true,
      role: "owner",
      tier,
      churchName,
    };
    console.log("[ChurchMembership] Owner set. Church:", churchName, "Tier:", tier);
    notify();
  },

  /**
   * Called when a regular member joins a community.
   * Members access community-level features only — no personal Pro.
   */
  setMember(churchName: string | null = null) {
    _state = {
      isChurchMember: true,
      isPremium: _state.isPremium,
      role: "member",
      tier: _state.tier,
      churchName: churchName ?? _state.churchName,
    };
    console.log("[ChurchMembership] Member set. Church:", churchName);
    notify();
  },

  /**
   * Called when the subscription lapses (detected via RevenueCat).
   * Removes personal Pro and advanced admin features; keeps community data.
   */
  downgrade() {
    _state = { ..._state, isPremium: false };
    console.log("[ChurchMembership] Community downgraded — subscription lapsed.");
    notify();
  },

  clearMember() {
    _state = { isChurchMember: false, isPremium: false, role: null, tier: null, churchName: null };
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
