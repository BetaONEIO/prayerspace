import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Animated,
  Keyboard,
  Alert,
  Share,
  Linking,
  TouchableOpacity,
} from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Users,
  Search,
  Edit3,
  MoreHorizontal,
  Heart,
  MessageCircle,
  X,
  Send,
  ChevronRight,
  Plus,
  Menu,
  ChevronDown,
  Check,
  HandHeart,
  Sparkles,
  ArrowUp,
  Clock,
  LogIn,
  Lock,
  CheckCircle2,
  Repeat2,
  Archive,
  Globe,
  CheckCircle,
  HeartHandshake,
  ThumbsUp,
  EyeOff,
  Trash2,
  Share2,
  Flag,
  Link2,
  Copy,
  Crown,
  Award,
  Bell,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/providers/ThemeProvider";
import { LightColors as Colors, ThemeColors } from "@/constants/colors";

const CommunityColorsCtx = React.createContext<ThemeColors>(Colors);
const useCColors = () => React.useContext(CommunityColorsCtx);
import StatusUpdateModal from "@/components/StatusUpdateModal";
import NavigationDrawer from "@/components/NavigationDrawer";
import NotificationsPanel from "@/components/NotificationsPanel";
import ImageAttachment from "@/components/ImageAttachment";
import ImageViewer from "@/components/ImageViewer";
import { useTabSwipe } from "@/hooks/useTabSwipe";
import { usePrayer } from "@/providers/PrayerProvider";
import { useNotifications } from "@/providers/NotificationsProvider";

type Tab = "Feed" | "Community" | "My Groups";

interface Community {
  id: string;
  name: string;
  memberCount: number;
  accentColor: string;
  iconLetter: string;
  gradientColors: [string, string, string];
  bannerImage: string;
  isPrivate?: boolean;
  password?: string;
  description?: string;
  isOfficial?: boolean;
}

interface Comment {
  id: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  time: string;
}

type UpdateTag = 'still_need_prayer' | 'answered' | 'thank_you';

interface FeedPost {
  id: string;
  communityId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  category: string;
  tags: string[];
  timeLabel: string;
  postedAt: string;
  isTimeSensitive?: boolean;
  content: string;
  prayerCount: number;
  commentCount: number;
  prayedByAvatars: string[];
  comments: Comment[];
  originalPostId?: string;
  originalPost?: FeedPost;
  updateTag?: UpdateTag;
  isArchived?: boolean;
  imageUrl?: string;
}

const COMMUNITIES: Community[] = [
  {
    id: "castle-church",
    name: "Castle Church",
    memberCount: 247,
    accentColor: "#C4521A",
    iconLetter: "C",
    gradientColors: ["#9E3A0E", "#C4521A", "#D96E27"],
    bannerImage: "https://images.unsplash.com/photo-1548625149-720754507716?w=400&q=80",
    description: "A vibrant community rooted in faith, prayer, and serving one another.",
  },
  {
    id: "hope-church",
    name: "Hope Church",
    memberCount: 134,
    accentColor: "#2E6DB5",
    iconLetter: "H",
    gradientColors: ["#1A4A8A", "#2E6DB5", "#4A8FD9"],
    bannerImage: "https://images.unsplash.com/photo-1476231682828-37e571bc172f?w=400&q=80",
    description: "Where faith meets hope. Join us in lifting each other through prayer.",
  },
  {
    id: "city-light",
    name: "City Light Church",
    memberCount: 312,
    accentColor: "#B5820A",
    iconLetter: "L",
    gradientColors: ["#7A5400", "#B5820A", "#D4A017"],
    bannerImage: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=80",
    description: "A lighthouse community praying for our city and beyond.",
  },
  {
    id: "young-adults",
    name: "Young Adults",
    memberCount: 58,
    accentColor: "#6B3FA0",
    iconLetter: "Y",
    gradientColors: ["#4A2578", "#6B3FA0", "#9B59B6"],
    bannerImage: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80",
    isPrivate: true,
    password: "YOUTH2024",
    description: "A private space for our young adults family. For members only.",
  },
  {
    id: "prayer-partners",
    name: "Prayer Partners",
    memberCount: 12,
    accentColor: "#1A7A52",
    iconLetter: "P",
    gradientColors: ["#0F5238", "#1A7A52", "#27A06E"],
    bannerImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
    isPrivate: true,
    password: "PRAY123",
    description: "A close-knit group of intercessors. By invitation only.",
  },
  {
    id: "pray-for-israel",
    name: "Pray for Israel",
    memberCount: 3847,
    accentColor: "#0055AA",
    iconLetter: "I",
    gradientColors: ["#003F80", "#0055AA", "#1A7ACC"] as [string, string, string],
    bannerImage: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80",
    description: "United in prayer for the peace of Jerusalem and the people of Israel. Pray for the peace of Jerusalem. \u2014 Psalm 122:6",
    isOfficial: true,
  },
  {
    id: "worldwide-prayer",
    name: "Worldwide Prayer",
    memberCount: 12841,
    accentColor: "#1A7A52",
    iconLetter: "W",
    gradientColors: ["#0F5238", "#1A7A52", "#27A06E"] as [string, string, string],
    bannerImage: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&q=80",
    description: "A global community united in intercession for the nations. Praying together across every border and language.",
    isOfficial: true,
  },
];

const AVATAR_NAME_MAP: Record<string, string> = {
  "https://randomuser.me/api/portraits/men/32.jpg": "Michael Chen",
  "https://randomuser.me/api/portraits/women/44.jpg": "Emma Thompson",
  "https://randomuser.me/api/portraits/men/85.jpg": "David Wilson",
  "https://randomuser.me/api/portraits/women/62.jpg": "Alice Browne",
  "https://randomuser.me/api/portraits/men/75.jpg": "Pastor John",
  "https://randomuser.me/api/portraits/women/24.jpg": "Chloe Martin",
  "https://randomuser.me/api/portraits/men/55.jpg": "James Foster",
  "https://randomuser.me/api/portraits/women/55.jpg": "Rachel Kim",
  "https://randomuser.me/api/portraits/men/14.jpg": "Tom Adeyemi",
  "https://randomuser.me/api/portraits/women/33.jpg": "Diana Prince",
  "https://randomuser.me/api/portraits/men/22.jpg": "Nathan Brooks",
  "https://randomuser.me/api/portraits/women/38.jpg": "Sophie Lane",
  "https://randomuser.me/api/portraits/men/63.jpg": "Carlos Rivera",
  "https://randomuser.me/api/portraits/men/12.jpg": "Owen Clarke",
  "https://randomuser.me/api/portraits/women/68.jpg": "Emma Wilson",
  "https://randomuser.me/api/portraits/men/42.jpg": "Bob Jenkins",
  "https://randomuser.me/api/portraits/women/47.jpg": "Naomi Okafor",
};

const ALL_FEED_POSTS: FeedPost[] = [
  {
    id: "f1",
    communityId: "castle-church",
    authorId: "user-1",
    authorName: "Sarah",
    authorAvatar: "https://randomuser.me/api/portraits/women/62.jpg",
    category: "SURGERY",
    tags: ["healing", "urgent", "family"],
    timeLabel: "TODAY",
    postedAt: "Today at 9:14 AM",
    isTimeSensitive: true,
    content:
      '"My grandmother is going into surgery tomorrow morning for her hip. Please pray for the doctors and for her peace of mind during the procedure."',
    prayerCount: 12,
    commentCount: 5,
    prayedByAvatars: [
      "https://randomuser.me/api/portraits/men/32.jpg",
      "https://randomuser.me/api/portraits/women/44.jpg",
      "https://randomuser.me/api/portraits/men/85.jpg",
    ],
    comments: [
      {
        id: "c1",
        authorName: "Pastor John",
        authorAvatar: "https://randomuser.me/api/portraits/men/75.jpg",
        text: "Praying for complete peace and healing over her 🙏",
        time: "1 hour ago",
      },
      {
        id: "c2",
        authorName: "Diana Prince",
        authorAvatar: "https://randomuser.me/api/portraits/women/33.jpg",
        text: "Standing in agreement with you. God's got this!",
        time: "45 min ago",
      },
    ],
  },
  {
    id: "f2",
    communityId: "castle-church",
    authorId: "c13",
    authorName: "David Chen",
    authorAvatar: "https://randomuser.me/api/portraits/men/85.jpg",
    category: "GUIDANCE",
    tags: ["career", "wisdom"],
    timeLabel: "8H AGO",
    postedAt: "Today at 1:30 AM",
    content:
      "Facing some big decisions at work regarding a career change. Seeking wisdom and clarity on the next steps to take during my interview this coming Monday.",
    prayerCount: 8,
    commentCount: 3,
    prayedByAvatars: [
      "https://randomuser.me/api/portraits/women/62.jpg",
      "https://randomuser.me/api/portraits/men/75.jpg",
    ],
    comments: [
      {
        id: "c3",
        authorName: "Chloe",
        authorAvatar: "https://randomuser.me/api/portraits/women/24.jpg",
        text: "Praying for clear direction and confidence for you! ❤️",
        time: "6 hours ago",
      },
    ],
  },
  {
    id: "f3",
    communityId: "castle-church",
    authorId: "user-1",
    authorName: "Sarah",
    authorAvatar: "https://randomuser.me/api/portraits/women/62.jpg",
    category: "HEALING",
    tags: ["healing", "hospital", "faith"],
    timeLabel: "YESTERDAY",
    postedAt: "Yesterday at 7:45 AM",
    isTimeSensitive: true,
    content:
      '"Please keep my mum in prayer — she was rushed to hospital this morning. Doctors are still running tests. We trust in the Lord completely."',
    prayerCount: 34,
    commentCount: 11,
    prayedByAvatars: [
      "https://randomuser.me/api/portraits/men/32.jpg",
      "https://randomuser.me/api/portraits/women/24.jpg",
      "https://randomuser.me/api/portraits/men/55.jpg",
    ],
    comments: [
      {
        id: "c4",
        authorName: "Pastor John",
        authorAvatar: "https://randomuser.me/api/portraits/men/75.jpg",
        text: "Lifting her up in prayer right now. God is the healer. 🙏",
        time: "Yesterday",
      },
    ],
  },
  {
    id: "f4",
    communityId: "castle-church",
    authorId: "c11",
    authorName: "Bob Jenkins",
    authorAvatar: "https://randomuser.me/api/portraits/men/42.jpg",
    category: "PRAISE",
    tags: ["praise", "testimony", "healing"],
    timeLabel: "2 DAYS AGO",
    postedAt: "Apr 11 at 3:20 PM",
    content:
      "God showed up in an incredible way! My daughter got the all-clear from her doctor after months of treatment. To God be all the glory! 🙌",
    prayerCount: 47,
    commentCount: 18,
    prayedByAvatars: [
      "https://randomuser.me/api/portraits/women/62.jpg",
      "https://randomuser.me/api/portraits/women/68.jpg",
      "https://randomuser.me/api/portraits/men/42.jpg",
    ],
    comments: [
      {
        id: "c5",
        authorName: "Alice Thompson",
        authorAvatar: "https://randomuser.me/api/portraits/women/62.jpg",
        text: "This made me cry tears of joy! To God be the glory! 🙌",
        time: "2 days ago",
      },
    ],
  },
  {
    id: "f5",
    communityId: "hope-church",
    authorId: "c15",
    authorName: "Marcus Webb",
    authorAvatar: "https://randomuser.me/api/portraits/men/22.jpg",
    category: "FAMILY",
    tags: ["marriage", "family", "wisdom"],
    timeLabel: "3H AGO",
    postedAt: "Today at 6:50 AM",
    content:
      "Asking for prayer over my marriage — we are going through a difficult season and need God's wisdom and love to fill our home. Thank you all.",
    prayerCount: 19,
    commentCount: 6,
    prayedByAvatars: [
      "https://randomuser.me/api/portraits/women/55.jpg",
      "https://randomuser.me/api/portraits/men/14.jpg",
    ],
    comments: [],
  },
  {
    id: "f6",
    communityId: "hope-church",
    authorId: "c14",
    authorName: "Naomi Okafor",
    authorAvatar: "https://randomuser.me/api/portraits/women/47.jpg",
    category: "PRAISE",
    tags: ["praise", "testimony", "career"],
    timeLabel: "YESTERDAY",
    postedAt: "Yesterday at 2:15 PM",
    content:
      "After months of job searching I finally received an offer today! God is so faithful. Thank you Hope Church for praying with me through this. 🙏",
    prayerCount: 52,
    commentCount: 14,
    prayedByAvatars: [
      "https://randomuser.me/api/portraits/men/22.jpg",
      "https://randomuser.me/api/portraits/women/38.jpg",
      "https://randomuser.me/api/portraits/men/63.jpg",
    ],
    comments: [],
  },
];

const ALL_COMMUNITY_POSTS: FeedPost[] = [
  {
    id: "cp1",
    communityId: "castle-church",
    authorId: "c13",
    authorName: "Pastor John",
    authorAvatar: "https://randomuser.me/api/portraits/men/75.jpg",
    category: "PRAYER REQUEST",
    tags: ["community", "outreach", "service"],
    timeLabel: "3H AGO",
    postedAt: "Today at 6:30 AM",
    content:
      '"Asking the community to join in prayer for our neighbourhood outreach this weekend. May God open hearts and doors as we serve."',
    prayerCount: 28,
    commentCount: 9,
    prayedByAvatars: [
      "https://randomuser.me/api/portraits/women/62.jpg",
      "https://randomuser.me/api/portraits/men/32.jpg",
      "https://randomuser.me/api/portraits/women/44.jpg",
    ],
    comments: [],
  },
  {
    id: "cp2",
    communityId: "castle-church",
    authorId: "c12",
    authorName: "Chloe Martin",
    authorAvatar: "https://randomuser.me/api/portraits/women/24.jpg",
    category: "GRATITUDE",
    tags: ["gratitude", "community", "encouragement"],
    timeLabel: "5H AGO",
    postedAt: "Today at 4:15 AM",
    content:
      "Grateful for this prayer community. Coming in here every day and seeing people lift each other up genuinely keeps me going. You all are a blessing. 💛",
    prayerCount: 21,
    commentCount: 7,
    prayedByAvatars: [
      "https://randomuser.me/api/portraits/women/33.jpg",
      "https://randomuser.me/api/portraits/men/12.jpg",
    ],
    comments: [],
  },
  {
    id: "cp3",
    communityId: "hope-church",
    authorId: "c14",
    authorName: "Pastor Linda",
    authorAvatar: "https://randomuser.me/api/portraits/women/75.jpg",
    category: "ANNOUNCEMENT",
    tags: ["event", "breakfast", "worship"],
    timeLabel: "TODAY",
    postedAt: "Today at 8:00 AM",
    content:
      "This Sunday we are hosting a prayer breakfast before service at 8:30am. All are welcome. Come expecting God to move! ☕🙏",
    prayerCount: 14,
    commentCount: 4,
    prayedByAvatars: [
      "https://randomuser.me/api/portraits/men/22.jpg",
      "https://randomuser.me/api/portraits/women/47.jpg",
    ],
    comments: [],
  },
];

interface MyGroup {
  id: string;
  name: string;
  memberCount: number;
  lastActivity: string;
  avatar: string;
  activeRequests: number;
}

const NOTIFICATION_GROUP_MAP: Record<string, MyGroup> = {
  "g1": {
    id: "notif_g1",
    name: "Morning Grace Circle",
    memberCount: 18,
    lastActivity: "Just now",
    avatar: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80",
    activeRequests: 2,
  },
};

const INITIAL_MY_GROUPS: MyGroup[] = [
  {
    id: "g1",
    name: "Grace Community",
    memberCount: 24,
    lastActivity: "2 hours ago",
    avatar: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80",
    activeRequests: 3,
  },
  {
    id: "g2",
    name: "Morning Prayer Circle",
    memberCount: 11,
    lastActivity: "Yesterday",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
    activeRequests: 1,
  },
  {
    id: "g3",
    name: "Family First",
    memberCount: 6,
    lastActivity: "3 days ago",
    avatar: "https://images.unsplash.com/photo-1511895426328-dc8714191011?w=400&q=80",
    activeRequests: 0,
  },
];

interface JoinableGroup {
  password: string;
  name: string;
  avatar: string;
  memberCount: number;
  description: string;
}

const JOINABLE_GROUPS: Record<string, JoinableGroup> = {
  "FAITH2024": {
    password: "FAITH2024",
    name: "Faith Warriors",
    avatar: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=400&q=80",
    memberCount: 42,
    description: "A group dedicated to strengthening faith through daily prayer and scripture.",
  },
  "HOPE123": {
    password: "HOPE123",
    name: "Hope Collective",
    avatar: "https://images.unsplash.com/photo-1476231682828-37e571bc172f?w=400&q=80",
    memberCount: 19,
    description: "Supporting each other through prayer, encouragement, and community.",
  },
  "GRACE99": {
    password: "GRACE99",
    name: "Grace Fellowship",
    avatar: "https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&q=80",
    memberCount: 67,
    description: "A welcoming space for prayer, worship, and growing together in grace.",
  },
};

export default function CommunityScreen() {
  const themeColors = useThemeColors();
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<Tab>((tabParam as Tab) ?? "Feed");

  useEffect(() => {
    if (tabParam && ["Feed", "Community", "My Groups"].includes(tabParam)) {
      setActiveTab(tabParam as Tab);
    }
  }, [tabParam]);
  const [prayedPosts, setPrayedPosts] = useState<Set<string>>(new Set());
  const [commentPost, setCommentPost] = useState<FeedPost | null>(null);
  const [allFeedPosts, setAllFeedPosts] = useState<FeedPost[]>(ALL_FEED_POSTS);
  const [allCommunityPosts, setAllCommunityPosts] = useState<FeedPost[]>(ALL_COMMUNITY_POSTS);
  const [repostTarget, setRepostTarget] = useState<FeedPost | null>(null);
  const [postActionsTarget, setPostActionsTarget] = useState<FeedPost | null>(null);
  const [archivedPostIds, setArchivedPostIds] = useState<Set<string>>(new Set());
  const [hiddenPostIds, setHiddenPostIds] = useState<Set<string>>(new Set());
  const [statusModalVisible, setStatusModalVisible] = useState<boolean>(false);
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false);
  const [switcherVisible, setSwitcherVisible] = useState<boolean>(false);
  const [joinedCommunities, setJoinedCommunities] = useState<Community[]>([]);
  const [activeCommunity, setActiveCommunity] = useState<Community>(COMMUNITIES[0]);
  const [browseCommunitiesVisible, setBrowseCommunitiesVisible] = useState<boolean>(false);
  const [stopPrayingPost, setStopPrayingPost] = useState<{ id: string; post: FeedPost } | null>(null);
  const [prayingUsersPost, setPrayingUsersPost] = useState<FeedPost | null>(null);
  const [shareTarget, setShareTarget] = useState<FeedPost | null>(null);
  const [hasNewUpdates, setHasNewUpdates] = useState<boolean>(true);
  const newUpdateAnim = useRef(new Animated.Value(0)).current;
  const [prayingForPrompt, setPrayingForPrompt] = useState<{ post: FeedPost } | null>(null);
  const prayingForPromptAnim = useRef(new Animated.Value(0)).current;
  const promptTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { addJournalEntry, addArchivedPost } = usePrayer();
  const { unreadCount: notifUnreadCount } = useNotifications();
  const [notifVisible, setNotifVisible] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    if (hasNewUpdates) {
      Animated.spring(newUpdateAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    }
  }, [hasNewUpdates, newUpdateAnim]);

  const handleLoadNewUpdates = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(newUpdateAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setHasNewUpdates(false));
  }, [newUpdateAnim]);

  const handleAvatarPress = useCallback((authorId: string) => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    router.push(`/user/${authorId}`);
  }, [router]);

  const handleTabPress = useCallback((tab: Tab) => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setActiveTab(tab);
  }, []);

  const handleSelectCommunity = useCallback((community: Community) => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveCommunity(community);
    setSwitcherVisible(false);
  }, []);

  const handleJoinCommunity = useCallback((community: Community) => {
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setJoinedCommunities((prev) => {
      if (prev.find((c) => c.id === community.id)) return prev;
      return [...prev, community];
    });
    setActiveCommunity(community);
    setBrowseCommunitiesVisible(false);
    console.log("[Community] Joined community:", community.name);
  }, []);

  const handleStopPraying = useCallback(() => {
    if (!stopPrayingPost) return;
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPrayedPosts((prev) => {
      const next = new Set(prev);
      next.delete(stopPrayingPost.id);
      return next;
    });
    setStopPrayingPost(null);
  }, [stopPrayingPost]);

  const showPrayingForPrompt = useCallback((post: FeedPost) => {
    if (promptTimeoutRef.current) clearTimeout(promptTimeoutRef.current);
    prayingForPromptAnim.setValue(0);
    setPrayingForPrompt({ post });
    Animated.spring(prayingForPromptAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 70,
      friction: 12,
    }).start();
    promptTimeoutRef.current = setTimeout(() => {
      Animated.timing(prayingForPromptAnim, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }).start(() => setPrayingForPrompt(null));
    }, 5000);
  }, [prayingForPromptAnim]);

  const dismissPrayingForPrompt = useCallback(() => {
    if (promptTimeoutRef.current) clearTimeout(promptTimeoutRef.current);
    Animated.timing(prayingForPromptAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setPrayingForPrompt(null));
  }, [prayingForPromptAnim]);

  const handleAddToPrayingFor = useCallback(() => {
    if (!prayingForPrompt) return;
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addJournalEntry({
      title: `Praying for ${prayingForPrompt.post.authorName}`,
      body: prayingForPrompt.post.content.replace(/^"|"$/g, ""),
      tag: "praying_for",
    });
    dismissPrayingForPrompt();
    console.log("[Community] Added to Praying For:", prayingForPrompt.post.authorName);
  }, [prayingForPrompt, addJournalEntry, dismissPrayingForPrompt]);

  const handlePray = useCallback((postId: string, post: FeedPost) => {
    const alreadyPraying = prayedPosts.has(postId);
    if (alreadyPraying) {
      if (Platform.OS !== "web") void Haptics.selectionAsync();
      setStopPrayingPost({ id: postId, post });
    } else {
      if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPrayedPosts((prev) => {
        const next = new Set(prev);
        next.add(postId);
        return next;
      });
      showPrayingForPrompt(post);
    }
  }, [prayedPosts, showPrayingForPrompt]);

  const handlePrayingUsersPress = useCallback((post: FeedPost) => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setPrayingUsersPost(post);
  }, []);

  const handleOpenComments = useCallback((post: FeedPost) => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setCommentPost(post);
  }, []);

  const handleRepostWithUpdate = useCallback((post: FeedPost) => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRepostTarget(post);
  }, []);

  const handleStatusSubmit = useCallback((text: string, tags: string[], isTimeSensitive: boolean, isAnonymous: boolean, imageUri?: string | null) => {
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newPost: FeedPost = {
      id: `status_${Date.now()}`,
      communityId: activeCommunity.id,
      authorId: isAnonymous ? "anonymous" : currentUserId,
      authorName: isAnonymous ? "Anonymous" : "Sarah",
      authorAvatar: isAnonymous ? "" : "https://randomuser.me/api/portraits/women/68.jpg",
      category: tags.length > 0 ? tags[0].replace(/_/g, ' ').toUpperCase() : "UPDATE",
      tags: tags,
      timeLabel: "JUST NOW",
      postedAt: "Just now",
      isTimeSensitive: isTimeSensitive,
      content: text,
      prayerCount: 0,
      commentCount: 0,
      prayedByAvatars: [],
      comments: [],
      imageUrl: imageUri ?? undefined,
    };
    setAllFeedPosts((prev) => [newPost, ...prev]);
    setAllCommunityPosts((prev) => [newPost, ...prev]);
    console.log("[Community] Status update posted:", newPost.id, "timeSensitive:", isTimeSensitive, "anonymous:", isAnonymous, "hasImage:", !!imageUri);
  }, [activeCommunity.id]);

  const handleSubmitRepost = useCallback((originalPost: FeedPost, updateText: string, updateTag?: UpdateTag) => {
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newPost: FeedPost = {
      id: `update_${Date.now()}`,
      communityId: originalPost.communityId,
      authorId: originalPost.authorId,
      authorName: originalPost.authorName,
      authorAvatar: originalPost.authorAvatar,
      category: "UPDATE",
      tags: updateTag ? [updateTag.replace('_', ' ')] : [],
      timeLabel: "JUST NOW",
      postedAt: "Just now",
      content: updateText,
      prayerCount: 0,
      commentCount: 0,
      prayedByAvatars: [],
      comments: [],
      originalPostId: originalPost.id,
      originalPost: originalPost,
      updateTag: updateTag,
    };
    setAllFeedPosts((prev) => [newPost, ...prev]);
    setAllCommunityPosts((prev) => [newPost, ...prev]);
    setRepostTarget(null);
    console.log("[Community] Repost with update submitted:", newPost.id, "original:", originalPost.id);
  }, []);

  const handleArchivePost = useCallback((post: FeedPost) => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setArchivedPostIds((prev) => {
      const next = new Set(prev);
      next.add(post.id);
      return next;
    });
    addArchivedPost({
      originalPostId: post.id,
      authorName: post.authorName,
      authorAvatar: post.authorAvatar,
      category: post.category,
      content: post.content,
      postedAt: post.postedAt,
      prayerCount: post.prayerCount,
      commentCount: post.commentCount,
    });
    setPostActionsTarget(null);
    console.log("[Community] Post archived:", post.id);
  }, [addArchivedPost]);

  const handleDeletePost = useCallback((post: FeedPost) => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setAllFeedPosts((prev) => prev.filter((p) => p.id !== post.id));
    setAllCommunityPosts((prev) => prev.filter((p) => p.id !== post.id));
    setPostActionsTarget(null);
    console.log("[Community] Post deleted:", post.id);
  }, []);

  const handleHidePost = useCallback((post: FeedPost) => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHiddenPostIds((prev) => {
      const next = new Set(prev);
      next.add(post.id);
      return next;
    });
    setPostActionsTarget(null);
    console.log("[Community] Post hidden:", post.id);
  }, []);

  const handleReportPost = useCallback((post: FeedPost) => {
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setPostActionsTarget(null);
    console.log("[Community] Post reported:", post.id);
  }, []);

  const handleSharePost = useCallback((post: FeedPost) => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setShareTarget(post);
    console.log("[Community] Opening prayer share sheet for post:", post.id);
  }, []);

  const handleOpenPostActions = useCallback((post: FeedPost) => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setPostActionsTarget(post);
  }, []);

  const handleAddComment = useCallback((postId: string, text: string) => {
    const newComment: Comment = {
      id: `c_${Date.now()}`,
      authorName: "Sarah",
      authorAvatar: "https://randomuser.me/api/portraits/women/68.jpg",
      text,
      time: "Just now",
    };
    const updater = (posts: FeedPost[]) =>
      posts.map((p) =>
        p.id === postId
          ? { ...p, comments: [...p.comments, newComment], commentCount: p.commentCount + 1 }
          : p
      );
    setAllFeedPosts(updater);
    setAllCommunityPosts(updater);
    setCommentPost((prev) =>
      prev && prev.id === postId
        ? { ...prev, comments: [...prev.comments, newComment], commentCount: prev.commentCount + 1 }
        : prev
    );
  }, []);

  const filteredFeedPosts = allFeedPosts.filter((p) => p.communityId === activeCommunity.id && !archivedPostIds.has(p.id) && !hiddenPostIds.has(p.id));
  const filteredCommunityPosts = allCommunityPosts.filter((p) => p.communityId === activeCommunity.id && !archivedPostIds.has(p.id) && !hiddenPostIds.has(p.id));
  const posts = activeTab === "Feed" ? filteredFeedPosts : filteredCommunityPosts;
  const currentUserId = "user-1";
  const [createCommunityPaywallVisible, setCreateCommunityPaywallVisible] = useState<boolean>(false);
  const [communityProfileTarget, setCommunityProfileTarget] = useState<Community | null>(null);

  const handleViewCommunityProfile = useCallback((community: Community) => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setCommunityProfileTarget(community);
  }, []);

  const swipeHandlers = useTabSwipe("/(tabs)/pray", "/(tabs)/activity");

  return (
    <CommunityColorsCtx.Provider value={themeColors}>
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]} edges={["top"]} {...swipeHandlers}>
      <NavigationDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        activeRoute=""
      />
      <NotificationsPanel visible={notifVisible} onClose={() => setNotifVisible(false)} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable style={styles.iconBtn} onPress={() => setDrawerVisible(true)}>
            <Menu size={20} color={Colors.foreground} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Feed</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {activeTab === "Feed"
                ? "Updates from friends"
                : activeTab === "Community"
                ? "Your Community"
                : "Your Groups"}
            </Text>
          </View>
        </View>
        <View style={styles.headerIcons}>
          <Pressable style={styles.iconBtn} onPress={() => setBrowseCommunitiesVisible(true)}>
            <Search size={20} color={Colors.foreground} />
          </Pressable>
          {activeTab === "Community" && (
            <Pressable
              style={styles.iconBtn}
              onPress={() => {
                if (Platform.OS !== "web") void Haptics.selectionAsync();
                setBrowseCommunitiesVisible(true);
              }}
            >
              <Users size={20} color={Colors.foreground} />
            </Pressable>
          )}
          {activeTab === "My Groups" && (
            <Pressable
              style={styles.iconBtn}
              onPress={() => {
                if (Platform.OS !== "web") void Haptics.selectionAsync();
                router.push("/create-group");
              }}
            >
              <Plus size={20} color={Colors.foreground} />
            </Pressable>
          )}
          <Pressable style={styles.bellWrap} onPress={() => setNotifVisible(true)}>
            <Bell size={20} color={Colors.foreground} />
            {notifUnreadCount > 0 && <View style={styles.bellBadge} />}
          </Pressable>
        </View>
      </View>

      <View style={styles.segmentWrapper}>
        <View style={styles.segmentContainer}>
          {(["Feed", "Community", "My Groups"] as Tab[]).map((tab) => (
            <Pressable
              key={tab}
              style={[styles.segmentTab, activeTab === tab && styles.segmentTabActive]}
              onPress={() => handleTabPress(tab)}
            >
              <Text style={[styles.segmentText, activeTab === tab && styles.segmentTextActive]}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {activeTab === "My Groups" ? (
        <MyGroupsContent />
      ) : (
        <AutoScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {activeTab === "Community" && joinedCommunities.length > 0 && (
            <CommunitySelectorBanner
              activeCommunity={activeCommunity}
              onPress={() => setSwitcherVisible(true)}
            />
          )}
          {hasNewUpdates && activeTab !== "Community" && (
            <NewUpdatesBanner
              animValue={newUpdateAnim}
              onPress={handleLoadNewUpdates}
            />
          )}
          {hasNewUpdates && activeTab === "Community" && joinedCommunities.length > 0 && (
            <NewUpdatesBanner
              animValue={newUpdateAnim}
              onPress={handleLoadNewUpdates}
            />
          )}

          {activeTab === "Community" && joinedCommunities.length === 0 ? (
            <InlineBrowseCommunities
              joinedCommunityIds={joinedCommunities.map((c) => c.id)}
              onJoin={handleJoinCommunity}
              onViewProfile={handleViewCommunityProfile}
              onCreateCommunity={() => setCreateCommunityPaywallVisible(true)}
              onOpenBrowse={() => setBrowseCommunitiesVisible(true)}
            />
          ) : (
            <>
              <ComposerPrompt
                communityName={activeCommunity.name}
                accentColor={activeCommunity.accentColor}
                isCommunityTab={activeTab === "Community"}
                onPress={() => setStatusModalVisible(true)}
              />

              {activeTab === "Feed" && (
                <MyRequestsBanner onPress={() => router.push("/my-posts")} />
              )}

              {posts.length === 0 ? (
                <CommunityEmptyState communityName={activeCommunity.name} />
              ) : (
                posts.map((post) => (
                  <FeedCard
                    key={post.id}
                    post={post}
                    hasPrayed={prayedPosts.has(post.id)}
                    onPray={(id) => handlePray(id, post)}
                    onComment={handleOpenComments}
                    onAvatarPress={handleAvatarPress}
                    isAuthor={post.authorId === currentUserId}
                    onRepost={handleRepostWithUpdate}
                    onMorePress={handleOpenPostActions}
                    currentUserId={currentUserId}
                    onPrayingUsersPress={handlePrayingUsersPress}
                  />
                ))
              )}
            </>
          )}
        </AutoScrollView>
      )}
      </KeyboardAvoidingView>

      {commentPost && (
        <CommentsModal
          post={commentPost}
          onClose={() => setCommentPost(null)}
          onAddComment={handleAddComment}
        />
      )}

      {stopPrayingPost && (
        <StopPrayingModal
          authorName={stopPrayingPost.post.authorName}
          onKeep={() => setStopPrayingPost(null)}
          onStop={handleStopPraying}
        />
      )}

      <CommunitySwitcherModal
        visible={switcherVisible}
        communities={joinedCommunities}
        activeCommunity={activeCommunity}
        onSelect={handleSelectCommunity}
        onClose={() => setSwitcherVisible(false)}
        onBrowse={() => {
          setSwitcherVisible(false);
          setTimeout(() => setBrowseCommunitiesVisible(true), 300);
        }}
      />

      <BrowseCommunitiesModal
        visible={browseCommunitiesVisible}
        joinedCommunityIds={joinedCommunities.map((c) => c.id)}
        onJoin={handleJoinCommunity}
        onViewProfile={(community) => {
          setBrowseCommunitiesVisible(false);
          setTimeout(() => handleViewCommunityProfile(community), 260);
        }}
        onClose={() => setBrowseCommunitiesVisible(false)}
        onCreateCommunity={() => {
          setBrowseCommunitiesVisible(false);
          setTimeout(() => setCreateCommunityPaywallVisible(true), 260);
        }}
      />

      <StatusUpdateModal
        visible={statusModalVisible}
        onClose={() => setStatusModalVisible(false)}
        onSubmit={handleStatusSubmit}
      />

      <CreateCommunityPaywallModal
        visible={createCommunityPaywallVisible}
        onClose={() => setCreateCommunityPaywallVisible(false)}
      />

      {communityProfileTarget && (
        <CommunityProfileModal
          community={communityProfileTarget}
          isJoined={joinedCommunities.some((c) => c.id === communityProfileTarget.id)}
          onClose={() => setCommunityProfileTarget(null)}
          onJoin={(community) => {
            handleJoinCommunity(community);
            setCommunityProfileTarget(null);
          }}
        />
      )}

      {repostTarget && (
        <RepostComposerModal
          originalPost={repostTarget}
          onClose={() => setRepostTarget(null)}
          onSubmit={handleSubmitRepost}
        />
      )}

      {postActionsTarget && (
        <PostActionsModal
          post={postActionsTarget}
          isAuthor={postActionsTarget.authorId === currentUserId}
          onClose={() => setPostActionsTarget(null)}
          onArchive={handleArchivePost}
          onRepost={handleRepostWithUpdate}
          onDelete={handleDeletePost}
          onHide={handleHidePost}
          onReport={handleReportPost}
          onShare={handleSharePost}
        />
      )}

      {prayingUsersPost && (
        <PrayingUsersModal
          post={prayingUsersPost}
          onClose={() => setPrayingUsersPost(null)}
        />
      )}

      {shareTarget && (
        <PrayerShareSheet
          post={shareTarget}
          isAuthor={shareTarget.authorId === currentUserId}
          onClose={() => setShareTarget(null)}
        />
      )}

      {prayingForPrompt && (
        <Animated.View
          style={[
            styles.prayingForPromptWrap,
            {
              opacity: prayingForPromptAnim,
              transform: [
                {
                  translateY: prayingForPromptAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [24, 0],
                  }),
                },
              ],
            },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.prayingForPromptCard}>
            <View style={styles.prayingForPromptLeft}>
              <HandHeart size={18} color={Colors.primary} />
              <View style={styles.prayingForPromptText}>
                <Text style={styles.prayingForPromptTitle}>Keep {prayingForPrompt.post.authorName} in prayer?</Text>
                <Text style={styles.prayingForPromptSub}>Add them to your personal Praying For list</Text>
              </View>
            </View>
            <View style={styles.prayingForPromptActions}>
              <Pressable style={styles.prayingForPromptAdd} onPress={handleAddToPrayingFor}>
                <Text style={styles.prayingForPromptAddText}>Add</Text>
              </Pressable>
              <Pressable style={styles.prayingForPromptDismiss} onPress={dismissPrayingForPrompt}>
                <X size={14} color={Colors.mutedForeground} />
              </Pressable>
            </View>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
    </CommunityColorsCtx.Provider>
  );
}

interface CommunitySelectorBannerProps {
  activeCommunity: Community;
  onPress: () => void;
}

function CommunitySelectorBanner({ activeCommunity, onPress }: CommunitySelectorBannerProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, tension: 300, friction: 15 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 15 }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.selectorOuter}
    >
      <Animated.View
        style={[
          styles.selectorBannerWrap,
          { shadowColor: activeCommunity.accentColor, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <LinearGradient
          colors={activeCommunity.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.selectorBanner}
        >
          <Image
            source={{ uri: activeCommunity.bannerImage }}
            style={styles.selectorChurchImage}
            contentFit="cover"
          />
          <View style={styles.selectorTextWrap}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.selectorLabel}>ACTIVE COMMUNITY</Text>
              {activeCommunity.isOfficial && (
                <View style={styles.officialBadgeLight}>
                  <Award size={8} color="#FFF4E0" />
                  <Text style={styles.officialBadgeLightText}>Official</Text>
                </View>
              )}
            </View>
            <Text style={styles.selectorName}>
              {activeCommunity.name}
            </Text>
          </View>
          <View style={styles.selectorRight}>
            <View style={styles.memberPill}>
              <Text style={styles.memberPillText}>
                {activeCommunity.memberCount} members
              </Text>
            </View>
            <ChevronDown size={15} color="#fff" />
          </View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

interface ComposerPromptProps {
  communityName: string;
  accentColor: string;
  isCommunityTab: boolean;
  onPress: () => void;
}

function ComposerPrompt({ communityName, accentColor, isCommunityTab, onPress }: ComposerPromptProps) {
  return (
    <Pressable
      style={[styles.prayerPrompt, { borderColor: accentColor + "40" }]}
      onPress={onPress}
    >
      <Image
        source={{ uri: "https://randomuser.me/api/portraits/women/68.jpg" }}
        style={[styles.promptAvatar, { borderWidth: 2, borderColor: accentColor + "60" }]}
      />
      <View style={styles.promptTextWrap}>
        <Text style={[styles.promptDestination, { color: accentColor }]}>
          {isCommunityTab ? `Posting to ${communityName}` : "Share a prayer update"}
        </Text>
        <Text style={styles.promptText}>
          {isCommunityTab ? `How can ${communityName} pray for you?` : "What's on your heart today?"}
        </Text>
      </View>
      <View style={[styles.promptIcon, { borderColor: accentColor }]}>
        <Edit3 size={16} color={accentColor} />
      </View>
    </Pressable>
  );
}

interface NoCommunityEmptyStateProps {
  onJoin: () => void;
}

function NoCommunityEmptyState({ onJoin }: NoCommunityEmptyStateProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 55, friction: 12, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <Animated.View style={[styles.noCommunityWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.noCommunityIconRing}>
        <View style={styles.noCommunityIconInner}>
          <Globe size={32} color={Colors.primary} />
        </View>
      </View>
      <Text style={styles.noCommunityTitle}>No Communities Yet</Text>
      <Text style={styles.noCommunitySubtitle}>
        Join a community to see prayer updates, share requests, and pray together with others.
      </Text>
      <Pressable style={styles.noCommunityBtn} onPress={onJoin}>
        <Users size={18} color={Colors.primaryForeground} />
        <Text style={styles.noCommunityBtnText}>Browse Communities</Text>
      </Pressable>
    </Animated.View>
  );
}

interface InlineBrowseCommunitiesProps {
  joinedCommunityIds: string[];
  onJoin: (community: Community) => void;
  onViewProfile: (community: Community) => void;
  onCreateCommunity: () => void;
  onOpenBrowse: () => void;
}

function InlineBrowseCommunities({ joinedCommunityIds, onJoin, onViewProfile, onCreateCommunity, onOpenBrowse }: InlineBrowseCommunitiesProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [privateExpanded, setPrivateExpanded] = useState<boolean>(false);
  const [privateCode, setPrivateCode] = useState<string>("");
  const [matchedPrivate, setMatchedPrivate] = useState<Community | null>(null);
  const [joiningPrivate, setJoiningPrivate] = useState<boolean>(false);
  const privateRevealAnim = useRef(new Animated.Value(0)).current;
  const privateExpandAnim = useRef(new Animated.Value(0)).current;
  const codeInputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const publicCommunities = COMMUNITIES.filter((c) => !c.isPrivate).sort((a, b) => (b.isOfficial ? 1 : 0) - (a.isOfficial ? 1 : 0));
  const filteredPublic = searchQuery.trim() === ""
    ? publicCommunities
    : publicCommunities.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const handleTogglePrivate = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    const nextExpanded = !privateExpanded;
    setPrivateExpanded(nextExpanded);
    Animated.spring(privateExpandAnim, {
      toValue: nextExpanded ? 1 : 0,
      useNativeDriver: false,
      tension: 70,
      friction: 12,
    }).start();
    if (nextExpanded) {
      setTimeout(() => codeInputRef.current?.focus(), 300);
    } else {
      setPrivateCode("");
      setMatchedPrivate(null);
      privateRevealAnim.setValue(0);
      Keyboard.dismiss();
    }
  }, [privateExpanded, privateExpandAnim, privateRevealAnim]);

  const handlePrivateCodeChange = useCallback((text: string) => {
    const upper = text.toUpperCase();
    setPrivateCode(upper);
    const found = COMMUNITIES.find((c) => c.isPrivate && c.password === upper) ?? null;
    if (found && !matchedPrivate) {
      setMatchedPrivate(found);
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.spring(privateRevealAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();
      Keyboard.dismiss();
    } else if (!found) {
      if (matchedPrivate) privateRevealAnim.setValue(0);
      setMatchedPrivate(null);
    }
  }, [matchedPrivate, privateRevealAnim]);

  const handleJoinPrivate = useCallback(() => {
    if (!matchedPrivate) return;
    setJoiningPrivate(true);
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => {
      onJoin(matchedPrivate);
      setJoiningPrivate(false);
    }, 800);
  }, [matchedPrivate, onJoin]);

  const privateContentHeight = privateExpandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, matchedPrivate ? 220 : 110],
  });

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <View style={styles.inlineBrowseHeader}>
        <View style={styles.inlineBrowseIconRing}>
          <Globe size={26} color={Colors.primary} />
        </View>
        <Text style={styles.inlineBrowseTitle}>Find your community</Text>
        <Text style={styles.inlineBrowseSub}>
          Join a prayer community to see requests, pray together, and stay connected.
        </Text>
      </View>

      <Pressable style={styles.browseSearchWrap} onPress={onOpenBrowse}>
        <Search size={16} color={Colors.mutedForeground} />
        <Text style={[styles.browseSearchInput, { color: Colors.mutedForeground }]}>
          Search communities...
        </Text>
        <ChevronRight size={14} color={Colors.mutedForeground} />
      </Pressable>

      {filteredPublic.length > 0 ? (
        filteredPublic.map((community) => {
          const isJoined = joinedCommunityIds.includes(community.id);
          return (
            <Pressable
              key={community.id}
              style={[styles.browseCommunityCard, isJoined && { opacity: 0.75 }]}
              onPress={() => { if (isJoined) return; onViewProfile(community); }}
            >
              <LinearGradient
                colors={community.gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.browseCommunityIcon}
              >
                <Text style={styles.browseCommunityLetter}>{community.iconLetter}</Text>
              </LinearGradient>
              <View style={styles.browseCommunityInfo}>
                <View style={styles.communityNameRow}>
                  <Text style={[styles.switcherItemName, isJoined && { color: community.accentColor }]}>
                    {community.name}
                  </Text>
                  {community.isOfficial && (
                    <View style={styles.officialBadge}>
                      <Award size={9} color="#B5820A" />
                      <Text style={styles.officialBadgeText}>Official</Text>
                    </View>
                  )}
                  {community.isPrivate && !community.isOfficial && (
                    <View style={styles.privateBadgeSmall}>
                      <Lock size={9} color={Colors.mutedForeground} />
                    </View>
                  )}
                </View>
                {community.description ? (
                  <Text style={styles.browseCommunityDesc} numberOfLines={1}>
                    {community.description}
                  </Text>
                ) : null}
                <View style={styles.browseMemberRow}>
                  <Users size={10} color={Colors.mutedForeground} />
                  <Text style={styles.switcherItemMeta}>{community.memberCount} members</Text>
                </View>
              </View>
              {isJoined ? (
                <View style={[styles.activeCheck, { backgroundColor: "#34C759" }]}>
                  <Check size={12} color="#fff" />
                </View>
              ) : (
                <View style={styles.browseCommunityJoinBtn}>
                  <Text style={styles.browseCommunityJoinText}>View</Text>
                </View>
              )}
            </Pressable>
          );
        })
      ) : (
        <View style={styles.browseNoResults}>
          <Search size={28} color={Colors.mutedForeground + "60"} />
          <Text style={styles.browseNoResultsText}>No communities found for "{searchQuery}"</Text>
        </View>
      )}

      <View style={styles.browsePrivateSection}>
        <View style={styles.browsePrivateDivider}>
          <View style={styles.browsePrivateLine} />
          <Text style={styles.browsePrivateDividerText}>Private community?</Text>
          <View style={styles.browsePrivateLine} />
        </View>

        <Pressable style={styles.browsePrivateToggle} onPress={handleTogglePrivate}>
          <View style={styles.browsePrivateToggleLeft}>
            <View style={[styles.browsePrivateLockIcon, privateExpanded && { backgroundColor: Colors.primary }]}>
              <Lock size={15} color={privateExpanded ? Colors.primaryForeground : Colors.primary} />
            </View>
            <View>
              <Text style={styles.browsePrivateToggleTitle}>Join with a code</Text>
              <Text style={styles.browsePrivateToggleSub}>For church family & invite-only groups</Text>
            </View>
          </View>
          <ChevronDown
            size={16}
            color={Colors.mutedForeground}
            style={{ transform: [{ rotate: privateExpanded ? "180deg" : "0deg" }] }}
          />
        </Pressable>

        <Animated.View style={[styles.browsePrivateContent, { maxHeight: privateContentHeight, overflow: "hidden" }]}>
          <View style={styles.browsePrivateInputWrap}>
            <Lock size={16} color={matchedPrivate ? Colors.primary : Colors.mutedForeground} />
            <TextInput
              ref={codeInputRef}
              style={styles.browsePrivateInput}
              placeholder="Enter community code"
              placeholderTextColor={Colors.mutedForeground + "70"}
              value={privateCode}
              onChangeText={handlePrivateCodeChange}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={20}
            />
            {matchedPrivate && (
              <CheckCircle2 size={18} color={Colors.green} />
            )}
          </View>
          {!matchedPrivate && privateCode.length > 0 && (
            <Text style={styles.browsePrivateHint}>Keep typing the full community code...</Text>
          )}

          {matchedPrivate && (
            <Animated.View
              style={[{
                opacity: privateRevealAnim,
                transform: [{ translateY: privateRevealAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
              }]}
            >
              <View style={styles.browsePrivatePreview}>
                <LinearGradient
                  colors={matchedPrivate.gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.browsePrivatePreviewIcon}
                >
                  <Text style={styles.browseCommunityLetter}>{matchedPrivate.iconLetter}</Text>
                </LinearGradient>
                <View style={styles.browseCommunityInfo}>
                  <Text style={styles.browsePrivatePreviewName}>{matchedPrivate.name}</Text>
                  <Text style={styles.browsePrivatePreviewDesc}>{matchedPrivate.memberCount} members · Private</Text>
                </View>
                <View style={[styles.browsePrivateBadge, { backgroundColor: matchedPrivate.accentColor + "18" }]}>
                  <Lock size={10} color={matchedPrivate.accentColor} />
                  <Text style={[styles.browsePrivateBadgeText, { color: matchedPrivate.accentColor }]}>Private</Text>
                </View>
              </View>
              <Pressable
                style={[styles.browsePrivateJoinBtn, joiningPrivate && { opacity: 0.7 }]}
                onPress={handleJoinPrivate}
                disabled={joiningPrivate}
              >
                <LogIn size={16} color={Colors.primaryForeground} />
                <Text style={styles.browsePrivateJoinText}>
                  {joiningPrivate ? "Joining..." : `Join ${matchedPrivate.name}`}
                </Text>
              </Pressable>
            </Animated.View>
          )}
        </Animated.View>
      </View>

      <Pressable style={styles.createCommunityRow} onPress={onCreateCommunity}>
        <View style={styles.createCommunityRowIcon}>
          <Crown size={18} color="#B5820A" />
        </View>
        <View style={styles.createCommunityRowText}>
          <Text style={styles.createCommunityRowTitle}>Create a Community</Text>
          <Text style={styles.createCommunityRowSub}>Launch your own prayer space</Text>
        </View>
        <View style={styles.createCommunityRowBadge}>
          <Text style={styles.createCommunityRowBadgeText}>PRO</Text>
        </View>
      </Pressable>

      <View style={[styles.switcherFooterHint, { marginTop: 8 }]}>
        <Sparkles size={13} color={Colors.mutedForeground} />
        <Text style={styles.switcherFooterText}>
          You can join multiple communities and switch between them anytime
        </Text>
      </View>
    </Animated.View>
  );
}

interface CommunityEmptyStateProps {
  communityName: string;
}

interface NewUpdatesBannerProps {
  animValue: Animated.Value;
  onPress: () => void;
}

function NewUpdatesBanner({ animValue, onPress }: NewUpdatesBannerProps) {
  return (
    <Animated.View
      style={[
        styles.newUpdatesBanner,
        {
          opacity: animValue,
          transform: [
            {
              translateY: animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Pressable style={styles.newUpdatesPressable} onPress={onPress}>
        <ArrowUp size={14} color={Colors.primaryForeground} />
        <Text style={styles.newUpdatesText}>New updates available</Text>
      </Pressable>
    </Animated.View>
  );
}

function CommunityEmptyState({ communityName }: CommunityEmptyStateProps) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <HandHeart size={32} color={Colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>No posts in {communityName} yet</Text>
      <Text style={styles.emptySubtitle}>
        Be the first to share a prayer request with {communityName}.
      </Text>
    </View>
  );
}

interface BrowseCommunitiesModalProps {
  visible: boolean;
  joinedCommunityIds: string[];
  onJoin: (community: Community) => void;
  onViewProfile: (community: Community) => void;
  onClose: () => void;
  onCreateCommunity: () => void;
}

function BrowseCommunitiesModal({ visible, joinedCommunityIds, onJoin, onViewProfile, onClose, onCreateCommunity }: BrowseCommunitiesModalProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(900)).current;
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [privateExpanded, setPrivateExpanded] = useState<boolean>(false);
  const [privateCode, setPrivateCode] = useState<string>("");
  const [matchedPrivate, setMatchedPrivate] = useState<Community | null>(null);
  const [joiningPrivate, setJoiningPrivate] = useState<boolean>(false);
  const privateRevealAnim = useRef(new Animated.Value(0)).current;
  const privateExpandAnim = useRef(new Animated.Value(0)).current;
  const codeInputRef = useRef<TextInput>(null);
  const searchInputRef = useRef<TextInput>(null);

  const publicCommunities = COMMUNITIES.filter((c) => !c.isPrivate).sort((a, b) => (b.isOfficial ? 1 : 0) - (a.isOfficial ? 1 : 0));
  const filteredPublic = searchQuery.trim() === ""
    ? publicCommunities
    : publicCommunities.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

  useEffect(() => {
    if (visible) {
      setSearchQuery("");
      setPrivateExpanded(false);
      setPrivateCode("");
      setMatchedPrivate(null);
      setJoiningPrivate(false);
      privateRevealAnim.setValue(0);
      privateExpandAnim.setValue(0);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start(() => {
        setTimeout(() => searchInputRef.current?.focus(), 150);
      });
    } else {
      Keyboard.dismiss();
      Animated.timing(slideAnim, { toValue: 900, duration: 260, useNativeDriver: true }).start();
    }
  }, [visible, slideAnim, privateRevealAnim, privateExpandAnim]);

  const handleTogglePrivate = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    const nextExpanded = !privateExpanded;
    setPrivateExpanded(nextExpanded);
    Animated.spring(privateExpandAnim, {
      toValue: nextExpanded ? 1 : 0,
      useNativeDriver: false,
      tension: 70,
      friction: 12,
    }).start();
    if (nextExpanded) {
      setTimeout(() => codeInputRef.current?.focus(), 300);
    } else {
      setPrivateCode("");
      setMatchedPrivate(null);
      privateRevealAnim.setValue(0);
      Keyboard.dismiss();
    }
  }, [privateExpanded, privateExpandAnim, privateRevealAnim]);

  const handlePrivateCodeChange = useCallback((text: string) => {
    const upper = text.toUpperCase();
    setPrivateCode(upper);
    const found = COMMUNITIES.find((c) => c.isPrivate && c.password === upper) ?? null;
    if (found && !matchedPrivate) {
      setMatchedPrivate(found);
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.spring(privateRevealAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();
      Keyboard.dismiss();
    } else if (!found) {
      if (matchedPrivate) privateRevealAnim.setValue(0);
      setMatchedPrivate(null);
    }
  }, [matchedPrivate, privateRevealAnim]);

  const handleJoinPrivate = useCallback(() => {
    if (!matchedPrivate) return;
    setJoiningPrivate(true);
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => {
      onJoin(matchedPrivate);
      setJoiningPrivate(false);
    }, 800);
  }, [matchedPrivate, onJoin]);

  const privateContentHeight = privateExpandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, matchedPrivate ? 220 : 110],
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View
        style={[
          styles.browseFullScreen,
          { paddingTop: insets.top, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.browseFullHeader}>
          <View>
            <Text style={styles.switcherTitle}>Browse Communities</Text>
            <Text style={styles.switcherSub}>Find and join public prayer communities</Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <X size={18} color={Colors.mutedForeground} />
          </Pressable>
        </View>

        <View style={styles.browseSearchWrap}>
          <Search size={16} color={Colors.mutedForeground} />
          <TextInput
            ref={searchInputRef}
            style={styles.browseSearchInput}
            placeholder="Search communities..."
            placeholderTextColor={Colors.mutedForeground + "80"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <X size={14} color={Colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={styles.browseScrollArea}
          contentContainerStyle={[styles.browseScrollContent, { paddingBottom: insets.bottom + 32 }]}
        >
            {filteredPublic.length > 0 ? (
              filteredPublic.map((community) => {
                const isJoined = joinedCommunityIds.includes(community.id);
                return (
                  <Pressable
                    key={community.id}
                    style={[styles.browseCommunityCard, isJoined && { opacity: 0.75 }]}
                    onPress={() => { if (isJoined) return; onViewProfile(community); }}
                  >
                    <LinearGradient
                      colors={community.gradientColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.browseCommunityIcon}
                    >
                      <Text style={styles.browseCommunityLetter}>{community.iconLetter}</Text>
                    </LinearGradient>
                    <View style={styles.browseCommunityInfo}>
                      <View style={styles.communityNameRow}>
                        <Text style={[styles.switcherItemName, isJoined && { color: community.accentColor }]}>
                          {community.name}
                        </Text>
                        {community.isOfficial && (
                          <View style={styles.officialBadge}>
                            <Award size={9} color="#B5820A" />
                            <Text style={styles.officialBadgeText}>Official</Text>
                          </View>
                        )}
                        {community.isPrivate && !community.isOfficial && (
                          <View style={styles.privateBadgeSmall}>
                            <Lock size={9} color={Colors.mutedForeground} />
                          </View>
                        )}
                      </View>
                      {community.description ? (
                        <Text style={styles.browseCommunityDesc} numberOfLines={1}>
                          {community.description}
                        </Text>
                      ) : null}
                      <View style={styles.browseMemberRow}>
                        <Users size={10} color={Colors.mutedForeground} />
                        <Text style={styles.switcherItemMeta}>{community.memberCount} members</Text>
                      </View>
                    </View>
                    {isJoined ? (
                      <View style={[styles.activeCheck, { backgroundColor: "#34C759" }]}>
                        <Check size={12} color="#fff" />
                      </View>
                    ) : (
                      <View style={styles.browseCommunityJoinBtn}>
                        <Text style={styles.browseCommunityJoinText}>View</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })
            ) : (
              <View style={styles.browseNoResults}>
                <Search size={28} color={Colors.mutedForeground + "60"} />
                <Text style={styles.browseNoResultsText}>No communities found for "{searchQuery}"</Text>
              </View>
            )}

            <View style={styles.browsePrivateSection}>
              <View style={styles.browsePrivateDivider}>
                <View style={styles.browsePrivateLine} />
                <Text style={styles.browsePrivateDividerText}>Private community?</Text>
                <View style={styles.browsePrivateLine} />
              </View>

              <Pressable style={styles.browsePrivateToggle} onPress={handleTogglePrivate}>
                <View style={styles.browsePrivateToggleLeft}>
                  <View style={[styles.browsePrivateLockIcon, privateExpanded && { backgroundColor: Colors.primary }]}>
                    <Lock size={15} color={privateExpanded ? Colors.primaryForeground : Colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.browsePrivateToggleTitle}>Join with a code</Text>
                    <Text style={styles.browsePrivateToggleSub}>For church family & invite-only groups</Text>
                  </View>
                </View>
                <ChevronDown
                  size={16}
                  color={Colors.mutedForeground}
                  style={{ transform: [{ rotate: privateExpanded ? "180deg" : "0deg" }] }}
                />
              </Pressable>

              <Animated.View style={[styles.browsePrivateContent, { maxHeight: privateContentHeight, overflow: "hidden" }]}>
                <View style={styles.browsePrivateInputWrap}>
                  <Lock size={16} color={matchedPrivate ? Colors.primary : Colors.mutedForeground} />
                  <TextInput
                    ref={codeInputRef}
                    style={styles.browsePrivateInput}
                    placeholder="Enter community code"
                    placeholderTextColor={Colors.mutedForeground + "70"}
                    value={privateCode}
                    onChangeText={handlePrivateCodeChange}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={20}
                  />
                  {matchedPrivate && (
                    <CheckCircle2 size={18} color={Colors.green} />
                  )}
                </View>
                {!matchedPrivate && privateCode.length > 0 && (
                  <Text style={styles.browsePrivateHint}>Keep typing the full community code...</Text>
                )}

                {matchedPrivate && (
                  <Animated.View
                    style={[{
                      opacity: privateRevealAnim,
                      transform: [{ translateY: privateRevealAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
                    }]}
                  >
                    <View style={styles.browsePrivatePreview}>
                      <LinearGradient
                        colors={matchedPrivate.gradientColors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.browsePrivatePreviewIcon}
                      >
                        <Text style={styles.browseCommunityLetter}>{matchedPrivate.iconLetter}</Text>
                      </LinearGradient>
                      <View style={styles.browseCommunityInfo}>
                        <Text style={styles.browsePrivatePreviewName}>{matchedPrivate.name}</Text>
                        <Text style={styles.browsePrivatePreviewDesc}>{matchedPrivate.memberCount} members · Private</Text>
                      </View>
                      <View style={[styles.browsePrivateBadge, { backgroundColor: matchedPrivate.accentColor + "18" }]}>
                        <Lock size={10} color={matchedPrivate.accentColor} />
                        <Text style={[styles.browsePrivateBadgeText, { color: matchedPrivate.accentColor }]}>Private</Text>
                      </View>
                    </View>
                    <Pressable
                      style={[styles.browsePrivateJoinBtn, joiningPrivate && { opacity: 0.7 }]}
                      onPress={handleJoinPrivate}
                      disabled={joiningPrivate}
                    >
                      <LogIn size={16} color={Colors.primaryForeground} />
                      <Text style={styles.browsePrivateJoinText}>
                        {joiningPrivate ? "Joining..." : `Join ${matchedPrivate.name}`}
                      </Text>
                    </Pressable>
                  </Animated.View>
                )}
              </Animated.View>
            </View>

            <Pressable style={[styles.createCommunityRow, { marginTop: 4 }]} onPress={onCreateCommunity}>
              <View style={styles.createCommunityRowIcon}>
                <Crown size={18} color="#B5820A" />
              </View>
              <View style={styles.createCommunityRowText}>
                <Text style={styles.createCommunityRowTitle}>Create a Community</Text>
                <Text style={styles.createCommunityRowSub}>Launch your own prayer space</Text>
              </View>
              <View style={styles.createCommunityRowBadge}>
                <Text style={styles.createCommunityRowBadgeText}>PRO</Text>
              </View>
            </Pressable>

            <View style={styles.switcherFooterHint}>
              <Sparkles size={13} color={Colors.mutedForeground} />
              <Text style={styles.switcherFooterText}>
                You can join multiple communities and switch between them anytime
              </Text>
            </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

interface CommunitySwitcherModalProps {
  visible: boolean;
  communities: Community[];
  activeCommunity: Community;
  onSelect: (community: Community) => void;
  onClose: () => void;
  onBrowse: () => void;
}

function CommunitySwitcherModal({
  visible,
  communities,
  activeCommunity,
  onSelect,
  onClose,
  onBrowse,
}: CommunitySwitcherModalProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(500)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 500,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[styles.switcherOverlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.switcherSheet,
            { paddingBottom: insets.bottom + 32, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.switcherHandle} />

          <View style={styles.switcherHeader}>
            <View>
              <Text style={styles.switcherTitle}>Switch Community</Text>
              <Text style={styles.switcherSub}>Choose where you want to pray today</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <X size={18} color={Colors.mutedForeground} />
            </Pressable>
          </View>

          <View style={styles.switcherDivider} />

          {communities.map((community) => {
            const isActive = community.id === activeCommunity.id;
            return (
              <Pressable
                key={community.id}
                style={[styles.switcherItem, isActive && styles.switcherItemActive]}
                onPress={() => onSelect(community)}
              >
                <View style={[styles.switcherItemIcon, { backgroundColor: community.accentColor + "18" }]}>
                  <Text style={[styles.switcherItemLetter, { color: community.accentColor }]}>
                    {community.iconLetter}
                  </Text>
                </View>
                <View style={styles.switcherItemText}>
                  <Text style={[styles.switcherItemName, isActive && { color: community.accentColor }]}>
                    {community.name}
                  </Text>
                  <Text style={styles.switcherItemMeta}>{community.memberCount} members</Text>
                </View>
                {isActive ? (
                  <View style={[styles.activeCheck, { backgroundColor: community.accentColor }]}>
                    <Check size={12} color="#fff" />
                  </View>
                ) : (
                  <ChevronRight size={16} color={Colors.mutedForeground} />
                )}
              </Pressable>
            );
          })}

          <Pressable style={styles.joinAnotherRow} onPress={onBrowse}>
            <View style={styles.joinAnotherIcon}>
              <Plus size={18} color={Colors.primary} />
            </View>
            <View style={styles.joinAnotherText}>
              <Text style={styles.joinAnotherLabel}>Join another community</Text>
              <Text style={styles.joinAnotherSub}>Browse and discover new communities</Text>
            </View>
            <ChevronRight size={16} color={Colors.mutedForeground} />
          </Pressable>

          <View style={styles.switcherFooterHint}>
            <Sparkles size={13} color={Colors.mutedForeground} />
            <Text style={styles.switcherFooterText}>
              Posts, prayers and comments are scoped to your active community
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function MyGroupsContent() {
  const router = useRouter();
  const [myGroups, setMyGroups] = useState<MyGroup[]>(INITIAL_MY_GROUPS);
  const [joinModalVisible, setJoinModalVisible] = useState<boolean>(false);
  const { joinedGroupIds } = useNotifications();

  React.useEffect(() => {
    joinedGroupIds.forEach((notifGroupId) => {
      const mapped = NOTIFICATION_GROUP_MAP[notifGroupId];
      if (!mapped) return;
      setMyGroups((prev) => {
        const alreadyExists = prev.some((g) => g.id === mapped.id || g.name === mapped.name);
        if (alreadyExists) return prev;
        console.log("[MyGroups] Adding notification-joined group:", mapped.name);
        return [mapped, ...prev];
      });
    });
  }, [joinedGroupIds]);

  const handleGroupPress = useCallback((groupId: string) => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    router.push(`/group/${groupId}`);
  }, [router]);

  const handleJoinGroup = useCallback((group: JoinableGroup) => {
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newGroup: MyGroup = {
      id: `g_${Date.now()}`,
      name: group.name,
      memberCount: group.memberCount,
      lastActivity: "Just now",
      avatar: group.avatar,
      activeRequests: 0,
    };
    setMyGroups((prev) => [newGroup, ...prev]);
    setJoinModalVisible(false);
    console.log("[MyGroups] Joined group:", group.name);
  }, []);

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.groupActionsRow}>
          <Pressable style={styles.createGroupBtn} onPress={() => router.push("/create-group")}>
            <View style={styles.createGroupInner}>
              <View style={styles.createGroupPlus}>
                <Plus size={16} color={Colors.primary} />
              </View>
              <Text style={styles.createGroupText}>Create a new group</Text>
            </View>
            <ChevronRight size={18} color={Colors.mutedForeground} />
          </Pressable>

          <Pressable
            style={styles.joinGroupBtn}
            onPress={() => {
              if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setJoinModalVisible(true);
            }}
          >
            <View style={styles.createGroupInner}>
              <View style={styles.joinGroupIcon}>
                <LogIn size={16} color={Colors.primaryForeground} />
              </View>
              <Text style={styles.joinGroupText}>Join a group</Text>
            </View>
            <ChevronRight size={18} color={Colors.mutedForeground} />
          </Pressable>
        </View>

        {myGroups.map((group) => (
          <Pressable
            key={group.id}
            style={styles.groupCard}
            onPress={() => handleGroupPress(group.id)}
          >
            <Image source={{ uri: group.avatar }} style={styles.groupAvatar} />
            <View style={styles.groupInfo}>
              <Text style={styles.groupName}>{group.name}</Text>
              <Text style={styles.groupMeta}>{group.memberCount} members · {group.lastActivity}</Text>
            </View>
            <View style={styles.groupRight}>
              {group.activeRequests > 0 && (
                <View style={styles.requestsBadge}>
                  <Text style={styles.requestsBadgeText}>{group.activeRequests}</Text>
                </View>
              )}
              <ChevronRight size={18} color={Colors.mutedForeground} />
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <JoinGroupModal
        visible={joinModalVisible}
        onClose={() => setJoinModalVisible(false)}
        onJoin={handleJoinGroup}
      />
    </>
  );
}

interface JoinGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onJoin: (group: JoinableGroup) => void;
}

function JoinGroupModal({ visible, onClose, onJoin }: JoinGroupModalProps) {
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState<string>("");
  const [matchedGroup, setMatchedGroup] = useState<JoinableGroup | null>(null);
  const [joining, setJoining] = useState<boolean>(false);
  const slideAnim = useRef(new Animated.Value(800)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const groupRevealAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setPassword("");
      setMatchedGroup(null);
      setJoining(false);
      groupRevealAnim.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(() => inputRef.current?.focus(), 100);
      });
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 800,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim, groupRevealAnim]);

  const handlePasswordChange = useCallback((text: string) => {
    const upper = text.toUpperCase();
    setPassword(upper);
    const found = JOINABLE_GROUPS[upper] ?? null;
    if (found && !matchedGroup) {
      setMatchedGroup(found);
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.spring(groupRevealAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();
      Keyboard.dismiss();
    } else if (!found) {
      if (matchedGroup) {
        groupRevealAnim.setValue(0);
      }
      setMatchedGroup(null);
    }
  }, [matchedGroup, groupRevealAnim]);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  const handleJoinPress = useCallback(() => {
    if (!matchedGroup) return;
    setJoining(true);
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => {
      onJoin(matchedGroup);
      setJoining(false);
    }, 800);
  }, [matchedGroup, onJoin]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.joinModalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Animated.View
          style={[
            styles.joinModalSheet,
            { paddingTop: insets.top, paddingBottom: insets.bottom + 40, transform: [{ translateY: slideAnim }], opacity: fadeAnim },
          ]}
        >
          <View style={styles.joinModalHeader}>
            <Pressable style={styles.joinModalBackBtn} onPress={handleClose}>
              <X size={20} color={Colors.foreground} />
            </Pressable>
            <View style={styles.joinModalHeaderCenter}>
              <Text style={styles.joinModalTitle}>Join a Group</Text>
              <Text style={styles.joinModalSub}>Enter the group password to join</Text>
            </View>
            <View style={{ width: 44 }} />
          </View>

          <View style={styles.joinPasswordSection}>
            <View style={styles.joinPasswordInputWrap}>
              <Lock size={18} color={matchedGroup ? Colors.primary : Colors.mutedForeground} />
              <TextInput
                ref={inputRef}
                style={styles.joinPasswordInput}
                placeholder="Enter group password"
                placeholderTextColor={Colors.mutedForeground + "70"}
                value={password}
                onChangeText={handlePasswordChange}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={20}
              />
              {matchedGroup && (
                <View style={styles.joinPasswordCheck}>
                  <CheckCircle2 size={20} color={Colors.green} />
                </View>
              )}
            </View>
            {!matchedGroup && password.length > 0 && (
              <Text style={styles.joinHintText}>Keep typing the full password...</Text>
            )}
          </View>

          {matchedGroup && (
            <Animated.View
              style={[
                styles.joinGroupPreview,
                {
                  opacity: groupRevealAnim,
                  transform: [
                    {
                      translateY: groupRevealAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                    {
                      scale: groupRevealAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.95, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Image source={{ uri: matchedGroup.avatar }} style={styles.joinPreviewAvatar} />
              <View style={styles.joinPreviewInfo}>
                <Text style={styles.joinPreviewName}>{matchedGroup.name}</Text>
                <Text style={styles.joinPreviewMeta}>{matchedGroup.memberCount} members</Text>
                <Text style={styles.joinPreviewDesc} numberOfLines={2}>
                  {matchedGroup.description}
                </Text>
              </View>
            </Animated.View>
          )}

          {matchedGroup && (
            <Animated.View style={{ opacity: groupRevealAnim }}>
              <Pressable
                style={[styles.joinConfirmBtn, joining && styles.joinConfirmBtnDisabled]}
                onPress={handleJoinPress}
                disabled={joining}
              >
                {joining ? (
                  <Text style={styles.joinConfirmBtnText}>Joining...</Text>
                ) : (
                  <>
                    <LogIn size={18} color={Colors.primaryForeground} />
                    <Text style={styles.joinConfirmBtnText}>Join {matchedGroup.name}</Text>
                  </>
                )}
              </Pressable>
            </Animated.View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function MyRequestsBanner({ onPress }: { onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, tension: 300, friction: 20 }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 20 }).start();
  return (
    <Pressable
      style={styles.myRequestsBanner}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }], flexDirection: "row" as const, alignItems: "center" as const, flex: 1, gap: 12 }}>
        <View style={styles.myRequestsBannerIcon}>
          <HandHeart size={18} color={Colors.primary} />
        </View>
        <View style={styles.myRequestsBannerText}>
          <Text style={styles.myRequestsBannerTitle}>My Prayer Requests</Text>
          <Text style={styles.myRequestsBannerSub}>Update, mark answered &amp; share testimonies</Text>
        </View>
        <ChevronRight size={16} color={Colors.primary} />
      </Animated.View>
    </Pressable>
  );
}

const UPDATE_TAG_CONFIG: Record<UpdateTag, { label: string; icon: 'prayer' | 'answered' | 'thanks'; color: string; bg: string }> = {
  still_need_prayer: { label: 'Still need prayer', icon: 'prayer', color: '#D96E27', bg: '#FFF0E5' },
  answered: { label: 'Answered', icon: 'answered', color: '#34C759', bg: '#E8F8ED' },
  thank_you: { label: 'Thank you', icon: 'thanks', color: '#2E6DB5', bg: '#E5F0FA' },
};

function PostImage({ uri }: { uri: string }) {
  const [viewing, setViewing] = useState<boolean>(false);
  return (
    <>
      <Pressable onPress={() => setViewing(true)} style={styles.postImageWrap}>
        <Image
          source={{ uri }}
          style={styles.postImage}
          contentFit="cover"
        />
      </Pressable>
      <ImageViewer uri={uri} visible={viewing} onClose={() => setViewing(false)} />
    </>
  );
}

interface FeedCardProps {
  post: FeedPost;
  hasPrayed: boolean;
  onPray: (id: string) => void;
  onComment: (post: FeedPost) => void;
  onAvatarPress: (authorId: string) => void;
  isAuthor: boolean;
  onRepost: (post: FeedPost) => void;
  onMorePress: (post: FeedPost) => void;
  onPrayingUsersPress: (post: FeedPost) => void;
  currentUserId: string;
}

function FeedCard({ post, hasPrayed, onPray, onComment, onAvatarPress, isAuthor, onRepost, onMorePress, onPrayingUsersPress }: FeedCardProps) {
  const prayCount = post.prayerCount + (hasPrayed ? 1 : 0);
  const isUpdatePost = !!post.originalPost;

  return (
    <View style={styles.card}>
      {isUpdatePost && (
        <View style={styles.updateHeaderBanner}>
          <Repeat2 size={13} color={Colors.primary} />
          <Text style={styles.updateHeaderText}>{post.authorName} shared an update</Text>
        </View>
      )}

      <View style={styles.cardHeader}>
        <Pressable onPress={() => onAvatarPress(post.authorId)}>
          <View style={styles.cardAvatarWrapper}>
            <Image source={{ uri: post.authorAvatar }} style={styles.cardAvatar} />
            <View style={styles.cardAvatarHeart}>
              <Text style={styles.cardAvatarHeartEmoji}>🤍</Text>
            </View>
          </View>
        </Pressable>
        <View style={styles.cardAuthorBlock}>
          <View style={styles.cardNameRow}>
            <Text style={styles.cardAuthorName}>{post.authorName}</Text>
            {post.isTimeSensitive && (
              <View style={styles.timeSensitiveBadge}>
                <Text style={styles.timeSensitiveText}>TIME SENSITIVE</Text>
              </View>
            )}
          </View>
          <View style={styles.cardMetaRow}>
            <Clock size={10} color={Colors.mutedForeground} />
            <Text style={styles.cardMeta}>{post.postedAt}</Text>
          </View>
        </View>
        <View style={styles.cardHeaderRight}>
          <Pressable style={styles.moreBtn} onPress={() => onMorePress(post)}>
            <MoreHorizontal size={18} color={Colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      {post.updateTag && (
        <View
          style={[
            styles.updateTagBadge,
            { backgroundColor: UPDATE_TAG_CONFIG[post.updateTag].bg },
            post.updateTag === 'answered' && styles.updateTagBadgeAnswered,
          ]}
        >
          {post.updateTag === 'still_need_prayer' && <HeartHandshake size={13} color={UPDATE_TAG_CONFIG[post.updateTag].color} />}
          {post.updateTag === 'answered' && <CheckCircle size={post.updateTag === 'answered' ? 15 : 13} color={UPDATE_TAG_CONFIG[post.updateTag].color} />}
          {post.updateTag === 'thank_you' && <ThumbsUp size={13} color={UPDATE_TAG_CONFIG[post.updateTag].color} />}
          <Text
            style={[
              styles.updateTagText,
              { color: UPDATE_TAG_CONFIG[post.updateTag].color },
              post.updateTag === 'answered' && styles.updateTagTextAnswered,
            ]}
          >
            {UPDATE_TAG_CONFIG[post.updateTag].label}
          </Text>
          {post.updateTag === 'answered' && (
            <Text style={styles.answeredEmoji}>🙌</Text>
          )}
        </View>
      )}

      <Text style={[styles.cardContent, post.content.startsWith('"') && styles.cardContentItalic]}>
        {post.content}
      </Text>

      {post.imageUrl && (
        <PostImage uri={post.imageUrl} />
      )}

      {isUpdatePost && post.originalPost && (
        <View style={styles.quotedOriginal}>
          <View style={styles.quotedBar} />
          <View style={styles.quotedContent}>
            <View style={styles.quotedHeader}>
              <Image source={{ uri: post.originalPost.authorAvatar }} style={styles.quotedAvatar} />
              <Text style={styles.quotedAuthor}>{post.originalPost.authorName}</Text>
              <Text style={styles.quotedTime}>{post.originalPost.postedAt}</Text>
            </View>
            <Text style={styles.quotedText} numberOfLines={3}>
              {post.originalPost.content.replace(/^"|"$/g, '')}
            </Text>
            {post.originalPost.imageUrl && (
              <Image
                source={{ uri: post.originalPost.imageUrl }}
                style={styles.quotedImage}
                contentFit="cover"
              />
            )}
          </View>
        </View>
      )}

      {post.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {post.tags.map((tag) => (
            <View key={tag} style={styles.tagPill}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {post.prayedByAvatars.length > 0 && (
        <View style={styles.prayingRow}>
          <View style={styles.avatarStack}>
            {post.prayedByAvatars.slice(0, 3).map((uri, i) => (
              <Image
                key={i}
                source={{ uri }}
                style={[styles.stackAvatar, { marginLeft: i === 0 ? 0 : -8 }]}
              />
            ))}
          </View>
          <Text style={styles.prayingCount}>
            {prayCount} PEOPLE PRAYING NOW
          </Text>
        </View>
      )}

      <View style={styles.cardActions}>
        {isAuthor ? (
          <>
            <Pressable
              style={({ pressed }) => [styles.prayingCountBtn, pressed && { opacity: 0.85 }]}
              onPress={() => onPrayingUsersPress(post)}
            >
              <Text style={styles.prayingCountBtnText}>{prayCount} praying</Text>
            </Pressable>

            <Pressable style={styles.encourageBtn} onPress={() => onComment(post)}>
              <MessageCircle size={16} color={Colors.mutedForeground} />
              <Text style={styles.encourageBtnText}>View</Text>
            </Pressable>

            {!isUpdatePost && (
              <Pressable style={styles.repostBtn} onPress={() => onRepost(post)}>
                <Repeat2 size={16} color={Colors.primary} />
                <Text style={styles.repostBtnText}>Update</Text>
              </Pressable>
            )}
          </>
        ) : (
          <>
            <Pressable
              style={[styles.prayBtn, hasPrayed && styles.prayBtnActive]}
              onPress={() => onPray(post.id)}
            >
              <Heart
                size={16}
                color={hasPrayed ? Colors.primaryForeground : Colors.primary}
                fill={hasPrayed ? Colors.primaryForeground : "transparent"}
              />
              <Text style={[styles.prayBtnText, hasPrayed && styles.prayBtnTextActive]}>
                {hasPrayed ? "Praying" : "Pray"}
              </Text>
            </Pressable>

            <Pressable style={styles.encourageBtn} onPress={() => onComment(post)}>
              <MessageCircle size={16} color={Colors.mutedForeground} />
              <Text style={styles.encourageBtnText}>Encourage</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

interface PrayingUsersModalProps {
  post: FeedPost;
  onClose: () => void;
}

function PrayingUsersModal({ post, onClose }: PrayingUsersModalProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(500)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 13, useNativeDriver: true }),
    ]).start();
  }, [slideAnim, fadeAnim]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 500, duration: 220, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [onClose, fadeAnim, slideAnim]);

  const prayingUsers = post.prayedByAvatars.map((uri) => ({
    uri,
    name: AVATAR_NAME_MAP[uri] ?? "Anonymous",
  }));

  const extraCount = Math.max(0, post.prayerCount - prayingUsers.length);

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <Animated.View style={[styles.puOverlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <Animated.View
          style={[
            styles.puSheet,
            { paddingBottom: insets.bottom + 36, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.puDragHandle} />

          <View style={styles.puHeader}>
            <View style={styles.puHeaderLeft}>
              <Text style={styles.puTitle}>Praying</Text>
              <View style={styles.puCountBadge}>
                <Text style={styles.puCountBadgeText}>{post.prayerCount}</Text>
              </View>
            </View>
            <Pressable style={styles.puCloseBtn} onPress={handleClose}>
              <X size={18} color={Colors.secondaryForeground} />
            </Pressable>
          </View>

          <Text style={styles.puSubtitle}>People praying for {post.authorName.split(" ")[0]}</Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.puList}
          >
            {prayingUsers.map((user, i) => (
              <View key={i} style={styles.puRow}>
                <Image source={{ uri: user.uri }} style={styles.puAvatar} />
                <Text style={styles.puName}>{user.name}</Text>
                <View style={styles.puPrayingBadge}>
                  <Text style={styles.puPrayingBadgeText}>🙏 Praying</Text>
                </View>
              </View>
            ))}
            {extraCount > 0 && (
              <View style={styles.puExtraRow}>
                <View style={styles.puExtraCircle}>
                  <Text style={styles.puExtraText}>+{extraCount}</Text>
                </View>
                <Text style={styles.puExtraLabel}>{extraCount} more {extraCount === 1 ? "person is" : "people are"} praying</Text>
              </View>
            )}
            {prayingUsers.length === 0 && extraCount === 0 && (
              <View style={styles.puEmpty}>
                <Text style={styles.puEmptyEmoji}>🙏</Text>
                <Text style={styles.puEmptyText}>No one has prayed yet.</Text>
                <Text style={styles.puEmptySubText}>Be the first to pray for this request</Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

interface PrayerShareSheetProps {
  post: FeedPost;
  isAuthor: boolean;
  onClose: () => void;
}

function getShareMessage(post: FeedPost): string {
  const link = `https://prayerspace.app/prayer/${post.id}`;
  if (post.updateTag === "answered" || post.updateTag === "thank_you") {
    return `An encouraging prayer update 🙏 ${link}`;
  }
  if (post.updateTag === "still_need_prayer") {
    return `Can you pray for this? 🙏 ${link}`;
  }
  if (post.originalPost) {
    return `Please keep praying for this update 🙏 ${link}`;
  }
  return `Can you pray for this? 🙏 ${link}`;
}

function PrayerShareSheet({ post, isAuthor, onClose }: PrayerShareSheetProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(600)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const shareLink = `https://prayerspace.app/prayer/${post.id}`;
  const shareMsg = getShareMessage(post);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 12, useNativeDriver: true }),
    ]).start();
  }, [slideAnim, fadeAnim]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 600, duration: 240, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [onClose, fadeAnim, slideAnim]);

  const handleWhatsApp = useCallback(async () => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const encoded = encodeURIComponent(shareMsg);
    const url = `whatsapp://send?text=${encoded}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Share.share({ message: shareMsg, title: "Invite to Pray" });
      }
    } catch {
      await Share.share({ message: shareMsg, title: "Invite to Pray" });
    }
    console.log("[ShareSheet] Shared via WhatsApp, post:", post.id);
  }, [shareMsg, post.id]);

  const handleSMS = useCallback(async () => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const encoded = encodeURIComponent(shareMsg);
    const url = Platform.OS === "ios" ? `sms:&body=${encoded}` : `sms:?body=${encoded}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Share.share({ message: shareMsg, title: "Invite to Pray" });
      }
    } catch {
      await Share.share({ message: shareMsg, title: "Invite to Pray" });
    }
    console.log("[ShareSheet] Shared via SMS, post:", post.id);
  }, [shareMsg, post.id]);

  const handleCopyLink = useCallback(async () => {
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareLink);
      } else {
        await Share.share({ message: shareLink, title: "Prayer Request Link" });
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      console.log("[ShareSheet] Copy link failed");
    }
    console.log("[ShareSheet] Copied link for post:", post.id);
  }, [shareLink, post.id]);

  const handleInternalChat = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    handleClose();
    console.log("[ShareSheet] Send to Chat — navigating, post:", post.id);
    setTimeout(() => {
      router.push({
        pathname: "/send-to-chat",
        params: {
          postId: post.id,
          authorName: post.authorName,
          authorAvatar: post.authorAvatar,
          postContent: post.content.substring(0, 300),
          updateTag: post.updateTag ?? "",
        },
      });
    }, 350);
  }, [handleClose, post, router]);

  const handleInternalGroup = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    handleClose();
    console.log("[ShareSheet] Send to Group — navigating, post:", post.id);
    setTimeout(() => {
      router.push({
        pathname: "/send-to-group",
        params: {
          postId: post.id,
          authorName: post.authorName,
          authorAvatar: post.authorAvatar,
          postContent: post.content.substring(0, 300),
          updateTag: post.updateTag ?? "",
        },
      });
    }, 350);
  }, [handleClose, post, router]);

  const previewContent = post.content.replace(/^"|"$/g, "");
  const updateTagConfig = post.updateTag ? UPDATE_TAG_CONFIG[post.updateTag] : null;

  const title = isAuthor ? "Invite others to pray with you" : "Pass this prayer update on";
  const subtitle = "Share this update with someone who can pray";

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <Animated.View style={[styles.shareOverlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <Animated.View
          style={[
            styles.shareSheet,
            { paddingBottom: insets.bottom + 32, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.shareHandle} />

          <View style={styles.shareHeader}>
            <View style={styles.shareHeaderLeft}>
              <View style={styles.shareHandsIcon}>
                <Text style={styles.shareHandsEmoji}>🙏</Text>
              </View>
              <View style={styles.shareHeaderText}>
                <Text style={styles.shareTitle}>{title}</Text>
                <Text style={styles.shareSubtitle}>{subtitle}</Text>
              </View>
            </View>
            <Pressable style={styles.closeBtn} onPress={handleClose}>
              <X size={18} color={Colors.mutedForeground} />
            </Pressable>
          </View>

          <View style={styles.sharePreviewCard}>
            <View style={styles.sharePreviewTop}>
              <Image source={{ uri: post.authorAvatar }} style={styles.sharePreviewAvatar} />
              <View style={styles.sharePreviewAuthorBlock}>
                <Text style={styles.sharePreviewAuthorName}>{post.authorName}</Text>
                <Text style={styles.sharePreviewTime}>{post.postedAt}</Text>
              </View>
              {updateTagConfig && (
                <View style={[styles.sharePreviewTag, { backgroundColor: updateTagConfig.bg }]}>
                  <Text style={[styles.sharePreviewTagText, { color: updateTagConfig.color }]}>
                    {updateTagConfig.label}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.sharePreviewContent} numberOfLines={3}>
              {previewContent}
            </Text>
          </View>

          <View style={styles.shareSectionLabel}>
            <Text style={styles.shareSectionText}>WITHIN PRAYER SPACE</Text>
          </View>

          <View style={styles.shareInternalOptions}>
            <Pressable style={styles.shareInternalRow} onPress={handleInternalChat}>
              <View style={[styles.shareInternalIcon, { backgroundColor: Colors.accent }]}>
                <MessageCircle size={18} color={Colors.primary} />
              </View>
              <View style={styles.shareInternalText}>
                <Text style={styles.shareInternalLabel}>Send to Chat</Text>
                <Text style={styles.shareInternalSub}>Share as a prayer invitation in a conversation</Text>
              </View>
              <ChevronRight size={16} color={Colors.mutedForeground} />
            </Pressable>

            <Pressable style={[styles.shareInternalRow, { borderBottomWidth: 0 }]} onPress={handleInternalGroup}>
              <View style={[styles.shareInternalIcon, { backgroundColor: Colors.accent }]}>
                <Users size={18} color={Colors.primary} />
              </View>
              <View style={styles.shareInternalText}>
                <Text style={styles.shareInternalLabel}>Send to Group</Text>
                <Text style={styles.shareInternalSub}>Pass this update to a prayer group</Text>
              </View>
              <ChevronRight size={16} color={Colors.mutedForeground} />
            </Pressable>
          </View>

          <View style={[styles.shareSectionLabel, { marginTop: 16 }]}>
            <Text style={styles.shareSectionText}>EXTERNAL</Text>
          </View>

          <View style={styles.shareOptionsRow}>
            <TouchableOpacity style={styles.shareOptionBtn} onPress={handleWhatsApp} activeOpacity={0.75}>
              <View style={[styles.shareOptionIcon, { backgroundColor: "#25D366" }]}>
                <Text style={styles.shareOptionEmoji}>💬</Text>
              </View>
              <Text style={styles.shareOptionLabel}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareOptionBtn} onPress={handleSMS} activeOpacity={0.75}>
              <View style={[styles.shareOptionIcon, { backgroundColor: Colors.primary }]}>
                <MessageCircle size={22} color="#fff" />
              </View>
              <Text style={styles.shareOptionLabel}>Text Message</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareOptionBtn} onPress={handleCopyLink} activeOpacity={0.75}>
              <View style={[styles.shareOptionIcon, { backgroundColor: copiedLink ? Colors.green : Colors.secondary }]}>
                {copiedLink
                  ? <Check size={22} color="#fff" />
                  : <Link2 size={22} color={Colors.foreground} />}
              </View>
              <Text style={styles.shareOptionLabel}>{copiedLink ? "Copied!" : "Copy Link"}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sharePrivacyNote}>
            <Text style={styles.sharePrivacyText}>
              You are intentionally passing along this prayer update.
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

interface RepostComposerModalProps {
  originalPost: FeedPost;
  onClose: () => void;
  onSubmit: (originalPost: FeedPost, updateText: string, updateTag?: UpdateTag) => void;
}

function RepostComposerModal({ originalPost, onClose, onSubmit }: RepostComposerModalProps) {
  const [updateText, setUpdateText] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<UpdateTag | null>(null);
  const [repostImageUri, setRepostImageUri] = useState<string | null>(null);
  const [viewingRepostImage, setViewingRepostImage] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(700)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
    ]).start();
  }, [slideAnim, fadeAnim]);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 700, duration: 240, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [onClose, fadeAnim, slideAnim]);

  const handleSubmit = useCallback(() => {
    if (!updateText.trim() && !repostImageUri) return;
    console.log('[Repost] Submitting update with image:', !!repostImageUri);
    onSubmit(originalPost, updateText.trim(), selectedTag ?? undefined);
    setRepostImageUri(null);
  }, [updateText, selectedTag, originalPost, onSubmit, repostImageUri]);

  const canSubmit = updateText.trim().length > 0 || !!repostImageUri;

  const UPDATE_TAGS: { key: UpdateTag; label: string; emoji: string }[] = [
    { key: 'still_need_prayer', label: 'Still need prayer', emoji: '🙏' },
    { key: 'answered', label: 'Answered', emoji: '✅' },
    { key: 'thank_you', label: 'Thank you', emoji: '💛' },
  ];

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.repostModalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.45)", opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>
        <Animated.View
          style={[
            styles.repostModalSheet,
            { paddingBottom: insets.bottom + 32, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.repostModalHandle} />

          <View style={styles.repostModalHeader}>
            <View>
              <Text style={styles.repostModalTitle}>Share an Update</Text>
              <Text style={styles.repostModalSub}>Let others know how this prayer is going</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={handleClose}>
              <X size={18} color={Colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.repostQuotedOriginal}>
              <View style={styles.repostQuotedBar} />
              <View style={styles.repostQuotedContent}>
                <View style={styles.repostQuotedHeader}>
                  <Image source={{ uri: originalPost.authorAvatar }} style={styles.repostQuotedAvatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.repostQuotedAuthor}>{originalPost.authorName}</Text>
                    <Text style={styles.repostQuotedTime}>{originalPost.postedAt}</Text>
                  </View>
                </View>
                <Text style={styles.repostQuotedText} numberOfLines={4}>
                  {originalPost.content.replace(/^"|"$/g, '')}
                </Text>
                {originalPost.imageUrl && (
                  <Image
                    source={{ uri: originalPost.imageUrl }}
                    style={styles.repostQuotedImage}
                    contentFit="cover"
                  />
                )}
              </View>
            </View>

            <View style={styles.repostInputWrap}>
              <TextInput
                style={styles.repostInput}
                placeholder="Share an update..."
                placeholderTextColor={Colors.mutedForeground + "80"}
                multiline
                maxLength={500}
                value={updateText}
                onChangeText={setUpdateText}
                textAlignVertical="top"
                autoFocus
              />
              {repostImageUri && (
                <View style={styles.repostImagePreview}>
                  <ImageAttachment
                    imageUri={repostImageUri}
                    onImageSelected={setRepostImageUri}
                    onRemove={() => setRepostImageUri(null)}
                  />
                  <Pressable
                    onPress={() => setViewingRepostImage(repostImageUri)}
                    style={StyleSheet.absoluteFill}
                  />
                </View>
              )}
            </View>

            <View style={styles.repostImagePickerRow}>
              <ImageAttachment
                imageUri={null}
                onImageSelected={(uri) => setRepostImageUri(uri)}
                onRemove={() => {}}
              />
              <Text style={styles.repostImagePickerHint}>Add a photo</Text>
            </View>

            <View style={styles.repostTagSection}>
              <Text style={styles.repostTagLabel}>How is this prayer going? (optional)</Text>
              <View style={styles.repostTagRow}>
                {UPDATE_TAGS.map((tag) => {
                  const isSelected = selectedTag === tag.key;
                  return (
                    <Pressable
                      key={tag.key}
                      style={[styles.repostTagChip, isSelected && styles.repostTagChipSelected]}
                      onPress={() => setSelectedTag(isSelected ? null : tag.key)}
                    >
                      <Text style={styles.repostTagEmoji}>{tag.emoji}</Text>
                      <Text style={[styles.repostTagText, isSelected && styles.repostTagTextSelected]}>
                        {tag.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <View style={styles.repostFooter}>
            <Pressable
              style={[styles.repostSubmitBtn, !canSubmit && styles.repostSubmitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              <Repeat2 size={18} color={Colors.primaryForeground} />
              <Text style={styles.repostSubmitText}>Share Update</Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
      <ImageViewer
        uri={viewingRepostImage}
        visible={!!viewingRepostImage}
        onClose={() => setViewingRepostImage(null)}
      />
    </Modal>
  );
}

interface PostActionsModalProps {
  post: FeedPost;
  isAuthor: boolean;
  onClose: () => void;
  onArchive: (post: FeedPost) => void;
  onRepost: (post: FeedPost) => void;
  onDelete: (post: FeedPost) => void;
  onHide: (post: FeedPost) => void;
  onReport: (post: FeedPost) => void;
  onShare: (post: FeedPost) => void;
}

function PostActionsModal({ post, isAuthor, onClose, onArchive, onRepost, onDelete, onHide, onReport, onShare }: PostActionsModalProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [reportStep, setReportStep] = useState<boolean>(false);
  const [reportSubmitted, setReportSubmitted] = useState<boolean>(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }),
    ]).start();
  }, [slideAnim, fadeAnim]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 400, duration: 220, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [onClose, fadeAnim, slideAnim]);

  const handleArchive = useCallback(() => {
    handleClose();
    setTimeout(() => {
      Alert.alert(
        "Archive Prayer",
        "This prayer will be removed from the active feed. You can still find it in your prayer history.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Archive", onPress: () => onArchive(post) },
        ]
      );
    }, 250);
  }, [post, onArchive, handleClose]);

  const handleDelete = useCallback(() => {
    handleClose();
    setTimeout(() => {
      Alert.alert(
        "Delete Prayer Request",
        "This will permanently remove your prayer request. This action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => onDelete(post) },
        ]
      );
    }, 250);
  }, [post, onDelete, handleClose]);

  const handleRepost = useCallback(() => {
    handleClose();
    setTimeout(() => onRepost(post), 300);
  }, [post, onRepost, handleClose]);

  const handleShare = useCallback(() => {
    handleClose();
    setTimeout(() => onShare(post), 320);
  }, [post, onShare, handleClose]);

  const handleHide = useCallback(() => {
    onHide(post);
  }, [post, onHide]);

  const REPORT_REASONS = [
    "Inappropriate content",
    "Spam or misleading",
    "Harmful or offensive",
    "Other",
  ];

  const handleReportReason = useCallback((reason: string) => {
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setReportSubmitted(true);
    onReport(post);
    console.log("[Community] Report submitted for post:", post.id, "reason:", reason);
  }, [post, onReport]);

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.4)", opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>
      <Animated.View
        style={[
          styles.actionsSheet,
          { paddingBottom: insets.bottom + 32, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.actionsHandle} />

        {reportStep ? (
          <>
            {reportSubmitted ? (
              <View style={styles.reportSuccessWrap}>
                <View style={styles.reportSuccessIcon}>
                  <CheckCircle size={28} color={Colors.green} />
                </View>
                <Text style={styles.reportSuccessTitle}>Report Submitted</Text>
                <Text style={styles.reportSuccessSub}>
                  Thank you for helping keep Prayer Space safe. We'll review this shortly.
                </Text>
                <Pressable style={styles.actionCancelBtn} onPress={handleClose}>
                  <Text style={styles.actionCancelText}>Done</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.reportHeader}>
                  <Pressable onPress={() => setReportStep(false)} style={styles.reportBackBtn}>
                    <ChevronRight size={18} color={Colors.mutedForeground} style={{ transform: [{ rotate: '180deg' }] }} />
                  </Pressable>
                  <View style={styles.reportHeaderText}>
                    <Text style={styles.actionsTitle}>Report Post</Text>
                    <Text style={styles.actionSub}>Why are you reporting this?</Text>
                  </View>
                </View>
                {REPORT_REASONS.map((reason, i) => (
                  <Pressable
                    key={reason}
                    style={[styles.actionItem, i === REPORT_REASONS.length - 1 && { borderBottomWidth: 0 }]}
                    onPress={() => handleReportReason(reason)}
                  >
                    <View style={styles.actionTextWrap}>
                      <Text style={styles.actionLabel}>{reason}</Text>
                    </View>
                    <ChevronRight size={16} color={Colors.mutedForeground} />
                  </Pressable>
                ))}
                <Pressable style={[styles.actionCancelBtn, { marginTop: 12 }]} onPress={handleClose}>
                  <Text style={styles.actionCancelText}>Cancel</Text>
                </Pressable>
              </>
            )}
          </>
        ) : isAuthor ? (
          <>
            <Text style={styles.actionsTitle}>Your Prayer</Text>

            <Pressable style={styles.actionItem} onPress={handleShare}>
              <View style={[styles.actionIconWrap, { backgroundColor: Colors.accent }]}>
                <Share2 size={18} color={Colors.primary} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionLabel}>Share</Text>
                <Text style={styles.actionSub}>Share this prayer request</Text>
              </View>
              <ChevronRight size={16} color={Colors.mutedForeground} />
            </Pressable>

            <Pressable style={styles.actionItem} onPress={handleArchive}>
              <View style={[styles.actionIconWrap, { backgroundColor: Colors.secondary }]}>
                <Archive size={18} color={Colors.secondaryForeground} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionLabel}>Archive</Text>
                <Text style={styles.actionSub}>Remove from feed, keep in history</Text>
              </View>
              <ChevronRight size={16} color={Colors.mutedForeground} />
            </Pressable>

            <Pressable style={[styles.actionItem, { borderBottomWidth: 0 }]} onPress={handleDelete}>
              <View style={[styles.actionIconWrap, { backgroundColor: Colors.destructive + "15" }]}>
                <Trash2 size={18} color={Colors.destructive} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={[styles.actionLabel, { color: Colors.destructive }]}>Delete</Text>
                <Text style={styles.actionSub}>Permanently remove this post</Text>
              </View>
              <ChevronRight size={16} color={Colors.destructive + "80"} />
            </Pressable>

            <Pressable style={styles.actionCancelBtn} onPress={handleClose}>
              <Text style={styles.actionCancelText}>Cancel</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.actionsTitle}>Post Options</Text>

            <Pressable style={styles.actionItem} onPress={handleHide}>
              <View style={[styles.actionIconWrap, { backgroundColor: Colors.secondary }]}>
                <EyeOff size={18} color={Colors.secondaryForeground} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionLabel}>Hide Post</Text>
                <Text style={styles.actionSub}>Remove from your feed only</Text>
              </View>
              <ChevronRight size={16} color={Colors.mutedForeground} />
            </Pressable>

            <Pressable style={styles.actionItem} onPress={handleShare}>
              <View style={[styles.actionIconWrap, { backgroundColor: Colors.accent }]}>
                <Share2 size={18} color={Colors.primary} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionLabel}>Share</Text>
                <Text style={styles.actionSub}>Share this prayer request</Text>
              </View>
              <ChevronRight size={16} color={Colors.mutedForeground} />
            </Pressable>

            <Pressable style={[styles.actionItem, { borderBottomWidth: 0 }]} onPress={() => setReportStep(true)}>
              <View style={[styles.actionIconWrap, { backgroundColor: Colors.destructive + "15" }]}>
                <Flag size={18} color={Colors.destructive} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={[styles.actionLabel, { color: Colors.destructive }]}>Report</Text>
                <Text style={styles.actionSub}>Flag this content for review</Text>
              </View>
              <ChevronRight size={16} color={Colors.destructive + "80"} />
            </Pressable>

            <Pressable style={styles.actionCancelBtn} onPress={handleClose}>
              <Text style={styles.actionCancelText}>Cancel</Text>
            </Pressable>
          </>
        )}
      </Animated.View>
    </Modal>
  );
}

interface CommentsModalProps {
  post: FeedPost;
  onClose: () => void;
  onAddComment: (postId: string, text: string) => void;
}

function CommentsModal({ post, onClose, onAddComment }: CommentsModalProps) {
  const [inputText, setInputText] = useState<string>("");
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-700)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [slideAnim]);

  const handleClose = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: -700,
      duration: 280,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [onClose, slideAnim]);

  const handleSend = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAddComment(post.id, trimmed);
    setInputText("");
    Keyboard.dismiss();
  }, [inputText, post.id, onAddComment]);

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.modalOverlayKAV}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <Animated.View
          style={[
            styles.modalSheet,
            { paddingTop: insets.top + 8, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Encouragements</Text>
              <Text style={styles.modalSub}>{post.commentCount} responses</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={handleClose}>
              <X size={18} color={Colors.mutedForeground} />
            </Pressable>
          </View>

          <View style={styles.modalPostPreview}>
            <Image source={{ uri: post.authorAvatar }} style={styles.previewAvatar} />
            <View style={styles.previewTextWrap}>
              <Text style={styles.previewAuthor}>{post.authorName}</Text>
              <Text style={styles.previewContent} numberOfLines={2}>{post.content}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <ScrollView
            style={styles.commentsList}
            contentContainerStyle={styles.commentsListContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {post.comments.map((comment) => (
              <View key={comment.id} style={styles.commentItem}>
                <Image source={{ uri: comment.authorAvatar }} style={styles.commentAvatar} />
                <View style={styles.commentBubble}>
                  <View style={styles.commentBubbleHeader}>
                    <Text style={styles.commentAuthor}>{comment.authorName}</Text>
                    <Text style={styles.commentTime}>{comment.time}</Text>
                  </View>
                  <Text style={styles.commentText}>{comment.text}</Text>
                </View>
              </View>
            ))}
            {post.comments.length === 0 && (
              <View style={styles.emptyComments}>
                <Text style={styles.emptyCommentsText}>Be the first to encourage 🙏</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.inputRow}>
            <Image
              source={{ uri: "https://randomuser.me/api/portraits/women/68.jpg" }}
              style={styles.inputAvatar}
            />
            <TextInput
              style={styles.textInput}
              placeholder="Add an encouragement..."
              placeholderTextColor={Colors.mutedForeground}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={300}
            />
            <Pressable
              style={[styles.sendBtn, inputText.trim().length > 0 && styles.sendBtnActive]}
              onPress={handleSend}
            >
              <Send size={16} color={inputText.trim().length > 0 ? Colors.primaryForeground : Colors.mutedForeground} />
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface StopPrayingModalProps {
  authorName: string;
  onKeep: () => void;
  onStop: () => void;
}

function StopPrayingModal({ authorName, onKeep, onStop }: StopPrayingModalProps) {
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim, fadeAnim]);

  return (
    <Modal visible transparent animationType="none" onRequestClose={onKeep} statusBarTranslucent>
      <Animated.View style={[styles.stopOverlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onKeep} />
        <Animated.View style={[styles.stopSheet, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.stopIconWrap}>
            <Heart size={26} color={Colors.primary} fill={Colors.primary} />
          </View>
          <Text style={styles.stopTitle}>Stop Praying?</Text>
          <Text style={styles.stopBody}>
            Are you sure you want to stop praying for{" "}
            <Text style={styles.stopNameBold}>{authorName}</Text>'s request?
          </Text>
          <Pressable style={styles.keepBtn} onPress={onKeep}>
            <Heart size={16} color={Colors.primaryForeground} fill={Colors.primaryForeground} />
            <Text style={styles.keepBtnText}>Keep Praying</Text>
          </Pressable>
          <Pressable style={styles.stopBtn} onPress={onStop}>
            <Text style={styles.stopBtnText}>Stop Praying</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

interface CreateCommunityPaywallModalProps {
  visible: boolean;
  onClose: () => void;
}

function CreateCommunityPaywallModal({ visible, onClose }: CreateCommunityPaywallModalProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(800)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const crownAnim = useRef(new Animated.Value(0.7)).current;
  const featuresAnim = useRef(new Animated.Value(0)).current;
  const [step, setStep] = useState<"type" | "public_setup" | "private_paywall">("type");
  const [communityName, setCommunityName] = useState<string>("");
  const [communityDesc, setCommunityDesc] = useState<string>("");
  const [creating, setCreating] = useState<boolean>(false);

  const PRIVATE_FEATURES = [
    { emoji: "\uD83C\uDFDB\uFE0F", title: "Create your own community", desc: "Name it, brand it, own it" },
    { emoji: "\uD83D\uDC65", title: "Invite unlimited members", desc: "Share a private code to grow your space" },
    { emoji: "\uD83D\uDD12", title: "Password or invite code", desc: "Control who can join and see posts" },
    { emoji: "\u2728", title: "Full admin controls", desc: "Approve members, manage posts" },
  ];

  useEffect(() => {
    if (visible) {
      setStep("type");
      setCommunityName("");
      setCommunityDesc("");
      setCreating(false);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 800, duration: 280, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  useEffect(() => {
    if (step === "private_paywall") {
      crownAnim.setValue(0.7);
      featuresAnim.setValue(0);
      Animated.parallel([
        Animated.spring(crownAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(featuresAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]).start();
    }
  }, [step, crownAnim, featuresAnim]);

  const handleCreatePublic = useCallback(() => {
    if (!communityName.trim()) return;
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCreating(true);
    setTimeout(() => {
      console.log("[Community] Created public community:", communityName.trim(), communityDesc.trim());
      setCreating(false);
      onClose();
    }, 800);
  }, [communityName, communityDesc, onClose]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[styles.paywallOverlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.paywallSheet,
            { paddingBottom: insets.bottom + 28, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.paywallHandle} />

          <Pressable style={styles.paywallClose} onPress={onClose}>
            <X size={18} color={Colors.mutedForeground} />
          </Pressable>

          {step === "type" && (
            <>
              <View style={styles.createTypeHeader}>
                <Text style={styles.paywallTitle}>Create a Community</Text>
                <Text style={styles.paywallSubtitle}>
                  Choose the type of prayer space you want to build.
                </Text>
              </View>

              <Pressable
                style={styles.createTypeCard}
                onPress={() => {
                  if (Platform.OS !== "web") void Haptics.selectionAsync();
                  setStep("public_setup");
                }}
              >
                <View style={styles.createTypeCardTop}>
                  <View style={[styles.createTypeIconWrap, { backgroundColor: Colors.accent }]}>
                    <Globe size={22} color={Colors.primary} />
                  </View>
                  <View style={styles.createTypeCardInfo}>
                    <View style={styles.createTypeCardTitleRow}>
                      <Text style={styles.createTypeCardName}>Public Community</Text>
                      <View style={[styles.createTypeBadge, { backgroundColor: "#E8F5E9" }]}>
                        <Text style={[styles.createTypeBadgeText, { color: "#2E7D32" }]}>FREE</Text>
                      </View>
                    </View>
                    <Text style={styles.createTypeCardSub}>Open to anyone · No approval needed</Text>
                  </View>
                  <ChevronRight size={18} color={Colors.mutedForeground} />
                </View>
                <View style={styles.createTypeFeatureList}>
                  {(["Edit name & description", "Pin posts", "Basic moderation"] as const).map((f) => (
                    <View key={f} style={styles.createTypeFeatureRow}>
                      <CheckCircle size={12} color={Colors.primary} />
                      <Text style={styles.createTypeFeatureText}>{f}</Text>
                    </View>
                  ))}
                </View>
              </Pressable>

              <Pressable
                style={[styles.createTypeCard, styles.createTypeCardPro]}
                onPress={() => {
                  if (Platform.OS !== "web") void Haptics.selectionAsync();
                  setStep("private_paywall");
                }}
              >
                <View style={styles.createTypeCardTop}>
                  <View style={[styles.createTypeIconWrap, { backgroundColor: "#FFF4E0" }]}>
                    <Lock size={22} color="#B5820A" />
                  </View>
                  <View style={styles.createTypeCardInfo}>
                    <View style={styles.createTypeCardTitleRow}>
                      <Text style={styles.createTypeCardName}>Private Community</Text>
                      <View style={[styles.createTypeBadge, { backgroundColor: "#FFF4E0", flexDirection: "row" as const, alignItems: "center" as const, gap: 3 }]}>
                        <Crown size={8} color="#B5820A" />
                        <Text style={[styles.createTypeBadgeText, { color: "#B5820A" }]}>PRO</Text>
                      </View>
                    </View>
                    <Text style={styles.createTypeCardSub}>Password protected · Full admin controls</Text>
                  </View>
                  <ChevronRight size={18} color={Colors.mutedForeground} />
                </View>
                <View style={styles.createTypeFeatureList}>
                  {(["Approve or remove members", "Control who can post", "Manage community settings"] as const).map((f) => (
                    <View key={f} style={styles.createTypeFeatureRow}>
                      <CheckCircle size={12} color="#B5820A" />
                      <Text style={[styles.createTypeFeatureText, { color: "#755C4A" }]}>{f}</Text>
                    </View>
                  ))}
                </View>
              </Pressable>

              <View style={styles.createTypeFooter}>
                <Sparkles size={12} color={Colors.mutedForeground} />
                <Text style={styles.createTypeFooterText}>
                  Official communities are created and verified by Prayer Space directly.
                </Text>
              </View>
            </>
          )}

          {step === "public_setup" && (
            <>
              <Pressable style={styles.createBackBtn} onPress={() => setStep("type")}>
                <ChevronRight size={16} color={Colors.mutedForeground} style={{ transform: [{ rotate: "180deg" }] }} />
                <Text style={styles.createBackText}>Back</Text>
              </Pressable>

              <View style={styles.createTypeHeader}>
                <View style={[styles.createTypeIconWrap, { backgroundColor: Colors.accent, alignSelf: "center" as const, marginBottom: 12 }]}>
                  <Globe size={26} color={Colors.primary} />
                </View>
                <Text style={styles.paywallTitle}>Public Community</Text>
                <Text style={styles.paywallSubtitle}>
                  Set up your space. Anyone can discover and join.
                </Text>
              </View>

              <View style={styles.createInputSection}>
                <Text style={styles.createInputLabel}>COMMUNITY NAME</Text>
                <TextInput
                  style={styles.createInput}
                  placeholder="e.g. Sunday Prayers, City Intercession..."
                  placeholderTextColor={Colors.mutedForeground + "70"}
                  value={communityName}
                  onChangeText={setCommunityName}
                  maxLength={50}
                  autoFocus
                />
              </View>

              <View style={styles.createInputSection}>
                <Text style={styles.createInputLabel}>DESCRIPTION (optional)</Text>
                <TextInput
                  style={[styles.createInput, styles.createInputMulti]}
                  placeholder="What is this community about?"
                  placeholderTextColor={Colors.mutedForeground + "70"}
                  value={communityDesc}
                  onChangeText={setCommunityDesc}
                  maxLength={200}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <Pressable
                style={[styles.paywallUpgradeBtn, { backgroundColor: Colors.primary }, (!communityName.trim() || creating) && { opacity: 0.6 }]}
                onPress={handleCreatePublic}
                disabled={!communityName.trim() || creating}
              >
                <Globe size={18} color="#fff" />
                <Text style={styles.paywallUpgradeBtnText}>
                  {creating ? "Creating..." : "Create Community"}
                </Text>
              </Pressable>

              <Pressable style={styles.paywallMaybeLater} onPress={onClose}>
                <Text style={styles.paywallMaybeLaterText}>Cancel</Text>
              </Pressable>
            </>
          )}

          {step === "private_paywall" && (
            <>
              <Pressable style={styles.createBackBtn} onPress={() => setStep("type")}>
                <ChevronRight size={16} color={Colors.mutedForeground} style={{ transform: [{ rotate: "180deg" }] }} />
                <Text style={styles.createBackText}>Back</Text>
              </Pressable>

              <Animated.View style={[styles.paywallCrownWrap, { transform: [{ scale: crownAnim }] }]}>
                <Image
                  source={{ uri: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/h0l532c787cc9aqn15hxr.png" }}
                  style={styles.paywallProBadge}
                  contentFit="contain"
                />
              </Animated.View>

              <Text style={styles.paywallTitle}>Private Community</Text>
              <Text style={styles.paywallSubtitle}>
                Perfect for churches and small groups. Available on Prayer Space Pro.
              </Text>

              <Animated.View style={[styles.paywallFeatures, { opacity: featuresAnim }]}>
                {PRIVATE_FEATURES.map((f, i) => (
                  <View key={i} style={styles.paywallFeatureRow}>
                    <View style={styles.paywallFeatureIcon}>
                      <Text style={styles.paywallFeatureEmoji}>{f.emoji}</Text>
                    </View>
                    <View style={styles.paywallFeatureTextWrap}>
                      <Text style={styles.paywallFeatureTitle}>{f.title}</Text>
                      <Text style={styles.paywallFeatureDesc}>{f.desc}</Text>
                    </View>
                  </View>
                ))}
              </Animated.View>

              <Pressable
                style={styles.paywallUpgradeBtn}
                onPress={() => {
                  if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  console.log("[Paywall] Upgrade to Pro tapped");
                  onClose();
                }}
              >
                <Image
                  source={{ uri: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/h0l532c787cc9aqn15hxr.png" }}
                  style={styles.paywallUpgradeBtnIcon}
                  contentFit="contain"
                />
                <Text style={styles.paywallUpgradeBtnText}>Upgrade to Pro</Text>
              </Pressable>

              <Pressable style={styles.paywallMaybeLater} onPress={onClose}>
                <Text style={styles.paywallMaybeLaterText}>Maybe later</Text>
              </Pressable>
            </>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

interface CommunityProfileModalProps {
  community: Community;
  isJoined: boolean;
  onClose: () => void;
  onJoin: (community: Community) => void;
}

function CommunityProfileModal({ community, isJoined, onClose, onJoin }: CommunityProfileModalProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(900)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [joining, setJoining] = useState<boolean>(false);
  const [showPasswordStep, setShowPasswordStep] = useState<boolean>(false);
  const [password, setPassword] = useState<string>("");
  const [passwordError, setPasswordError] = useState<boolean>(false);
  const [passwordJoining, setPasswordJoining] = useState<boolean>(false);
  const passwordSlideAnim = useRef(new Animated.Value(400)).current;
  const passwordFadeAnim = useRef(new Animated.Value(0)).current;
  const passwordInputRef = useRef<TextInput>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 12, useNativeDriver: true }),
    ]).start();
  }, [slideAnim, fadeAnim]);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 900, duration: 220, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [onClose, fadeAnim, slideAnim]);

  const handleJoinPublic = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setJoining(true);
    setTimeout(() => { onJoin(community); setJoining(false); }, 600);
  }, [community, onJoin]);

  const handleOpenPasswordStep = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setShowPasswordStep(true);
    setPassword("");
    setPasswordError(false);
    Animated.parallel([
      Animated.spring(passwordSlideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 12 }),
      Animated.timing(passwordFadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => passwordInputRef.current?.focus(), 100);
    });
  }, [passwordSlideAnim, passwordFadeAnim]);

  const handleClosePasswordStep = useCallback(() => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(passwordSlideAnim, { toValue: 400, duration: 240, useNativeDriver: true }),
      Animated.timing(passwordFadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setShowPasswordStep(false);
      setPassword("");
      setPasswordError(false);
    });
  }, [passwordSlideAnim, passwordFadeAnim]);

  const handleVerifyPassword = useCallback(() => {
    if (password.toUpperCase() === community.password) {
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Keyboard.dismiss();
      setPasswordJoining(true);
      setTimeout(() => { onJoin(community); setPasswordJoining(false); }, 600);
    } else {
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPasswordError(true);
      setTimeout(() => setPasswordError(false), 2200);
    }
  }, [password, community, onJoin]);

  const prayerCount = community.memberCount * 34;
  const groupCount = Math.max(1, Math.floor(community.memberCount / 16));
  const testimoniesCount = Math.floor(community.memberCount * 2.1);
  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toString();

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <Animated.View style={[cpStyles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[cpStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>

          <View style={cpStyles.hero}>
            <Image
              source={{ uri: community.bannerImage }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
            <LinearGradient
              colors={["rgba(0,0,0,0.4)", "rgba(0,0,0,0)", Colors.background]}
              locations={[0, 0.45, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={[cpStyles.headerRow, { top: insets.top + 14 }]}>
              <Pressable style={cpStyles.glassBtn} onPress={handleClose}>
                <ChevronRight size={20} color="#fff" style={{ transform: [{ rotate: "180deg" }] }} />
              </Pressable>
              <View style={cpStyles.headerRight}>
                <Pressable style={cpStyles.glassBtn}>
                  <Share2 size={17} color="#fff" />
                </Pressable>
                <Pressable style={cpStyles.glassBtn}>
                  <MoreHorizontal size={17} color="#fff" />
                </Pressable>
              </View>
            </View>
            <View style={cpStyles.heroBottom}>
              {community.isOfficial ? (
                <View style={[cpStyles.verifiedBadge, { backgroundColor: "#D4A017" }]}>
                  <Award size={9} color="#fff" />
                  <Text style={cpStyles.verifiedText}>Official Community</Text>
                </View>
              ) : community.isPrivate ? (
                <View style={[cpStyles.verifiedBadge, { backgroundColor: community.accentColor }]}>
                  <Lock size={9} color="#fff" />
                  <Text style={cpStyles.verifiedText}>Private Community</Text>
                </View>
              ) : (
                <View style={[cpStyles.verifiedBadge, { backgroundColor: community.accentColor }]}>
                  <Globe size={9} color="#fff" />
                  <Text style={cpStyles.verifiedText}>Public Community</Text>
                </View>
              )}
              <Text style={cpStyles.communityName}>{community.name}</Text>
              <View style={cpStyles.metaRow}>
                <Globe size={11} color={Colors.mutedForeground} />
                <Text style={cpStyles.metaText}>Community</Text>
                <View style={cpStyles.metaDot} />
                <Users size={11} color={Colors.mutedForeground} />
                <Text style={cpStyles.metaText}>{community.memberCount.toLocaleString()} Members</Text>
                {community.isPrivate && (
                  <>
                    <View style={cpStyles.metaDot} />
                    <Lock size={11} color={Colors.mutedForeground} />
                    <Text style={cpStyles.metaText}>Private</Text>
                  </>
                )}
              </View>
            </View>
          </View>

          <ScrollView
            style={cpStyles.content}
            contentContainerStyle={[cpStyles.contentInner, { paddingBottom: insets.bottom + 110 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={cpStyles.statsRow}>
              <View style={cpStyles.statItem}>
                <Text style={[cpStyles.statNum, { color: community.accentColor }]}>{fmt(prayerCount)}</Text>
                <Text style={cpStyles.statLabel}>PRAYERS</Text>
              </View>
              <View style={[cpStyles.statItem, cpStyles.statBorder]}>
                <Text style={cpStyles.statNum}>{groupCount}</Text>
                <Text style={cpStyles.statLabel}>GROUPS</Text>
              </View>
              <View style={[cpStyles.statItem, cpStyles.statBorder]}>
                <Text style={cpStyles.statNum}>{fmt(testimoniesCount)}</Text>
                <Text style={cpStyles.statLabel}>TESTIMONIES</Text>
              </View>
            </View>

            {community.description ? (
              <View style={cpStyles.section}>
                <Text style={cpStyles.sectionLabel}>ABOUT COMMUNITY</Text>
                <Text style={cpStyles.aboutText}>{community.description}</Text>
              </View>
            ) : null}

            <View style={cpStyles.section}>
              <Text style={cpStyles.sectionLabel}>RECENT ACTIVITY</Text>
              <View style={cpStyles.activityCard}>
                <View style={[cpStyles.activityIcon, { backgroundColor: Colors.accent }]}>
                  <HandHeart size={18} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={cpStyles.activityTitle}>Community Prayer</Text>
                  <Text style={cpStyles.activitySub} numberOfLines={1}>
                    &ldquo;Praying together for peace and healing...&rdquo;
                  </Text>
                </View>
                <Text style={cpStyles.activityTime}>2h ago</Text>
              </View>
            </View>


          </ScrollView>

          {!isJoined && (
            <View style={[cpStyles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
              <Pressable
                style={[cpStyles.joinBtn, { backgroundColor: community.accentColor }, joining && { opacity: 0.7 }]}
                onPress={community.isPrivate ? handleOpenPasswordStep : handleJoinPublic}
                disabled={joining}
              >
                {community.isPrivate ? (
                  <><Lock size={17} color="#fff" /><Text style={cpStyles.joinBtnText}>Join Community</Text></>
                ) : (
                  <><Users size={17} color="#fff" /><Text style={cpStyles.joinBtnText}>{joining ? "Joining..." : "Join Community"}</Text></>
                )}
              </Pressable>
              <Pressable style={cpStyles.cancelBtn} onPress={handleClose}>
                <Text style={cpStyles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          )}

          {showPasswordStep && (
            <Animated.View
              style={[
                cpStyles.passwordStepOverlay,
                { opacity: passwordFadeAnim },
              ]}
            >
              <Animated.View
                style={[
                  cpStyles.passwordStepSheet,
                  { paddingBottom: insets.bottom + 32, transform: [{ translateY: passwordSlideAnim }] },
                ]}
              >
                <View style={cpStyles.passwordStepHandle} />

                <View style={cpStyles.passwordStepHeader}>
                  <Pressable style={cpStyles.passwordStepBack} onPress={handleClosePasswordStep}>
                    <ChevronRight size={20} color={Colors.foreground} style={{ transform: [{ rotate: "180deg" }] }} />
                  </Pressable>
                  <View style={cpStyles.passwordStepHeaderCenter}>
                    <Text style={cpStyles.passwordStepTitle}>Enter Password</Text>
                    <Text style={cpStyles.passwordStepSub}>This community is private</Text>
                  </View>
                  <View style={{ width: 44 }} />
                </View>

                <View style={cpStyles.passwordCommunityPreview}>
                  <LinearGradient
                    colors={community.gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={cpStyles.passwordCommunityIcon}
                  >
                    <Text style={cpStyles.passwordCommunityLetter}>{community.iconLetter}</Text>
                  </LinearGradient>
                  <View style={cpStyles.passwordCommunityInfo}>
                    <Text style={cpStyles.passwordCommunityName}>{community.name}</Text>
                    <View style={cpStyles.passwordPrivateBadge}>
                      <Lock size={10} color={community.accentColor} />
                      <Text style={[cpStyles.passwordPrivateBadgeText, { color: community.accentColor }]}>Private Community</Text>
                    </View>
                  </View>
                </View>

                <Text style={cpStyles.passwordInstructionText}>
                  Enter the access code provided by the community admin to join.
                </Text>

                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
                  <View style={[cpStyles.passwordInputWrap, passwordError && { borderColor: Colors.destructive }]}>
                    <Lock size={18} color={passwordError ? Colors.destructive : Colors.mutedForeground} />
                    <TextInput
                      ref={passwordInputRef}
                      style={cpStyles.passwordInput}
                      placeholder="Enter community password"
                      placeholderTextColor={Colors.mutedForeground + "70"}
                      value={password}
                      onChangeText={(t) => { setPassword(t.toUpperCase()); setPasswordError(false); }}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      maxLength={20}
                      returnKeyType="done"
                      onSubmitEditing={handleVerifyPassword}
                    />
                  </View>
                  {passwordError && (
                    <Text style={cpStyles.passwordErrorText}>Incorrect password. Please try again.</Text>
                  )}

                  <Pressable
                    style={[cpStyles.passwordJoinBtn, { backgroundColor: community.accentColor }, passwordJoining && { opacity: 0.7 }]}
                    onPress={handleVerifyPassword}
                    disabled={passwordJoining || password.length === 0}
                  >
                    <LogIn size={18} color="#fff" />
                    <Text style={cpStyles.passwordJoinBtnText}>
                      {passwordJoining ? "Joining..." : `Join ${community.name}`}
                    </Text>
                  </Pressable>
                </KeyboardAvoidingView>
              </Animated.View>
            </Animated.View>
          )}

          {isJoined && (
            <View style={[cpStyles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
              <View style={[cpStyles.joinBtn, { backgroundColor: Colors.muted }]}>
                <CheckCircle size={17} color={Colors.primary} />
                <Text style={[cpStyles.joinBtnText, { color: Colors.primary }]}>Already a Member</Text>
              </View>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const cpStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    flex: 1,
    backgroundColor: Colors.background,
    marginTop: 40,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden" as const,
  },
  hero: {
    height: 300,
    position: "relative" as const,
  },
  headerRow: {
    position: "absolute" as const,
    left: 0,
    right: 0,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 20,
  },
  headerRight: {
    flexDirection: "row" as const,
    gap: 8,
  },
  glassBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  heroBottom: {
    position: "absolute" as const,
    bottom: 20,
    left: 24,
    right: 24,
  },
  verifiedBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    alignSelf: "flex-start" as const,
    marginBottom: 8,
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: "800" as const,
    color: "#fff",
    letterSpacing: 1.4,
    textTransform: "uppercase" as const,
  },
  communityName: {
    fontSize: 30,
    fontWeight: "800" as const,
    color: Colors.foreground,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
  },
  metaText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: Colors.mutedForeground,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.mutedForeground,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 24,
    paddingTop: 22,
  },
  statsRow: {
    flexDirection: "row" as const,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + "60",
    paddingBottom: 20,
    marginBottom: 22,
  },
  statItem: {
    flex: 1,
    alignItems: "center" as const,
  },
  statBorder: {
    borderLeftWidth: 1,
    borderLeftColor: Colors.border + "60",
  },
  statNum: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: Colors.foreground,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "800" as const,
    color: Colors.mutedForeground,
    letterSpacing: 1.2,
  },
  section: {
    marginBottom: 22,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: Colors.mutedForeground,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.foreground + "CC",
    fontWeight: "500" as const,
    fontStyle: "italic" as const,
  },
  activityCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border + "60",
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.foreground,
    marginBottom: 2,
  },
  activitySub: {
    fontSize: 11,
    color: Colors.mutedForeground,
  },
  activityTime: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: Colors.mutedForeground,
  },
  privateSection: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border + "60",
    marginBottom: 20,
  },
  privateHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 8,
  },
  privateTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.foreground,
  },
  privateSub: {
    fontSize: 13,
    color: Colors.mutedForeground,
    lineHeight: 20,
    marginBottom: 14,
  },
  codeInputWrap: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    backgroundColor: Colors.secondary,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  codeInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.foreground,
    letterSpacing: 2,
  },
  codeError: {
    fontSize: 12,
    color: Colors.destructive,
    marginTop: 6,
    fontWeight: "600" as const,
  },
  bottomBar: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border + "40",
    gap: 8,
  },
  joinBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    paddingVertical: 18,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  joinBtnText: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: "#fff",
    letterSpacing: 0.3,
  },
  cancelBtn: {
    alignItems: "center" as const,
    paddingVertical: 10,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.mutedForeground,
  },
  passwordStepOverlay: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end" as const,
  },
  passwordStepSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  passwordStepHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center" as const,
    marginBottom: 20,
  },
  passwordStepHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: 28,
  },
  passwordStepBack: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.secondary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  passwordStepHeaderCenter: {
    flex: 1,
    alignItems: "center" as const,
  },
  passwordStepTitle: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: Colors.foreground,
    letterSpacing: -0.3,
  },
  passwordStepSub: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  passwordCommunityPreview: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 16,
    gap: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border + "50",
  },
  passwordCommunityIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  passwordCommunityLetter: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: "#fff",
  },
  passwordCommunityInfo: {
    flex: 1,
  },
  passwordCommunityName: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.foreground,
    marginBottom: 6,
  },
  passwordPrivateBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    alignSelf: "flex-start" as const,
  },
  passwordPrivateBadgeText: {
    fontSize: 10,
    fontWeight: "700" as const,
    letterSpacing: 0.3,
  },
  passwordInstructionText: {
    fontSize: 13,
    color: Colors.mutedForeground,
    lineHeight: 20,
    marginBottom: 16,
    fontWeight: "500" as const,
  },
  passwordInputWrap: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    backgroundColor: Colors.secondary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: "transparent",
    marginBottom: 10,
  },
  passwordInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.foreground,
    letterSpacing: 2,
  },
  passwordErrorText: {
    fontSize: 12,
    color: Colors.destructive,
    fontWeight: "600" as const,
    marginBottom: 12,
    marginLeft: 4,
  },
  passwordJoinBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    paddingVertical: 18,
    borderRadius: 999,
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  passwordJoinBtnText: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: "#fff",
    letterSpacing: 0.3,
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 14,
  },
  headerLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    flex: 1,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "800" as const,
    color: Colors.foreground,
    letterSpacing: -0.8,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "400" as const,
    color: Colors.mutedForeground,
    marginTop: 1,
    letterSpacing: 0,
    paddingRight: 8,
  },
  headerIcons: {
    flexDirection: "row" as const,
    gap: 8,
    flexShrink: 0,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  bellWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    position: "relative" as const,
  },
  bellBadge: {
    position: "absolute" as const,
    top: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    borderWidth: 1.5,
    borderColor: Colors.secondary,
  },
  compactPillContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    paddingTop: 0,
  },
  compactPill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 7,
    alignSelf: "flex-start" as const,
    backgroundColor: Colors.card,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  compactPillIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  compactPillLetter: {
    fontSize: 11,
    fontWeight: "800" as const,
  },
  compactPillName: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.foreground,
    letterSpacing: -0.2,
    maxWidth: 180,
  },
  compactPillMemberBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
    borderRadius: 99,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  compactPillMemberText: {
    fontSize: 10,
    fontWeight: "700" as const,
  },
  segmentWrapper: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  segmentContainer: {
    flexDirection: "row" as const,
    backgroundColor: Colors.muted,
    borderRadius: 999,
    padding: 4,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center" as const,
    borderRadius: 999,
  },
  segmentTabActive: {
    backgroundColor: Colors.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.mutedForeground,
  },
  segmentTextActive: {
    color: Colors.primary,
    fontWeight: "700" as const,
  },
  newUpdatesBanner: {
    alignItems: "center" as const,
    marginBottom: 2,
  },
  newUpdatesPressable: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  newUpdatesText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.primaryForeground,
    letterSpacing: -0.1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 14,
  },
  prayerPrompt: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    marginBottom: 2,
  },
  promptAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  promptTextWrap: {
    flex: 1,
    gap: 2,
  },
  promptDestination: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  promptText: {
    fontSize: 14,
    color: Colors.mutedForeground,
    fontWeight: "400" as const,
  },
  promptIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  emptyState: {
    alignItems: "center" as const,
    paddingVertical: 52,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.foreground,
    textAlign: "center" as const,
    letterSpacing: -0.2,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: "center" as const,
    lineHeight: 21,
    fontWeight: "400" as const,
  },
  switcherOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end" as const,
  },
  switcherSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 6,
    paddingHorizontal: 20,
  },
  switcherHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center" as const,
    marginTop: 10,
    marginBottom: 4,
  },
  switcherHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    paddingVertical: 16,
  },
  switcherTitle: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: Colors.foreground,
    letterSpacing: -0.4,
  },
  switcherSub: {
    fontSize: 13,
    color: Colors.mutedForeground,
    marginTop: 3,
    fontWeight: "400" as const,
  },
  switcherDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 10,
  },
  switcherItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 16,
  },
  switcherItemActive: {
    backgroundColor: Colors.background,
  },
  switcherItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  switcherItemLetter: {
    fontSize: 18,
    fontWeight: "800" as const,
  },
  switcherItemText: {
    flex: 1,
    gap: 2,
  },
  switcherItemName: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.foreground,
    letterSpacing: -0.2,
  },
  switcherItemMeta: {
    fontSize: 12,
    color: Colors.mutedForeground,
    fontWeight: "500" as const,
  },
  activeCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  switcherFooterHint: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 7,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  switcherFooterText: {
    flex: 1,
    fontSize: 12,
    color: Colors.mutedForeground,
    fontWeight: "400" as const,
    lineHeight: 17,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 10,
  },
  cardAvatarWrapper: {
    width: 44,
    height: 44,
    position: "relative" as const,
  },
  cardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  cardAvatarHeart: {
    position: "absolute" as const,
    bottom: -2,
    right: -4,
    backgroundColor: Colors.background,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  cardAvatarHeartEmoji: {
    fontSize: 12,
    lineHeight: 16,
  },
  cardAuthorBlock: {
    flex: 1,
    gap: 3,
  },
  cardNameRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    flexWrap: "wrap" as const,
    gap: 8,
  },
  cardAuthorName: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: Colors.foreground,
    letterSpacing: -0.2,
  },
  timeSensitiveBadge: {
    backgroundColor: Colors.accent,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.primary + "60",
  },
  timeSensitiveText: {
    fontSize: 9,
    fontWeight: "800" as const,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  cardMetaRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  cardMeta: {
    fontSize: 11,
    color: Colors.mutedForeground,
    fontWeight: "500" as const,
    letterSpacing: 0,
  },
  cardHeaderRight: {
    alignItems: "flex-end" as const,
    gap: 4,
  },
  prayOnBadge: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: "center" as const,
  },
  prayOnLabel: {
    fontSize: 8,
    fontWeight: "700" as const,
    color: Colors.mutedForeground,
    letterSpacing: 0.5,
  },
  prayOnDay: {
    fontSize: 12,
    fontWeight: "800" as const,
    color: Colors.foreground,
    letterSpacing: 0.3,
  },
  moreBtn: {
    padding: 4,
  },
  eventBlock: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  eventLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  calendarIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  eventLabel: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: Colors.primary,
    letterSpacing: 0.6,
  },
  eventDate: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.foreground,
    marginTop: 1,
  },
  eventRight: {
    alignItems: "flex-end" as const,
  },
  statusLabel: {
    fontSize: 9,
    fontWeight: "600" as const,
    color: Colors.mutedForeground,
    letterSpacing: 0.5,
  },
  statusValue: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: Colors.primary,
    marginTop: 1,
  },
  cardContent: {
    fontSize: 14,
    color: Colors.foreground,
    lineHeight: 22,
  },
  cardContentItalic: {
    fontStyle: "italic" as const,
  },
  tagsRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 6,
  },
  tagPill: {
    backgroundColor: Colors.accent,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.accentForeground,
    letterSpacing: 0.1,
  },
  prayingRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  avatarStack: {
    flexDirection: "row" as const,
  },
  stackAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.card,
  },
  prayingCount: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.mutedForeground,
    letterSpacing: 0.4,
  },
  cardActions: {
    flexDirection: "row" as const,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  prayBtn: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 7,
    backgroundColor: Colors.card,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.primary + "40",
  },
  prayBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  prayBtnText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  prayBtnTextActive: {
    color: Colors.primaryForeground,
  },
  encourageBtn: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 7,
    backgroundColor: Colors.muted,
    paddingVertical: 11,
    borderRadius: 999,
  },
  encourageBtnText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.mutedForeground,
  },
  prayingCountBtn: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: Colors.primary,
    paddingVertical: 11,
    borderRadius: 999,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  prayingCountBtnText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.primaryForeground,
  },
  groupActionsRow: {
    gap: 10,
    marginBottom: 4,
  },
  createGroupBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.primary + "40",
    borderStyle: "dashed" as const,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  createGroupInner: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  createGroupPlus: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  createGroupText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  joinGroupBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.primary + "0A",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  joinGroupIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  joinGroupText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  joinModalOverlay: {
    flex: 1,
  },
  joinModalSheet: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
  },
  joinModalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center" as const,
    marginTop: 10,
    marginBottom: 4,
  },
  joinModalBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  joinModalHeaderCenter: {
    flex: 1,
    alignItems: "center" as const,
  },
  joinModalHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingVertical: 20,
  },
  joinModalTitle: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: Colors.foreground,
    letterSpacing: -0.4,
    textAlign: "center" as const,
  },
  joinModalSub: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: 2,
    fontWeight: "400" as const,
    textAlign: "center" as const,
  },
  joinPasswordSection: {
    gap: 8,
    marginBottom: 16,
  },
  joinPasswordInputWrap: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.background,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  joinPasswordInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.foreground,
    letterSpacing: 1.5,
  },
  joinPasswordCheck: {
    marginLeft: 4,
  },
  joinHintText: {
    fontSize: 12,
    color: Colors.mutedForeground,
    fontWeight: "500" as const,
    paddingHorizontal: 4,
  },
  joinGroupPreview: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.primary + "30",
    marginBottom: 16,
  },
  joinPreviewAvatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.primary + "25",
  },
  joinPreviewInfo: {
    flex: 1,
    gap: 3,
  },
  joinPreviewName: {
    fontSize: 17,
    fontWeight: "800" as const,
    color: Colors.foreground,
    letterSpacing: -0.3,
  },
  joinPreviewMeta: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  joinPreviewDesc: {
    fontSize: 12,
    color: Colors.mutedForeground,
    lineHeight: 17,
    marginTop: 2,
  },
  joinConfirmBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 999,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 8,
  },
  joinConfirmBtnDisabled: {
    opacity: 0.7,
  },
  joinConfirmBtnText: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: Colors.primaryForeground,
    letterSpacing: 0.2,
  },
  groupCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  groupAvatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
  },
  groupInfo: {
    flex: 1,
    gap: 3,
  },
  groupName: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.foreground,
  },
  groupMeta: {
    fontSize: 12,
    color: Colors.mutedForeground,
    fontWeight: "500" as const,
  },
  groupRight: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  requestsBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  requestsBadgeText: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: Colors.primaryForeground,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalOverlayKAV: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-start",
  },
  modalSheet: {
    backgroundColor: Colors.card,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    maxHeight: "82%",
    overflow: "hidden",
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginTop: 4,
    marginBottom: 10,
  },
  modalHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: Colors.foreground,
    letterSpacing: -0.3,
  },
  modalSub: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  modalPostPreview: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: Colors.accent,
    borderRadius: 16,
    padding: 12,
  },
  previewAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  previewTextWrap: {
    flex: 1,
    gap: 3,
  },
  previewAuthor: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.foreground,
  },
  previewContent: {
    fontSize: 12,
    color: Colors.mutedForeground,
    lineHeight: 17,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  commentsList: {
    flexGrow: 0,
    maxHeight: 340,
  },
  commentsListContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 14,
  },
  commentItem: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 10,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginTop: 2,
  },
  commentBubble: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  commentBubbleHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.foreground,
  },
  commentTime: {
    fontSize: 10,
    color: Colors.mutedForeground,
  },
  commentText: {
    fontSize: 13,
    color: Colors.foreground,
    lineHeight: 19,
  },
  emptyComments: {
    alignItems: "center" as const,
    paddingVertical: 24,
  },
  emptyCommentsText: {
    fontSize: 14,
    color: Colors.mutedForeground,
    fontWeight: "500" as const,
  },
  inputRow: {
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  inputAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginBottom: 4,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.foreground,
    maxHeight: 90,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.muted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  sendBtnActive: {
    backgroundColor: Colors.primary,
  },
  stopOverlay: {
    flex: 1,
    backgroundColor: "rgba(30,20,10,0.5)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 32,
  },
  stopSheet: {
    backgroundColor: Colors.card,
    borderRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: "center" as const,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 16,
  },
  stopIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 16,
  },
  stopTitle: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: Colors.foreground,
    letterSpacing: -0.5,
    marginBottom: 10,
    textAlign: "center" as const,
  },
  stopBody: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: "center" as const,
    lineHeight: 22,
    marginBottom: 28,
    fontWeight: "400" as const,
  },
  stopNameBold: {
    fontWeight: "700" as const,
    color: Colors.foreground,
  },
  keepBtn: {
    width: "100%",
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingVertical: 15,
    marginBottom: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  keepBtnText: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: Colors.primaryForeground,
    letterSpacing: -0.2,
  },
  stopBtn: {
    width: "100%",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: Colors.background,
    borderRadius: 999,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stopBtnText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.mutedForeground,
    letterSpacing: -0.2,
  },
  updateHeaderBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingBottom: 4,
  },
  updateHeaderText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.primary,
    letterSpacing: -0.1,
  },
  updateTagBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    alignSelf: "flex-start" as const,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  updateTagText: {
    fontSize: 12,
    fontWeight: "700" as const,
  },
  quotedOriginal: {
    flexDirection: "row" as const,
    borderRadius: 14,
    backgroundColor: Colors.background,
    overflow: "hidden" as const,
  },
  quotedBar: {
    width: 3,
    backgroundColor: Colors.primary + "60",
    borderRadius: 2,
  },
  quotedContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  quotedHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  quotedAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  quotedAuthor: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.foreground,
  },
  quotedTime: {
    fontSize: 10,
    color: Colors.mutedForeground,
    fontWeight: "500" as const,
  },
  quotedText: {
    fontSize: 12,
    color: Colors.mutedForeground,
    lineHeight: 18,
    fontStyle: "italic" as const,
  },
  quotedImage: {
    width: "100%" as const,
    height: 140,
    borderRadius: 10,
    marginTop: 8,
  },
  postImageWrap: {
    borderRadius: 16,
    overflow: "hidden" as const,
    marginTop: 10,
  },
  postImage: {
    width: "100%" as const,
    height: 220,
    borderRadius: 16,
  },
  repostBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 5,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.primary + "30",
    backgroundColor: Colors.accent,
  },
  repostBtnText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  repostModalOverlay: {
    flex: 1,
    justifyContent: "flex-end" as const,
  },
  repostModalSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 6,
    paddingHorizontal: 20,
    maxHeight: "90%",
  },
  repostModalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center" as const,
    marginTop: 10,
    marginBottom: 4,
  },
  repostModalHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    paddingVertical: 16,
  },
  repostModalTitle: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: Colors.foreground,
    letterSpacing: -0.4,
  },
  repostModalSub: {
    fontSize: 13,
    color: Colors.mutedForeground,
    marginTop: 3,
    fontWeight: "400" as const,
  },
  repostQuotedOriginal: {
    flexDirection: "row" as const,
    borderRadius: 18,
    backgroundColor: Colors.background,
    overflow: "hidden" as const,
    marginBottom: 16,
  },
  repostQuotedBar: {
    width: 4,
    backgroundColor: Colors.primary + "50",
  },
  repostQuotedContent: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  repostQuotedHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  repostQuotedAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  repostQuotedAuthor: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.foreground,
  },
  repostQuotedTime: {
    fontSize: 11,
    color: Colors.mutedForeground,
    fontWeight: "500" as const,
    marginTop: 1,
  },
  repostQuotedText: {
    fontSize: 13,
    color: Colors.mutedForeground,
    lineHeight: 20,
    fontStyle: "italic" as const,
  },
  repostQuotedImage: {
    width: "100%" as const,
    height: 160,
    borderRadius: 12,
    marginTop: 10,
  },
  repostInputWrap: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 16,
    minHeight: 120,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
    gap: 10,
  },
  repostImagePreview: {
    position: "relative" as const,
  },
  repostImagePickerRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  repostImagePickerHint: {
    fontSize: 13,
    color: Colors.mutedForeground,
    fontWeight: "500" as const,
  },
  repostInput: {
    fontSize: 15,
    color: Colors.foreground,
    fontWeight: "500" as const,
    minHeight: 90,
  },
  repostTagSection: {
    gap: 10,
    marginBottom: 16,
  },
  repostTagLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.mutedForeground,
  },
  repostTagRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
  },
  repostTagChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    backgroundColor: Colors.secondary,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  repostTagChipSelected: {
    borderColor: Colors.primary + "60",
    backgroundColor: Colors.accent,
  },
  repostTagEmoji: {
    fontSize: 14,
  },
  repostTagText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.secondaryForeground,
  },
  repostTagTextSelected: {
    color: Colors.primary,
    fontWeight: "700" as const,
  },
  repostFooter: {
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  repostSubmitBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  repostSubmitBtnDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  repostSubmitText: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: Colors.primaryForeground,
    letterSpacing: 0.2,
  },
  actionsSheet: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 6,
    paddingHorizontal: 20,
  },
  reportHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    marginBottom: 4,
  },
  reportBackBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.muted,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  reportHeaderText: {
    flex: 1,
    gap: 1,
  },
  reportSuccessWrap: {
    alignItems: "center" as const,
    paddingVertical: 20,
    paddingHorizontal: 8,
    gap: 10,
  },
  reportSuccessIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.green + "18",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 4,
  },
  reportSuccessTitle: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: Colors.foreground,
    letterSpacing: -0.3,
  },
  reportSuccessSub: {
    fontSize: 13,
    color: Colors.mutedForeground,
    textAlign: "center" as const,
    lineHeight: 20,
    fontWeight: "400" as const,
    marginBottom: 8,
  },
  actionsHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center" as const,
    marginTop: 10,
    marginBottom: 16,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: Colors.foreground,
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  actionItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  actionTextWrap: {
    flex: 1,
    gap: 2,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.foreground,
  },
  actionSub: {
    fontSize: 12,
    color: Colors.mutedForeground,
    fontWeight: "500" as const,
  },
  actionCancelBtn: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 16,
    marginTop: 8,
    backgroundColor: Colors.muted,
    borderRadius: 999,
  },
  actionCancelText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.mutedForeground,
  },
  noCommunityWrap: {
    alignItems: "center" as const,
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 14,
  },
  noCommunityIconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 4,
    borderWidth: 1.5,
    borderColor: Colors.primary + "20",
  },
  noCommunityIconInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary + "15",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  noCommunityTitle: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: Colors.foreground,
    letterSpacing: -0.4,
    textAlign: "center" as const,
  },
  noCommunitySubtitle: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: "center" as const,
    lineHeight: 22,
    fontWeight: "400" as const,
    maxWidth: 280,
  },
  noCommunityBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 15,
    borderRadius: 999,
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  noCommunityBtnText: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: Colors.primaryForeground,
    letterSpacing: 0.1,
  },
  inlineBrowseHeader: {
    alignItems: "center" as const,
    paddingVertical: 28,
    paddingHorizontal: 16,
    gap: 10,
  },
  inlineBrowseIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 4,
    borderWidth: 1.5,
    borderColor: Colors.primary + "20",
  },
  inlineBrowseTitle: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: Colors.foreground,
    letterSpacing: -0.5,
    textAlign: "center" as const,
  },
  inlineBrowseSub: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: "center" as const,
    lineHeight: 21,
    fontWeight: "400" as const,
    maxWidth: 290,
  },
  browseCommunityIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexShrink: 0,
  },
  browseCommunityLetter: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: "#fff",
  },
  browseCommunityJoinBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.primary + "40",
    backgroundColor: Colors.primary + "12",
    flexShrink: 0,
  },
  browseCommunityJoinText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  browseSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 6,
    paddingHorizontal: 20,
    maxHeight: "88%",
  },
  browseFullScreen: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
  },
  browseFullHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    paddingVertical: 16,
  },
  joinAnotherRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 4,
    marginBottom: 4,
  },
  joinAnotherIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  joinAnotherText: {
    flex: 1,
    gap: 2,
  },
  joinAnotherLabel: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.primary,
    letterSpacing: -0.2,
  },
  joinAnotherSub: {
    fontSize: 12,
    color: Colors.mutedForeground,
    fontWeight: "500" as const,
  },
  browseSearchWrap: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 14,
  },
  browseSearchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.foreground,
    fontWeight: "500" as const,
  },
  browseScrollArea: {
    flex: 1,
  },
  browseScrollContent: {
    paddingBottom: 32,
    gap: 10,
  },
  browseCommunityCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
    backgroundColor: Colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  browseCommunityInfo: {
    flex: 1,
    gap: 2,
  },
  browseCommunityDesc: {
    fontSize: 11,
    color: Colors.mutedForeground,
    fontWeight: "400" as const,
    lineHeight: 15,
  },
  browseMemberRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    marginTop: 1,
  },
  browseNoResults: {
    alignItems: "center" as const,
    paddingVertical: 36,
    gap: 10,
  },
  browseNoResultsText: {
    fontSize: 13,
    color: Colors.mutedForeground,
    fontWeight: "500" as const,
    textAlign: "center" as const,
  },
  browsePrivateSection: {
    gap: 12,
    marginTop: 4,
    marginBottom: 4,
  },
  browsePrivateDivider: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  browsePrivateLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  browsePrivateDividerText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.mutedForeground,
    letterSpacing: 0.2,
  },
  browsePrivateToggle: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    backgroundColor: Colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  browsePrivateToggleLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    flex: 1,
  },
  browsePrivateLockIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  browsePrivateToggleTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.foreground,
    letterSpacing: -0.1,
  },
  browsePrivateToggleSub: {
    fontSize: 11,
    color: Colors.mutedForeground,
    fontWeight: "400" as const,
    marginTop: 1,
  },
  browsePrivateContent: {
    gap: 10,
    paddingTop: 4,
    overflow: "hidden" as const,
  },
  browsePrivateInputWrap: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  browsePrivateInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.foreground,
    letterSpacing: 1.2,
  },
  browsePrivateHint: {
    fontSize: 11,
    color: Colors.mutedForeground,
    fontWeight: "500" as const,
    paddingHorizontal: 4,
  },
  browsePrivatePreview: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    backgroundColor: Colors.accent,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.primary + "20",
    marginTop: 4,
    marginBottom: 10,
  },
  browsePrivatePreviewIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexShrink: 0,
  },
  browsePrivatePreviewName: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: Colors.foreground,
    letterSpacing: -0.2,
  },
  browsePrivatePreviewDesc: {
    fontSize: 11,
    color: Colors.mutedForeground,
    fontWeight: "500" as const,
    marginTop: 2,
  },
  browsePrivateBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    flexShrink: 0,
  },
  browsePrivateBadgeText: {
    fontSize: 10,
    fontWeight: "700" as const,
  },
  browsePrivateJoinBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingVertical: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  browsePrivateJoinText: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: Colors.primaryForeground,
    letterSpacing: 0.1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.muted,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  puOverlay: {
    flex: 1,
    justifyContent: "flex-end" as const,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  puSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 20,
    maxHeight: "75%" as const,
  },
  puDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center" as const,
    marginTop: 8,
    marginBottom: 4,
  },
  puHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  puHeaderLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  puTitle: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: Colors.foreground,
    letterSpacing: -0.3,
  },
  puCountBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  puCountBadgeText: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: Colors.primaryForeground,
  },
  puCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.secondary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  puSubtitle: {
    fontSize: 13,
    color: Colors.mutedForeground,
    fontWeight: "500" as const,
    paddingHorizontal: 22,
    marginBottom: 16,
  },
  puList: {
    paddingHorizontal: 22,
    gap: 4,
    paddingBottom: 8,
  },
  puRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + "40",
    gap: 14,
  },
  puAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: Colors.primary + "30",
  },
  puName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.foreground,
  },
  puPrayingBadge: {
    backgroundColor: Colors.primary + "18",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.primary + "30",
  },
  puPrayingBadgeText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  puExtraRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: 14,
    gap: 14,
  },
  puExtraCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  puExtraText: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: Colors.accentForeground,
  },
  puExtraLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.mutedForeground,
  },
  puEmpty: {
    alignItems: "center" as const,
    paddingVertical: 48,
    gap: 8,
  },
  puEmptyEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  puEmptyText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.foreground,
  },
  puEmptySubText: {
    fontSize: 13,
    color: Colors.mutedForeground,
    fontWeight: "500" as const,
  },
  shareOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.48)",
    justifyContent: "flex-end" as const,
  },
  shareSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 6,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 18,
  },
  shareHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center" as const,
    marginTop: 10,
    marginBottom: 6,
  },
  shareHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingVertical: 14,
    gap: 12,
  },
  shareHeaderLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    flex: 1,
  },
  shareHandsIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: Colors.primary + "25",
    flexShrink: 0,
  },
  shareHandsEmoji: {
    fontSize: 22,
    lineHeight: 28,
  },
  shareHeaderText: {
    flex: 1,
    gap: 2,
  },
  shareTitle: {
    fontSize: 17,
    fontWeight: "800" as const,
    color: Colors.foreground,
    letterSpacing: -0.3,
  },
  shareSubtitle: {
    fontSize: 12,
    color: Colors.mutedForeground,
    fontWeight: "400" as const,
    lineHeight: 17,
  },
  sharePreviewCard: {
    backgroundColor: Colors.background,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
    marginBottom: 18,
  },
  sharePreviewTop: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  sharePreviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.primary + "30",
  },
  sharePreviewAuthorBlock: {
    flex: 1,
    gap: 1,
  },
  sharePreviewAuthorName: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.foreground,
  },
  sharePreviewTime: {
    fontSize: 10,
    color: Colors.mutedForeground,
    fontWeight: "500" as const,
  },
  sharePreviewTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    flexShrink: 0,
  },
  sharePreviewTagText: {
    fontSize: 11,
    fontWeight: "700" as const,
  },
  sharePreviewContent: {
    fontSize: 13,
    color: Colors.foreground,
    lineHeight: 20,
    fontStyle: "italic" as const,
  },
  shareSectionLabel: {
    marginBottom: 10,
  },
  shareSectionText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.mutedForeground,
    letterSpacing: 1.2,
  },
  shareOptionsRow: {
    flexDirection: "row" as const,
    gap: 12,
    marginBottom: 4,
  },
  shareOptionBtn: {
    flex: 1,
    alignItems: "center" as const,
    gap: 8,
  },
  shareOptionIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  shareOptionEmoji: {
    fontSize: 24,
    lineHeight: 30,
  },
  shareOptionLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.foreground,
    textAlign: "center" as const,
  },
  shareInternalOptions: {
    backgroundColor: Colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden" as const,
    marginBottom: 16,
  },
  shareInternalRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  shareInternalIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexShrink: 0,
  },
  shareInternalText: {
    flex: 1,
    gap: 2,
  },
  shareInternalLabel: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.foreground,
  },
  shareInternalSub: {
    fontSize: 11,
    color: Colors.mutedForeground,
    fontWeight: "400" as const,
    lineHeight: 16,
  },
  sharePrivacyNote: {
    alignItems: "center" as const,
    paddingBottom: 4,
  },
  sharePrivacyText: {
    fontSize: 11,
    color: Colors.mutedForeground,
    fontWeight: "400" as const,
    textAlign: "center" as const,
    lineHeight: 16,
  },
  createCommunityHeaderBtn: {
    backgroundColor: Colors.secondary,
  },
  createCommunityRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
    backgroundColor: "#FFF8ED",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#D4A01760",
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 4,
  },
  createCommunityRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFF0C0",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: "#D4A01740",
  },
  createCommunityRowText: {
    flex: 1,
    gap: 2,
  },
  createCommunityRowTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#7A5400",
    letterSpacing: -0.1,
  },
  createCommunityRowSub: {
    fontSize: 11,
    color: "#B5820A",
    fontWeight: "500" as const,
  },
  createCommunityRowBadge: {
    backgroundColor: "#D4A017",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 0,
  },
  createCommunityRowBadgeText: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: "#fff",
    letterSpacing: 0.5,
  },
  paywallOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end" as const,
  },
  paywallSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 6,
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 20,
  },
  paywallHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center" as const,
    marginTop: 10,
    marginBottom: 6,
  },
  paywallClose: {
    position: "absolute" as const,
    top: 18,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.muted,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    zIndex: 10,
  },
  paywallCrownWrap: {
    alignSelf: "center" as const,
    marginTop: 12,
    marginBottom: 20,
  },
  paywallProBadge: {
    width: 100,
    height: 100,
  },
  paywallUpgradeBtnIcon: {
    width: 22,
    height: 22,
  },
  paywallTitle: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: Colors.foreground,
    letterSpacing: -0.6,
    textAlign: "center" as const,
    marginBottom: 10,
  },
  paywallSubtitle: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: "center" as const,
    lineHeight: 22,
    fontWeight: "400" as const,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  paywallFeatures: {
    gap: 10,
    marginBottom: 28,
  },
  paywallFeatureRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
    backgroundColor: Colors.background,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  paywallFeatureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexShrink: 0,
  },
  paywallFeatureEmoji: {
    fontSize: 20,
    lineHeight: 26,
  },
  paywallFeatureTextWrap: {
    flex: 1,
    gap: 2,
  },
  paywallFeatureTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.foreground,
    letterSpacing: -0.1,
  },
  paywallFeatureDesc: {
    fontSize: 12,
    color: Colors.mutedForeground,
    fontWeight: "400" as const,
  },
  paywallUpgradeBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingVertical: 17,
    marginBottom: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  paywallUpgradeBtnText: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: "#fff",
    letterSpacing: 0.2,
  },
  paywallMaybeLater: {
    alignItems: "center" as const,
    paddingVertical: 10,
  },
  paywallMaybeLaterText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.mutedForeground,
  },
  officialBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: "#FFF4E0",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "#D4A01730",
  },
  officialBadgeText: {
    fontSize: 9,
    fontWeight: "800" as const,
    color: "#B5820A",
    letterSpacing: 0.4,
  },
  officialBadgeLight: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 99,
  },
  officialBadgeLightText: {
    fontSize: 9,
    fontWeight: "800" as const,
    color: "#FFF4E0",
    letterSpacing: 0.4,
  },
  privateBadgeSmall: {
    width: 18,
    height: 18,
    borderRadius: 99,
    backgroundColor: Colors.muted,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  communityNameRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    flexWrap: "wrap" as const,
  },
  createTypeHeader: {
    marginTop: 12,
    marginBottom: 4,
    alignItems: "center" as const,
  },
  createTypeCard: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    gap: 12,
  },
  createTypeCardPro: {
    borderColor: "#D4A01750",
    backgroundColor: "#FFFBF0",
  },
  createTypeCardTop: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  createTypeIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexShrink: 0,
  },
  createTypeCardInfo: {
    flex: 1,
    gap: 3,
  },
  createTypeCardTitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    flexWrap: "wrap" as const,
  },
  createTypeCardName: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: Colors.foreground,
    letterSpacing: -0.2,
  },
  createTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  createTypeBadgeText: {
    fontSize: 9,
    fontWeight: "800" as const,
    letterSpacing: 0.5,
  },
  createTypeCardSub: {
    fontSize: 12,
    color: Colors.mutedForeground,
    fontWeight: "400" as const,
  },
  createTypeFeatureList: {
    gap: 6,
    paddingLeft: 2,
  },
  createTypeFeatureRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  createTypeFeatureText: {
    fontSize: 12,
    color: Colors.secondaryForeground,
    fontWeight: "500" as const,
  },
  createTypeFooter: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: 4,
    paddingBottom: 8,
    marginTop: 4,
  },
  createTypeFooterText: {
    flex: 1,
    fontSize: 11,
    color: Colors.mutedForeground,
    fontWeight: "400" as const,
    lineHeight: 16,
  },
  createBackBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    marginBottom: 16,
    marginTop: 4,
    alignSelf: "flex-start" as const,
  },
  createBackText: {
    fontSize: 14,
    color: Colors.mutedForeground,
    fontWeight: "600" as const,
  },
  createInputSection: {
    gap: 8,
    marginBottom: 14,
  },
  createInputLabel: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: Colors.mutedForeground,
    letterSpacing: 1.2,
    marginLeft: 4,
  },
  createInput: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.foreground,
    fontWeight: "500" as const,
  },
  createInputMulti: {
    minHeight: 90,
    textAlignVertical: "top" as const,
  },
  prayingForPromptWrap: {
    position: "absolute" as const,
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 999,
    pointerEvents: "box-none" as const,
  },
  prayingForPromptCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 10,
    borderWidth: 1,
    borderColor: Colors.primary + "22",
    gap: 12,
  },
  prayingForPromptLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    flex: 1,
  },
  prayingForPromptText: {
    flex: 1,
  },
  prayingForPromptTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.foreground,
    marginBottom: 2,
  },
  prayingForPromptSub: {
    fontSize: 12,
    color: Colors.mutedForeground,
    fontWeight: "500" as const,
  },
  prayingForPromptActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  prayingForPromptAdd: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  prayingForPromptAddText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.primaryForeground,
  },
  prayingForPromptDismiss: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.muted,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  updateTagBadgeAnswered: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#34C759" + "40",
    shadowColor: "#34C759",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  updateTagTextAnswered: {
    fontSize: 13,
    fontWeight: "800" as const,
    letterSpacing: 0.2,
  },
  answeredEmoji: {
    fontSize: 14,
    marginLeft: 2,
  },
  myRequestsBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.primary + "0E",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.primary + "25",
    gap: 12,
  },
  myRequestsBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary + "18",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexShrink: 0,
  },
  myRequestsBannerText: {
    flex: 1,
    gap: 2,
  },
  myRequestsBannerTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.foreground,
  },
  myRequestsBannerSub: {
    fontSize: 12,
    color: Colors.mutedForeground,
    fontWeight: "500" as const,
  },
});
