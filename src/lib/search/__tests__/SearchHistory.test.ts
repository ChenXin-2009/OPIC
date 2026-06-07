import { SearchHistory } from '../SearchHistory';

describe('SearchHistory', () => {
  beforeEach(() => {
    SearchHistory.clear();
  });

  it('should add and get entries', () => {
    SearchHistory.add({ id: 'earth', name: '地球', type: 'planet' });
    const entries = SearchHistory.getAll();
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('earth');
    expect(entries[0].name).toBe('地球');
    expect(entries[0].type).toBe('planet');
  });

  it('should limit to MAX_ENTRIES', () => {
    for (let i = 0; i < 10; i++) {
      SearchHistory.add({ id: `body-${i}`, name: `Body ${i}`, type: 'star' });
    }
    const entries = SearchHistory.getAll();
    expect(entries.length).toBeLessThanOrEqual(5);
  });

  it('should move existing entry to front and update timestamp', () => {
    SearchHistory.add({ id: 'mars', name: '火星', type: 'planet' });
    SearchHistory.add({ id: 'venus', name: '金星', type: 'planet' });
    SearchHistory.add({ id: 'mars', name: '火星', type: 'planet' });
    const entries = SearchHistory.getAll();
    expect(entries).toHaveLength(2);
    expect(entries[0].id).toBe('mars');
  });

  it('should clear all entries', () => {
    SearchHistory.add({ id: 'earth', name: '地球', type: 'planet' });
    SearchHistory.clear();
    expect(SearchHistory.getAll()).toHaveLength(0);
  });

  it('should handle localStorage fallback', () => {
    const setSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage full');
    });
    SearchHistory.add({ id: 'test', name: 'Test', type: 'star' });
    const entries = SearchHistory.getAll();
    expect(entries).toHaveLength(1);
    setSpy.mockRestore();
  });
});
