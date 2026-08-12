const STORAGE_KEY = 'clipvoice_url_history';
const MAX_HISTORY_ITEMS = 10;

export interface UrlHistoryItem {
  url: string;
  timestamp: number;
}

export function getStoredUrlHistory(): UrlHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) =>
        typeof item === 'string' ? { url: item, timestamp: Date.now() } : item
      );
    }
    return [];
  } catch {
    return [];
  }
}

export function addUrlToHistory(url: string): UrlHistoryItem[] {
  const cleanUrl = url.trim();
  if (!cleanUrl) return getStoredUrlHistory();

  const current = getStoredUrlHistory();
  // Filter out duplicate url if exists
  const filtered = current.filter((item) => item.url !== cleanUrl);

  const updated: UrlHistoryItem[] = [
    { url: cleanUrl, timestamp: Date.now() },
    ...filtered,
  ].slice(0, MAX_HISTORY_ITEMS);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }

  return updated;
}

export function removeUrlFromHistory(url: string): UrlHistoryItem[] {
  const current = getStoredUrlHistory();
  const updated = current.filter((item) => item.url !== url);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore
  }

  return updated;
}

export function clearUrlHistory(): UrlHistoryItem[] {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
  return [];
}
