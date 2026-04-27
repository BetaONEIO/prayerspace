type PostShape = Record<string, unknown>;
type PostListener = (post: PostShape) => void;

let _listener: PostListener | null = null;
const _queue: PostShape[] = [];

export const feedStore = {
  register(fn: PostListener) {
    _listener = fn;
    while (_queue.length > 0) {
      const post = _queue.shift();
      if (post) fn(post);
    }
  },
  unregister() {
    _listener = null;
  },
  addPost(post: PostShape) {
    if (_listener) {
      _listener(post);
    } else {
      _queue.push(post);
    }
  },
};

export const FEED_COMMUNITIES = [
  { id: "castle-church", name: "Castle Church", letter: "C", color: "#C4521A" },
  { id: "hope-church", name: "Hope Church", letter: "H", color: "#2E6DB5" },
  { id: "city-light", name: "City Light Church", letter: "L", color: "#B5820A" },
  { id: "young-adults", name: "Young Adults", letter: "Y", color: "#6B3FA0" },
] as const;

export type FeedCommunityId = typeof FEED_COMMUNITIES[number]["id"];
