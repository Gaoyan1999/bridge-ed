/** Slot values match `BOOK_SLOT_VALUES` in BridgeModals (excluding `__none__`). */
const SLOT_LABELS: Record<string, string> = {
  '1600': '16:00–16:20',
  '1730': '17:30–17:50',
  '1800': '18:00–18:20',
};

export function bookingSlotLabel(slot: string): string {
  const s = slot.trim();
  return SLOT_LABELS[s] ?? s;
}
