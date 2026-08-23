type PostShape = Record<string, unknown>;
type PostListener = (post: PostShape) => void;

let _listener: PostListener | null = null;
const _queue: PostShape[] = [];
const _posts: PostShape[] = [];

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
    _posts.unshift(post);
    if (_listener) {
      _listener(post);
    } else {
      _queue.push(post);
    }
  },
  getPosts() {
    return [..._posts];
  },
};

// Community options are populated from the user's real owned communities at runtime.
// This array is intentionally empty — do not add fake communities here.
export const FEED_COMMUNITIES: Array<{ id: string; name: string; letter: string; color: string }> = [];

export type FeedCommunityId = string;
