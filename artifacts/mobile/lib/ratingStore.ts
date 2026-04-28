export type RatingTriggerEvent = "answered_prayer" | "app_open" | "community_engagement";

type TriggerListener = (event: RatingTriggerEvent) => void;

let _listener: TriggerListener | null = null;
const _queue: RatingTriggerEvent[] = [];

export const ratingStore = {
  register(fn: TriggerListener) {
    _listener = fn;
    while (_queue.length > 0) {
      const event = _queue.shift();
      if (event) fn(event);
    }
  },
  unregister() {
    _listener = null;
  },
  trigger(event: RatingTriggerEvent) {
    if (_listener) {
      _listener(event);
    } else {
      _queue.push(event);
    }
  },
};
