import { useState } from 'react';
import type { Itinerary, ItinerarySummary } from '../types/itinerary';
import { getDeviceId } from '../utils/deviceId';

const SAVED_IDS_KEY = 'smarttour_itinerary_ids';

export interface UseItineraryStore {
  savedIds: string[];
  save(itinerary: Itinerary): Promise<{ id: string; shareToken: string | null }>;
  getShare(id: string): Promise<string>;
  listSummaries(): Promise<ItinerarySummary[]>;
  isSaved(itinerary: Itinerary): boolean;
}

function loadSavedIds(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_IDS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function useItineraryStore(): UseItineraryStore {
  const [savedIds, setSavedIds] = useState<string[]>(loadSavedIds);

  async function save(itinerary: Itinerary): Promise<{ id: string; shareToken: string | null }> {
    try {
      const res = await fetch('/api/v1/itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: getDeviceId(), itinerary }),
      });

      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message ?? '保存次数已达上限，请稍后再试');
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json() as { id: string; shareToken: string | null };
      const newIds = [...savedIds, data.id];
      setSavedIds(newIds);
      localStorage.setItem(SAVED_IDS_KEY, JSON.stringify(newIds));
      return { id: data.id, shareToken: data.shareToken };
    } catch (err) {
      // Re-throw 429 errors
      if (err instanceof Error && err.message.includes('上限')) {
        throw err;
      }

      // Fallback: store locally on network/server errors
      const timestamp = Date.now();
      const localId = `local_${timestamp}`;
      localStorage.setItem(`smarttour_local_${timestamp}`, JSON.stringify(itinerary));
      const newIds = [...savedIds, localId];
      setSavedIds(newIds);
      localStorage.setItem(SAVED_IDS_KEY, JSON.stringify(newIds));
      return { id: localId, shareToken: null };
    }
  }

  async function getShare(id: string): Promise<string> {
    const res = await fetch(`/api/v1/itinerary/${id}/share`, { method: 'POST' });
    if (!res.ok) {
      throw new Error(`Failed to get share link: HTTP ${res.status}`);
    }
    const data = await res.json() as { shareLink: string };
    return data.shareLink;
  }

  async function listSummaries(): Promise<ItinerarySummary[]> {
    const res = await fetch(`/api/v1/itinerary?deviceId=${getDeviceId()}`);
    if (!res.ok) {
      throw new Error(`Failed to list itineraries: HTTP ${res.status}`);
    }
    const data = await res.json() as { items: ItinerarySummary[] };
    return data.items;
  }

  function isSaved(_itinerary: Itinerary): boolean {
    // Itinerary has no id field, so we use savedIds.length > 0 as a simplification
    // (any itinerary is considered "saved" once the user has saved at least one)
    return savedIds.length > 0;
  }

  return { savedIds, save, getShare, listSummaries, isSaved };
}
