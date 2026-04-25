const prayedIds = new Set<string>();
const journaledIds = new Set<string>();

export function markAsPrayed(id: string) {
  prayedIds.add(id);
}

export function checkHasPrayed(id: string) {
  return prayedIds.has(id);
}

export function markAsJournaled(id: string) {
  journaledIds.add(id);
}

export function checkIsJournaled(id: string) {
  return journaledIds.has(id);
}
