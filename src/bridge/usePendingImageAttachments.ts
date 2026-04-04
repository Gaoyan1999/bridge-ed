import { useCallback, useState } from 'react';

export const MAX_MESSAGE_IMAGES = 4;
export const MAX_MESSAGE_IMAGE_BYTES = 5 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error('read failed'));
    r.readAsDataURL(file);
  });
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export type PendingImage = { id: string; dataUrl: string; name: string };

type RejectReason = 'max' | 'size' | 'type';

export function usePendingImageAttachments(options?: {
  maxCount?: number;
  maxBytes?: number;
  onReject?: (reason: RejectReason) => void;
}) {
  const maxCount = options?.maxCount ?? MAX_MESSAGE_IMAGES;
  const maxBytes = options?.maxBytes ?? MAX_MESSAGE_IMAGE_BYTES;
  const onReject = options?.onReject;

  const [pending, setPending] = useState<PendingImage[]>([]);

  const addFromFileList = useCallback(
    async (list: FileList | null) => {
      if (!list?.length) return;
      const accepted: PendingImage[] = [];
      for (const file of Array.from(list)) {
        if (!file.type.startsWith('image/')) {
          onReject?.('type');
          continue;
        }
        if (file.size > maxBytes) {
          onReject?.('size');
          continue;
        }
        const dataUrl = await readFileAsDataUrl(file);
        accepted.push({ id: newId(), dataUrl, name: file.name });
      }
      if (!accepted.length) return;
      setPending((prev) => {
        const room = maxCount - prev.length;
        if (room <= 0) {
          onReject?.('max');
          return prev;
        }
        const slice = accepted.slice(0, room);
        if (accepted.length > room) onReject?.('max');
        return [...prev, ...slice];
      });
    },
    [maxBytes, maxCount, onReject],
  );

  const remove = useCallback((id: string) => {
    setPending((p) => p.filter((x) => x.id !== id));
  }, []);

  const clear = useCallback(() => {
    setPending([]);
  }, []);

  return { pending, addFromFileList, remove, clear };
}
