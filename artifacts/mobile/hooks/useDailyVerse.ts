import { useQuery } from "@tanstack/react-query";
import { Platform } from "react-native";

const MANIFEST_URL =
  "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/373ggl7ghz15hrx272g26.json";

interface VerseEntry {
  day: number;
  reference: string;
  apiUrl: string;
}

interface VerseApiResponse {
  reference: string;
  text: string;
  translation_name: string;
}

export interface DailyVerse {
  text: string;
  reference: string;
}

const FALLBACK_VERSES: DailyVerse[] = [
  { text: '"For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life."', reference: "John 3:16" },
  { text: '"I can do all this through him who gives me strength."', reference: "Philippians 4:13" },
  { text: '"The Lord is my shepherd, I lack nothing."', reference: "Psalm 23:1" },
  { text: '"Trust in the Lord with all your heart and lean not on your own understanding."', reference: "Proverbs 3:5" },
  { text: '"Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go."', reference: "Joshua 1:9" },
  { text: '"For I know the plans I have for you," declares the Lord, "plans to prosper you and not to harm you, plans to give you hope and a future."', reference: "Jeremiah 29:11" },
  { text: '"And we know that in all things God works for the good of those who love him, who have been called according to his purpose."', reference: "Romans 8:28" },
  { text: '"Come to me, all you who are weary and burdened, and I will give you rest."', reference: "Matthew 11:28" },
  { text: '"The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you."', reference: "Numbers 6:24-25" },
  { text: '"Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God."', reference: "Philippians 4:6" },
  { text: '"Cast all your anxiety on him because he cares for you."', reference: "1 Peter 5:7" },
  { text: '"But those who hope in the Lord will renew their strength. They will soar on wings like eagles."', reference: "Isaiah 40:31" },
];

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const day = Math.floor(diff / oneDay);
  return Math.min(Math.max(day, 1), 365);
}

function getFallbackVerse(dayOfYear: number): DailyVerse {
  return FALLBACK_VERSES[(dayOfYear - 1) % FALLBACK_VERSES.length];
}

async function fetchManifest(): Promise<VerseEntry[]> {
  if (Platform.OS === "web") {
    throw new Error("CORS: skipping manifest fetch on web");
  }
  console.log("[useDailyVerse] Fetching verse manifest...");
  const res = await fetch(MANIFEST_URL);
  if (!res.ok) throw new Error("Failed to fetch verse manifest");
  const data: VerseEntry[] = await res.json();
  console.log(`[useDailyVerse] Manifest loaded: ${data.length} entries`);
  return data;
}

async function fetchVerse(apiUrl: string): Promise<VerseApiResponse> {
  console.log(`[useDailyVerse] Fetching verse from: ${apiUrl}`);
  const res = await fetch(apiUrl);
  if (!res.ok) throw new Error("Failed to fetch verse");
  const data: VerseApiResponse = await res.json();
  console.log(`[useDailyVerse] Verse fetched: ${data.reference}`);
  return data;
}

export function useDailyVerse() {
  const dayOfYear = getDayOfYear();

  const manifestQuery = useQuery<VerseEntry[]>({
    queryKey: ["bible-verse-manifest"],
    queryFn: fetchManifest,
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24 * 7,
    retry: Platform.OS === "web" ? false : 3,
  });

  const entry = manifestQuery.data
    ? manifestQuery.data.find((e) => e.day === dayOfYear) ?? manifestQuery.data[0]
    : null;

  const verseQuery = useQuery<VerseApiResponse>({
    queryKey: ["bible-verse-daily", dayOfYear],
    queryFn: () => fetchVerse(entry!.apiUrl),
    enabled: !!entry,
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24 * 7,
  });

  const isError = manifestQuery.isError || verseQuery.isError;
  const fallback = getFallbackVerse(dayOfYear);

  const verse: DailyVerse | null = verseQuery.data
    ? {
        text: `"${verseQuery.data.text}"`,
        reference: verseQuery.data.reference,
      }
    : isError || manifestQuery.isError
    ? fallback
    : null;

  return {
    verse,
    isLoading: !isError && (manifestQuery.isLoading || verseQuery.isLoading),
    isError,
  };
}
