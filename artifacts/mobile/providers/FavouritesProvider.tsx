import { useState, useCallback, useMemo, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import createContextHook from "@nkzw/create-context-hook";
import { usePrayer } from "@/providers/PrayerProvider";
import { ALL_RECIPIENTS } from "@/providers/SelectedRecipientsProvider";
import { useAuth } from "@/providers/AuthProvider";
import { createAccountLocalStorage, getLocalDataIdentity } from "@/lib/accountLocalData";
import { Alert } from "react-native";

const STORAGE_KEY = "prayerful_favourites";

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  email?: string;
  phone?: string;
}

function lookupAvatar(id: string): string {
  const fromRecipients = ALL_RECIPIENTS.find((r) => r.id === id);
  if (fromRecipients?.avatar) return fromRecipients.avatar;
  return "";
}

export interface FrequentContact {
  id: string;
  name: string;
  avatar: string;
  prayerCount: number;
  lastPrayed: number;
  frequency: string;
}

function getFrequencyLabel(count: number): string {
  if (count >= 20) return "Everyday";
  if (count >= 10) return "Weekly";
  if (count >= 5) return "Bi-Weekly";
  return "Monthly";
}

export const [FavouritesProvider, useFavourites] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { user, localDataEpoch } = useAuth();
  const userId = user?.id ?? null;
  const storage = useMemo(
    () => createAccountLocalStorage(AsyncStorage, getLocalDataIdentity()),
    [userId, localDataEpoch],
  );
  const { prayers } = usePrayer();
  const [favourites, setFavourites] = useState<Contact[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  const favouritesQuery = useQuery({
    queryKey: ["favourites", userId],
    enabled: !!userId,
    queryFn: async () => {
      console.log("[FavouritesProvider] Loading favourites from AsyncStorage");
      const stored = await storage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Contact[];
        console.log("[FavouritesProvider] Loaded", parsed.length, "favourites");
        return parsed;
      }
      return [];
    },
  });

  useEffect(() => {
    if (favouritesQuery.data) {
      setFavourites(favouritesQuery.data);
      setIsHydrated(true);
    }
  }, [favouritesQuery.data]);

  const saveFavouritesMutation = useMutation({
    mutationFn: async (updated: Contact[]) => {
      await storage.setItem(STORAGE_KEY, JSON.stringify(updated));
      console.log("[FavouritesProvider] Saved", updated.length, "favourites");
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["favourites", userId] });
    },
    onError: () => {
      if (storage.isActive()) {
        Alert.alert("Could not save favourites", "Please retry before leaving this screen.");
      }
    },
  });

  const assertCanEdit = () => {
    storage.assertActive();
    if (!isHydrated || favouritesQuery.error) {
      throw new Error("Please wait until your saved favourites have loaded before editing.");
    }
  };

  const addFavourite = useCallback(
    (contact: Contact) => {
      assertCanEdit();
      setFavourites((prev) => {
        if (prev.find((f) => f.id === contact.id)) return prev;
        const updated = [...prev, contact];
        saveFavouritesMutation.mutate(updated);
        return updated;
      });
    },
    [saveFavouritesMutation, storage, isHydrated, favouritesQuery.error]
  );

  const addFavourites = useCallback(
    (contacts: Contact[]) => {
      assertCanEdit();
      setFavourites((prev) => {
        const newOnes = contacts.filter((c) => !prev.find((f) => f.id === c.id));
        if (newOnes.length === 0) return prev;
        const updated = [...prev, ...newOnes];
        saveFavouritesMutation.mutate(updated);
        return updated;
      });
    },
    [saveFavouritesMutation, storage, isHydrated, favouritesQuery.error]
  );

  const removeFavourite = useCallback(
    (id: string) => {
      assertCanEdit();
      setFavourites((prev) => {
        const updated = prev.filter((f) => f.id !== id);
        saveFavouritesMutation.mutate(updated);
        return updated;
      });
    },
    [saveFavouritesMutation, storage, isHydrated, favouritesQuery.error]
  );

  const frequentlyPrayedFor = useMemo((): FrequentContact[] => {
    const counts: Record<
      string,
      { count: number; name: string; lastPrayed: number }
    > = {};

    for (const prayer of prayers) {
      if (prayer.type !== "sent") continue;
      if (!counts[prayer.contactId]) {
        counts[prayer.contactId] = {
          count: 0,
          name: prayer.contactName,
          lastPrayed: 0,
        };
      }
      counts[prayer.contactId].count++;
      if (prayer.timestamp > counts[prayer.contactId].lastPrayed) {
        counts[prayer.contactId].lastPrayed = prayer.timestamp;
      }
    }

    const result = Object.entries(counts)
      .map(([id, data]) => ({
        id,
        name: data.name,
        avatar: lookupAvatar(id),
        prayerCount: data.count,
        lastPrayed: data.lastPrayed,
        frequency: getFrequencyLabel(data.count),
      }))
      .sort(
        (a, b) =>
          b.prayerCount - a.prayerCount || b.lastPrayed - a.lastPrayed
      );

    console.log("[FavouritesProvider] Computed", result.length, "frequently prayed for");
    return result;
  }, [prayers]);

  return useMemo(
    () => ({
      favourites,
      frequentlyPrayedFor,
      addFavourite,
      addFavourites,
      removeFavourite,
      isLoading: !!userId && !favouritesQuery.error && !isHydrated,
      loadError: favouritesQuery.error,
      retryLocalData: favouritesQuery.refetch,
    }),
    [
      favourites,
      frequentlyPrayedFor,
      addFavourite,
      addFavourites,
      removeFavourite,
      favouritesQuery.isLoading,
      userId,
      isHydrated,
      favouritesQuery.error,
      favouritesQuery.refetch,
    ]
  );
});
