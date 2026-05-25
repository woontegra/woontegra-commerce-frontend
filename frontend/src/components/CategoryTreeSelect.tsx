import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { FlatCategoryNode } from '../services/category.service';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  categories:  FlatCategoryNode[];
  value:       string;             // selected category id
  onChange:    (id: string) => void;
  placeholder?: string;
  disabled?:   boolean;
  allowClear?: boolean;
  className?:  string;
}

// ─── CategoryTreeSelect ───────────────────────────────────────────────────────

export default function CategoryTreeSelect({
  categories,
  value,
  onChange,
  placeholder = '— Kategori seçin —',
  disabled    = false,
  allowClear  = true,
  className   = '',
}: Props) {
  const [open,        setOpen]        = useState(false);
  const [search,      setSearch]      = useState('');
  const [collapsed,   setCollapsed]   = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef    = useRef<HTMLInputElement>(null);

  const selected = categories.find(c => c.id === value);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search when opened
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  // Filtered + visible nodes
  const visible = useMemo(() => {
    if (search.trim()) {
      return categories.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.path.toLowerCase().includes(search.toLowerCase())
      );
    }
    // Respect collapsed state
    return categories.filter(c => {
      if (!c.parentId) return true;
      // Check if any ancestor is collapsed
      let pid: string | null = c.parentId;
      while (pid) {
        if (collapsed.has(pid)) return false;
        const par = categories.find(x => x.id === pid);
        pid = par?.parentId ?? null;
      }
      return true;
    });
  }, [categories, search, collapsed]);

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const select = (id: string) => {
    onChange(id);
    setOpen(false);
    setSearch('');
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* ── Trigger ──────────────────────────────────────────────────────── */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`wn-input w-full text-left flex items-center justify-between gap-2 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${open ? 'border-indigo-400 ring-2 ring-indigo-500/10' : ''}`}
      >
        <span className={`flex-1 truncate ${selected ? 'text-slate-800' : 'text-slate-400'}`}>
          {selected ? (
            <span className="flex items-center gap-1.5">
              {selected.icon && <span className="text-sm">{selected.icon}</span>}
              {/* Show breadcrumb-style path */}
              {selected.depth > 0 && (
                <span className="text-slate-400 text-xs">
                  {selected.path.split('/').slice(0, -1).join(' › ')}&nbsp;›&nbsp;
                </span>
              )}
              <span className="font-medium">{selected.name}</span>
            </span>
          ) : placeholder}
        </span>
        <span className="flex items-center gap-1 flex-shrink-0">
          {allowClear && value && (
            <span
              onClick={clear}
              className="w-4 h-4 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </span>
          )}
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
          </svg>
        </span>
      </button>

      {/* ── Dropdown ─────────────────────────────────────────────────────── */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">

          {/* Search */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Kategori ara..."
                className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 rounded-lg border border-slate-100 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10 focus:outline-none placeholder-slate-400"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="max-h-64 overflow-y-auto py-1">
            {/* Clear option */}
            {allowClear && (
              <button type="button" onClick={() => select('')}
                className={`w-full text-left px-3 py-2 text-sm text-slate-400 hover:bg-slate-50 transition-colors italic ${!value ? 'bg-indigo-50 text-indigo-600 font-medium' : ''}`}>
                — Kategori seçilmedi —
              </button>
            )}

            {visible.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-slate-400">"{search}" için kategori bulunamadı</p>
              </div>
            ) : (
              visible.map(cat => {
                const isSelected    = cat.id === value;
                const hasChildren   = cat.hasChildren;
                const isCollapsed   = collapsed.has(cat.id);
                const indent        = search ? 0 : cat.depth;

                return (
                  <div
                    key={cat.id}
                    className={`flex items-center group transition-colors cursor-pointer
                      ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}
                      ${!cat.isActive ? 'opacity-50' : ''}
                    `}
                    style={{ paddingLeft: `${8 + indent * 20}px`, paddingRight: '8px' }}
                    onClick={() => select(cat.id)}
                  >
                    {/* Collapse toggle */}
                    <span className="w-5 h-8 flex items-center justify-center flex-shrink-0">
                      {hasChildren && !search ? (
                        <button type="button" onClick={e => toggleCollapse(cat.id, e)}
                          className="w-4 h-4 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors">
                          <svg className={`w-3 h-3 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
                          </svg>
                        </button>
                      ) : indent > 0 ? (
                        <span className="w-3 h-px bg-slate-200 block"/>
                      ) : null}
                    </span>

                    {/* Icon */}
                    {cat.icon ? (
                      <span className="mr-2 text-sm">{cat.icon}</span>
                    ) : (
                      <span className={`mr-2 w-2 h-2 rounded-full flex-shrink-0 ${
                        cat.level === 0 ? 'bg-indigo-300' :
                        cat.level === 1 ? 'bg-blue-200'   :
                                          'bg-slate-200'
                      }`}/>
                    )}

                    {/* Name */}
                    <span className={`flex-1 py-2 text-sm truncate ${isSelected ? 'font-semibold text-indigo-700' : 'text-slate-700'}`}>
                      {cat.name}
                    </span>

                    {/* Product count badge */}
                    {cat._count?.products !== undefined && cat._count.products > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-semibold flex-shrink-0">
                        {cat._count.products}
                      </span>
                    )}

                    {/* Checkmark */}
                    {isSelected && (
                      <svg className="ml-2 w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                      </svg>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">{categories.length} kategori</span>
            <span className="text-[11px] text-slate-400">▸ tıkla · ▾ aç/kapat</span>
          </div>
        </div>
      )}
    </div>
  );
}
