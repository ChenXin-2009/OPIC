'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchStore } from '@/lib/store/useSearchStore';
import { useTranslation } from '@/hooks/useTranslation';
import SearchBox from '../search/SearchBox';
import { TYPE_COLORS, TYPE_LABELS } from '@/lib/search/types';
import type { SearchResult, SearchCategory } from '@/lib/search/types';

const CATEGORIES: SearchCategory[] = ['all', 'solar-system', 'exoplanet', 'satellite', 'deep-space', 'places'];

export function SearchWindow() {
  const {
    query,
    results,
    categorizedResults,
    selectedIndex,
    isLoading,
    activeCategory,
    performSearch,
    navigateToResult,
    setSelectedIndex,
    setActiveCategory,
    setQuery,
    clearQuery,
  } = useSearchStore();

  const { t, lang } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [userNavigated, setUserNavigated] = useState(false);

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    setUserNavigated(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(value), 120);
    if (!value.trim()) performSearch('');
  }, [setQuery, performSearch]);

  const handleClear = useCallback(() => {
    clearQuery();
    setUserNavigated(false);
    inputRef.current?.focus();
  }, [clearQuery]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const list = activeCategory === 'all' ? results : (categorizedResults[activeCategory] || []);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setUserNavigated(true);
      setSelectedIndex(Math.min(selectedIndex + 1, list.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setUserNavigated(true);
      setSelectedIndex(Math.max(selectedIndex - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < list.length && userNavigated) {
        navigateToResult(list[selectedIndex]);
      } else {
        // Enter triggers a fresh search (including async places)
        if (debounceRef.current) clearTimeout(debounceRef.current);
        performSearch(query);
      }
    }
  }, [results, categorizedResults, activeCategory, selectedIndex, userNavigated, query, setSelectedIndex, navigateToResult, performSearch]);

  const showResults = query.trim().length > 0;
  const hasAnyResults = CATEGORIES.slice(1).some(c => (categorizedResults[c]?.length || 0) > 0);
  const displayList = activeCategory === 'all' ? results : (categorizedResults[activeCategory] || []);

  useEffect(() => {
    inputRef.current?.focus();
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  // Reset selection when results or category changes (but don't auto-highlight)
  useEffect(() => {
    if (!userNavigated && displayList.length > 0) {
      setSelectedIndex(-1);
    } else if (displayList.length === 0) {
      setSelectedIndex(-1);
    }
  }, [activeCategory, displayList.length, userNavigated, setSelectedIndex]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '12px' }}>
      <SearchBox
        value={query}
        onChange={handleChange}
        onFocus={() => {}}
        onBlur={() => {}}
        onClear={handleClear}
        placeholder={t('search.placeholder')}
        isFocused={true}
        inputRef={inputRef as any}
        onKeyDown={handleKeyDown}
      />

      {/* Category tabs */}
      {showResults && hasAnyResults && (
        <div style={{ display: 'flex', gap: '4px', padding: '8px 0 4px', overflowX: 'auto', flexShrink: 0 }}>
          {CATEGORIES.map(cat => {
            const count = (categorizedResults[cat] || []).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '3px 10px', fontSize: '11px', borderRadius: '6px',
                  background: activeCategory === cat ? 'rgba(255,255,255,0.12)' : 'transparent',
                  border: `1px solid ${activeCategory === cat ? 'rgba(255,255,255,0.2)' : 'transparent'}`,
                  color: activeCategory === cat ? '#fff' : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
                }}
              >
                {cat === 'all' ? (lang === 'zh' ? '全部' : 'All')
                  : cat === 'solar-system' ? (lang === 'zh' ? '太阳系' : 'Solar')
                  : cat === 'exoplanet' ? (lang === 'zh' ? '系外行星' : 'Exo')
                  : cat === 'satellite' ? (lang === 'zh' ? '卫星' : 'Sat')
                  : cat === 'deep-space' ? (lang === 'zh' ? '深空' : 'Deep')
                  : (lang === 'zh' ? '地点' : 'Place')}
                {count > 0 && <span style={{ marginLeft: '4px', opacity: 0.5 }}>{count}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Results */}
      <div style={{ flex: 1, overflowY: 'auto', marginTop: '4px' }}>
        {isLoading && (
          <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
            <div style={{
              width: '20px', height: '20px', margin: '0 auto 8px',
              border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#fff',
              borderRadius: '50%', animation: 'sp 0.8s linear infinite',
            }} />
            {t('common.searching')}
            <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {!isLoading && showResults && !hasAnyResults && (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>
            {lang === 'zh' ? `未找到"${query}"` : `No results for "${query}"`}
          </div>
        )}

        {!isLoading && !showResults && (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '12px' }}>
            {lang === 'zh' ? '搜索天体、系外行星、卫星或地球地点' : 'Search celestial objects, exoplanets, satellites, or Earth places'}
          </div>
        )}

        {!isLoading && showResults && hasAnyResults && displayList.map((result, i) => {
          const isSel = i === selectedIndex;
          const color = TYPE_COLORS[result.type] || '#888';
          const label = TYPE_LABELS[result.type];
          return (
            <div
              key={result.id}
              onClick={() => navigateToResult(result)}
              onMouseEnter={() => { setUserNavigated(true); setSelectedIndex(i); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '7px 10px', cursor: 'pointer', borderRadius: '6px',
                background: isSel ? 'rgba(255,255,255,0.08)' : 'transparent',
                borderLeft: `3px solid ${isSel ? color : 'transparent'}`,
                transition: 'all 0.1s',
              }}
            >
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: isSel ? '#fff' : 'rgba(255,255,255,0.8)', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {result.name}
                </div>
                {result.nameEn !== result.nameZh && (
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lang === 'zh' ? result.nameEn : result.nameZh}
                  </div>
                )}
              </div>
              <div style={{
                padding: '1px 6px', fontSize: '10px', fontWeight: 600,
                color, background: `${color}15`, border: `1px solid ${color}30`,
                borderRadius: '4px', whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {lang === 'zh' ? label.zh : label.en}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
