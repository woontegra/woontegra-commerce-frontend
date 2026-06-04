import type { MenuItemPayload } from '../services/navigationMenu.service';

export function newMenuItemId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function normalizeParentId(parentId: string | null | undefined): string | null {
  const v = parentId?.trim();
  return v ? v : null;
}

export function isMenuDescendant(
  items: MenuItemPayload[],
  ancestorId: string,
  maybeDescendantId: string,
): boolean {
  const children = items.filter(x => normalizeParentId(x.parentId) === ancestorId);
  for (const child of children) {
    if (!child.id) continue;
    if (child.id === maybeDescendantId) return true;
    if (isMenuDescendant(items, child.id, maybeDescendantId)) return true;
  }
  return false;
}

export function getMenuSiblings(
  items: MenuItemPayload[],
  itemId: string,
): MenuItemPayload[] {
  const item = items.find(x => x.id === itemId);
  if (!item) return [];
  const parent = normalizeParentId(item.parentId);
  return items
    .filter(x => normalizeParentId(x.parentId) === parent)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export type MenuDisplayRow = {
  item: MenuItemPayload;
  index: number;
  depth: number;
};

export function buildMenuDisplayRows(items: MenuItemPayload[]): MenuDisplayRow[] {
  const byParent = new Map<string | null, Array<{ item: MenuItemPayload; index: number }>>();
  items.forEach((item, index) => {
    const pid = normalizeParentId(item.parentId);
    if (!byParent.has(pid)) byParent.set(pid, []);
    byParent.get(pid)!.push({ item, index });
  });
  for (const group of byParent.values()) {
    group.sort((a, b) => (a.item.sortOrder ?? 0) - (b.item.sortOrder ?? 0));
  }

  const rows: MenuDisplayRow[] = [];
  const walk = (parentId: string | null, depth: number) => {
    const group = byParent.get(parentId) ?? [];
    for (const { item, index } of group) {
      rows.push({ item, index, depth });
      if (item.id) walk(item.id, depth + 1);
    }
  };
  walk(null, 0);
  return rows;
}
