import { useSearchStore } from '../useSearchStore';

const initialState = () => useSearchStore.getState();

describe('useSearchStore', () => {
  beforeEach(() => {
    useSearchStore.setState({
      isOpen: false,
      query: '',
      results: [],
      selectedIndex: -1,
      isLoading: false,
      activeCategory: 'all',
      isNavigating: false,
      categorizedResults: { 'all': [], 'solar-system': [], 'exoplanet': [], 'satellite': [], 'deep-space': [], 'places': [] },
    });
  });

  it('starts closed with empty query', () => {
    const s = initialState();
    expect(s.isOpen).toBe(false);
    expect(s.query).toBe('');
    expect(s.results).toEqual([]);
  });

  it('openSearch sets isOpen true and clears state', () => {
    initialState().openSearch();
    const s = initialState();
    expect(s.isOpen).toBe(true);
    expect(s.query).toBe('');
    expect(s.results).toEqual([]);
  });

  it('closeSearch sets isOpen false and clears state', () => {
    initialState().openSearch();
    initialState().setQuery('test');
    initialState().closeSearch();
    const s = initialState();
    expect(s.isOpen).toBe(false);
    expect(s.query).toBe('');
  });

  it('toggleSearch toggles isOpen', () => {
    expect(initialState().isOpen).toBe(false);
    initialState().toggleSearch();
    expect(initialState().isOpen).toBe(true);
    initialState().toggleSearch();
    expect(initialState().isOpen).toBe(false);
  });

  it('setQuery updates the query string', () => {
    initialState().setQuery('Mars');
    expect(initialState().query).toBe('Mars');
  });

  it('setResults updates results', () => {
    const results = [{ id: '1', name: 'Mars', type: 'planet' as const, category: 'solar-system' as const }];
    initialState().setResults(results as any);
    expect(initialState().results).toHaveLength(1);
  });

  it('setSelectedIndex updates selected index', () => {
    initialState().setSelectedIndex(2);
    expect(initialState().selectedIndex).toBe(2);
  });

  it('setActiveCategory updates category', () => {
    initialState().setActiveCategory('exoplanet');
    expect(initialState().activeCategory).toBe('exoplanet');
  });

  it('setIsLoading updates loading state', () => {
    initialState().setIsLoading(true);
    expect(initialState().isLoading).toBe(true);
  });

  it('clearQuery resets query and results', () => {
    initialState().setQuery('test');
    initialState().setResults([{ id: '1', name: 'Test', type: 'planet', category: 'solar-system' } as any]);
    initialState().clearQuery();
    expect(initialState().query).toBe('');
    expect(initialState().results).toEqual([]);
    expect(initialState().selectedIndex).toBe(-1);
  });
});
