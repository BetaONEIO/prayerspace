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

export const receivedPrayerRequests: ReceivedPrayerRequest[] = [
  {
    id: 'rpr1',
    senderId: 'c20',
    senderName: 'Sarah Jenkins',
    senderAvatar: 'https://randomuser.me/api/portraits/women/45.jpg',
    type: 'text',
    content: "I've been feeling a bit overwhelmed with work lately and would appreciate your prayers for peace and clarity. Thank you for being such a supportive friend.",
    sentAt: '10 minutes ago',
    prayerCount: 5,
    prayedByAvatars: [
      'https://randomuser.me/api/portraits/men/12.jpg',
      'https://randomuser.me/api/portraits/women/22.jpg',
    ],
  },
  {
    id: 'rpr2',
    senderId: 'c21',
    senderName: 'David Thompson',
    senderAvatar: 'https://randomuser.me/api/portraits/men/34.jpg',
    type: 'voice',
    content: "Heavenly Father, I just want to lift up David today. I ask that You would grant him peace and strength as he navigates this new season...",
    voiceDuration: '0:42',
    sentAt: '5 minutes ago',
    prayerCount: 3,
    prayedByAvatars: [
      'https://randomuser.me/api/portraits/women/24.jpg',
      'https://randomuser.me/api/portraits/men/15.jpg',
    ],
  },
];

export const currentUser = {
  id: 'user-1',
  name: 'Sarah',
  avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
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

export const favouriteContacts: Contact[] = [
  { id: 'c1', name: 'Dad', avatar: 'https://randomuser.me/api/portraits/men/45.jpg' },
  { id: 'c2', name: 'Mom', avatar: 'https://randomuser.me/api/portraits/women/44.jpg' },
  { id: 'c3', name: 'Sarah', avatar: 'https://randomuser.me/api/portraits/women/12.jpg' },
];

export const frequentlyPrayedFor: FrequentPrayedFor[] = [
  { id: 'fp1', name: 'Michael Scott', avatar: 'https://randomuser.me/api/portraits/men/32.jpg', prayerCount: 24, frequency: 'Everyday' },
  { id: 'fp2', name: 'Emma Watson', avatar: 'https://randomuser.me/api/portraits/women/68.jpg', prayerCount: 18, frequency: 'Weekly' },
  { id: 'fp3', name: 'Jason Bourne', avatar: 'https://randomuser.me/api/portraits/men/22.jpg', prayerCount: 12, frequency: 'Bi-Weekly' },
  { id: 'fp4', name: 'Chloe Price', avatar: 'https://randomuser.me/api/portraits/women/24.jpg', prayerCount: 9, frequency: 'Monthly' },
];

export const pendingRequests: PrayerRequest[] = [
  {
    id: 'pr1',
    authorId: 'c5',
    authorName: 'Mom',
    authorAvatar: '',
    content: 'Surgery tomorrow morning',
    createdAt: '2 hours ago',
    prayerCount: 3,
    prayedByAvatars: [],
  },
];

export const recentActivity: ActivityItem[] = [
  {
    id: 'a1',
    type: 'prayed_for_me',
    contactName: 'Pastor John',
    contactAvatar: 'https://randomuser.me/api/portraits/men/75.jpg',
    contactId: 'c10',
    message: 'prayed for your request',
    channel: 'In-App',
    time: '2 hours ago',
    dateGroup: 'Today',
    thanksSent: false,
    prayerContent: 'Healing and strength during this difficult season',
  },
  {
    id: 'a2',
    type: 'sent_inapp',
    contactName: 'Michael',
    contactAvatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    contactId: 'c1',
    message: 'You prayed for Michael',
    channel: 'In-App',
    time: 'Yesterday',
    dateGroup: 'Today',
  },
];

export const allContacts: Contact[] = [
  {
    id: 'c10',
    name: 'Alice Thompson',
    avatar: 'https://randomuser.me/api/portraits/women/62.jpg',
    lastPrayedFor: '3 days ago',
    status: 'online',
    email: 'alice@example.com',
    community: { id: 'castle-church', name: 'Castle Church', accentColor: '#C4521A', gradientColors: ['#9E3A0E', '#D96E27'] },
    bibleVerse: 'I can do all things through Christ who strengthens me.',
    bibleVerseRef: 'Philippians 4:13',
  },
  {
    id: 'c11',
    name: 'Bob Jenkins',
    avatar: 'https://randomuser.me/api/portraits/men/42.jpg',
    lastPrayedFor: undefined,
    requestNote: 'Pray for my job interview',
    email: 'bob@example.com',
    community: { id: 'castle-church', name: 'Castle Church', accentColor: '#C4521A', gradientColors: ['#9E3A0E', '#D96E27'] },
    bibleVerse: 'Trust in the Lord with all your heart and lean not on your own understanding.',
    bibleVerseRef: 'Proverbs 3:5',
  },
  {
    id: 'c12',
    name: 'Bella Thorne',
    avatar: 'https://randomuser.me/api/portraits/women/92.jpg',
    isNew: true,
    email: 'bella@example.com',
    bibleVerse: 'The Lord is my shepherd; I shall not want.',
    bibleVerseRef: 'Psalm 23:1',
  },
  {
    id: 'c13',
    name: 'Chris Evans',
    avatar: 'https://randomuser.me/api/portraits/men/12.jpg',
    lastPrayedFor: '1 week ago',
    email: 'chris@example.com',
    community: { id: 'hope-church', name: 'Hope Church', accentColor: '#2E6DB5', gradientColors: ['#1A4A8A', '#4A8FD9'] },
    bibleVerse: 'Be strong and courageous. Do not be afraid; do not be discouraged.',
    bibleVerseRef: 'Joshua 1:9',
  },
  {
    id: 'c14',
    name: 'Diana Prince',
    avatar: 'https://randomuser.me/api/portraits/women/33.jpg',
    lastPrayedFor: '2 days ago',
    email: 'diana@example.com',
    community: { id: 'castle-church', name: 'Castle Church', accentColor: '#C4521A', gradientColors: ['#9E3A0E', '#D96E27'] },
    bibleVerse: 'For I know the plans I have for you, declares the Lord, plans to prosper you.',
    bibleVerseRef: 'Jeremiah 29:11',
  },
  {
    id: 'c15',
    name: 'Elijah Wood',
    avatar: 'https://randomuser.me/api/portraits/men/55.jpg',
    lastPrayedFor: '5 days ago',
    email: 'elijah@example.com',
    community: { id: 'young-adults', name: 'Young Adults', accentColor: '#6B3FA0', gradientColors: ['#4A2578', '#9B59B6'] },
    bibleVerse: 'And we know that in all things God works for the good of those who love him.',
    bibleVerseRef: 'Romans 8:28',
  },
];

export const sentActivity: ActivityItem[] = [
  {
    id: 'sa1',
    type: 'sent_inapp',
    contactName: 'Michael',
    contactAvatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    message: 'Praying for your job interview today, stay strong!',
    channel: 'In-App',
    time: '10:45 AM',
    dateGroup: 'Today',
  },
  {
    id: 'sa2',
    type: 'sent_whatsapp',
    contactName: 'Sarah',
    contactAvatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    message: 'Just wanted to say I prayed for you this morning.',
    channel: 'WhatsApp',
    time: '8:12 AM',
    dateGroup: 'Today',
  },
  {
    id: 'sa3',
    type: 'sent_inapp',
    contactName: 'Chloe',
    contactAvatar: 'https://randomuser.me/api/portraits/women/24.jpg',
    message: 'God is with you in this difficult time.',
    channel: 'In-App',
    time: 'Yesterday, 6:30 PM',
    dateGroup: 'Yesterday',
  },
];

export const receivedActivity: ActivityItem[] = [
  {
    id: 'ra1',
    type: 'received',
    contactName: 'Pastor John',
    contactAvatar: 'https://randomuser.me/api/portraits/men/75.jpg',
    message: 'Prayed for your healing today. God bless!',
    channel: 'In-App',
    time: '9:30 AM',
    dateGroup: 'Today',
  },
  {
    id: 'ra2',
    type: 'received',
    contactName: 'Emma',
    contactAvatar: 'https://randomuser.me/api/portraits/women/68.jpg',
    message: 'Standing with you in prayer, sister.',
    channel: 'WhatsApp',
    time: 'Yesterday, 7:00 PM',
    dateGroup: 'Yesterday',
  },
];

export const chatMessages = [
  {
    id: 'm1',
    senderId: 'c1',
    text: 'Hey Sarah, thank you so much for praying for my interview yesterday! It really meant a lot.',
    time: '10:45 AM',
    isVoice: false,
  },
  {
    id: 'm2',
    senderId: 'user-1',
    text: 'Of course! I felt lead to pray for you. How did it go? God is good!',
    time: '11:02 AM',
    isVoice: false,
  },
  {
    id: 'm3',
    senderId: 'c1',
    text: '',
    time: '11:05 AM',
    isVoice: true,
    voiceDuration: '0:45',
  },
];

export const groupData = {
  id: 'g1',
  name: 'Grace Community',
  memberCount: 24,
  established: '2023',
  bannerImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  requests: [
    {
      id: 'gr1',
      authorName: 'Alice Thompson',
      authorAvatar: 'https://randomuser.me/api/portraits/women/62.jpg',
      content: 'Praying for peace as I start my new treatment tomorrow. Thank you all for the love.',
      createdAt: '2 hours ago',
      isUrgent: true,
      prayerCount: 10,
      prayedByAvatars: [
        'https://randomuser.me/api/portraits/men/32.jpg',
        'https://randomuser.me/api/portraits/women/44.jpg',
      ],
    },
  ],
};
