import type { DuplicateMode } from '../components/xml/XmlImportSavedPanel';

export interface RecentXmlSession {
  id: string;
  label: string;
  url?: string;
  filename?: string;
  sourceId?: string;
  mapping: Record<string, string>;
  duplicateMode: DuplicateMode;
  skipZeroStock: boolean;
  savedAt: string;
}

const STORAGE_KEY = 'woontegra_xml_recent_sessions';
const MAX_ITEMS   = 8;

export function loadRecentXmlSessions(): RecentXmlSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentXmlSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecentXmlSession(entry: Omit<RecentXmlSession, 'id' | 'savedAt'>): void {
  const sessions = loadRecentXmlSessions();
  const id = entry.sourceId ?? entry.url ?? entry.filename ?? entry.label;
  const next: RecentXmlSession = {
    ...entry,
    id: String(id),
    savedAt: new Date().toISOString(),
  };
  const filtered = sessions.filter(
    s => s.id !== next.id && s.sourceId !== next.sourceId && (next.url ? s.url !== next.url : true),
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify([next, ...filtered].slice(0, MAX_ITEMS)));
}
