export interface ContactCommunity {
  id: string;
  name: string;
  accentColor: string;
  gradientColors: [string, string];
}

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  email?: string;
  phone?: string;
  lastPrayedFor?: string;
  status?: 'online' | 'offline';
  requestNote?: string;
  isNew?: boolean;
  community?: ContactCommunity;
  bibleVerse?: string;
  bibleVerseRef?: string;
}

export type PrayerStatus =
  | "ongoing"
  | "answered"
  | "still_need_prayer"
  | "archived";

export interface ReceivedPrayerRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  type: 'text' | 'voice';
  content: string;
  voiceDuration?: string;
  sentAt: string;
  prayerCount: number;
  prayedByAvatars: string[];
  eventDate?: string | null;
  eventTime?: string | null;
  hasPrayerDate?: boolean;
  reminderSent?: boolean;
  followUpPromptShown?: boolean;
  status?: PrayerStatus;
}

export interface PrayerRequest {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
  isUrgent?: boolean;
  isTimeSensitive?: boolean;
  isAnonymous?: boolean;
  tags?: string[];
  audience?: string;
  prayerCount: number;
  commentCount?: number;
  prayedByAvatars: string[];
  originalPostId?: string;
  eventDate?: string | null;
  eventTime?: string | null;
  hasPrayerDate?: boolean;
  reminderSent?: boolean;
  followUpPromptShown?: boolean;
  status?: PrayerStatus;
}

export interface ActivityItem {
  id: string;
  type: 'sent_inapp' | 'sent_whatsapp' | 'sent_sms' | 'received' | 'prayed_for_me';
  contactName: string;
  contactAvatar?: string;
  contactId?: string;
  message: string;
  channel: string;
  time: string;
  dateGroup: string;
  thanksSent?: boolean;
  prayerContent?: string;
}

export const receivedPrayerRequests: ReceivedPrayerRequest[] = [];

export const currentUser = {
  id: 'user-1',
  name: 'You',
  avatar: '',
};

export const verseOfTheDay = {
  text: '"Rejoice always, pray continually, give thanks in all circumstances."',
  reference: '1 Thessalonians 5:16-18',
};

export const frequentContacts: Contact[] = [];

export interface FrequentPrayedFor {
  id: string;
  name: string;
  avatar: string;
  prayerCount: number;
  frequency: string;
}

export const favouriteContacts: Contact[] = [];

export const frequentlyPrayedFor: FrequentPrayedFor[] = [];

export const pendingRequests: PrayerRequest[] = [];

export const recentActivity: ActivityItem[] = [];

export const allContacts: Contact[] = [];

export const sentActivity: ActivityItem[] = [];

export const receivedActivity: ActivityItem[] = [];

export const chatMessages: {
  id: string;
  senderId: string;
  text: string;
  time: string;
  isVoice: boolean;
  voiceDuration?: string;
}[] = [];

export const groupData = {
  id: 'g1',
  name: 'Grace Community',
  memberCount: 0,
  established: '',
  bannerImage: '',
  requests: [] as {
    id: string;
    authorName: string;
    authorAvatar: string;
    content: string;
    createdAt: string;
    isUrgent: boolean;
    prayerCount: number;
    prayedByAvatars: string[];
  }[],
};
