import { useDockStore, initializeDefaultDockItems } from '../DockStore';
import type { DockItem, DockItemConfig } from '@/types/dock';

describe('useDockStore', () => {
  beforeEach(() => {
    useDockStore.setState({
      items: [],
      position: 'bottom',
      size: 'medium',
      autoHide: false,
      showRunningIndicator: true,
      showLabels: true,
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useDockStore.getState();
      expect(state.items).toEqual([]);
      expect(state.position).toBe('bottom');
      expect(state.size).toBe('medium');
      expect(state.autoHide).toBe(false);
      expect(state.showRunningIndicator).toBe(true);
      expect(state.showLabels).toBe(true);
    });

    it('should have all necessary methods', () => {
      const state = useDockStore.getState();
      expect(typeof state.addItem).toBe('function');
      expect(typeof state.removeItem).toBe('function');
      expect(typeof state.updateItem).toBe('function');
      expect(typeof state.setRunning).toBe('function');
      expect(typeof state.setBadge).toBe('function');
      expect(typeof state.reorderItems).toBe('function');
      expect(typeof state.getItem).toBe('function');
      expect(typeof state.hasItem).toBe('function');
      expect(typeof state.getRunningApps).toBe('function');
      expect(typeof state.clearNonPinnedItems).toBe('function');
      expect(typeof state.setPosition).toBe('function');
      expect(typeof state.setSize).toBe('function');
      expect(typeof state.toggleAutoHide).toBe('function');
      expect(typeof state.toggleRunningIndicator).toBe('function');
      expect(typeof state.toggleLabels).toBe('function');
    });
  });

  describe('addItem', () => {
    const testItem: DockItem = {
      id: 'test-1',
      icon: 'icon-test',
      label: 'Test Item',
      type: 'app',
    };

    it('should add a new item', () => {
      useDockStore.getState().addItem(testItem);
      const items = useDockStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('test-1');
    });

    it('should auto-assign order if not specified', () => {
      useDockStore.getState().addItem(testItem);
      expect(useDockStore.getState().items[0].order).toBe(1);
    });

    it('should not add duplicate id', () => {
      useDockStore.getState().addItem(testItem);
      useDockStore.getState().addItem(testItem);
      expect(useDockStore.getState().items).toHaveLength(1);
    });

    it('should sort items by order', () => {
      const item1: DockItem = { id: 'a', icon: 'a', label: 'A', type: 'app', order: 2 };
      const item2: DockItem = { id: 'b', icon: 'b', label: 'B', type: 'app', order: 1 };
      useDockStore.getState().addItem(item1);
      useDockStore.getState().addItem(item2);
      const items = useDockStore.getState().items;
      expect(items[0].id).toBe('b');
      expect(items[1].id).toBe('a');
    });
  });

  describe('removeItem', () => {
    it('should remove an item by id', () => {
      useDockStore.getState().addItem({ id: 'test-1', icon: 'i', label: 'Test', type: 'app' });
      useDockStore.getState().removeItem('test-1');
      expect(useDockStore.getState().items).toHaveLength(0);
    });

    it('should not throw when removing non-existent id', () => {
      expect(() => useDockStore.getState().removeItem('nonexistent')).not.toThrow();
    });
  });

  describe('updateItem', () => {
    it('should update an existing item', () => {
      useDockStore.getState().addItem({ id: 'test-1', icon: 'i', label: 'Test', type: 'app' });
      useDockStore.getState().updateItem('test-1', { label: 'Updated' });
      expect(useDockStore.getState().items[0].label).toBe('Updated');
    });

    it('should not affect other items', () => {
      useDockStore.getState().addItem({ id: 'a', icon: 'i', label: 'A', type: 'app' });
      useDockStore.getState().addItem({ id: 'b', icon: 'i', label: 'B', type: 'app' });
      useDockStore.getState().updateItem('a', { label: 'A Updated' });
      expect(useDockStore.getState().items.find(i => i.id === 'b')?.label).toBe('B');
    });
  });

  describe('setRunning', () => {
    it('should set running state of an item', () => {
      useDockStore.getState().addItem({ id: 'test-1', icon: 'i', label: 'Test', type: 'app' });
      useDockStore.getState().setRunning('test-1', true);
      expect(useDockStore.getState().items[0].isRunning).toBe(true);
      useDockStore.getState().setRunning('test-1', false);
      expect(useDockStore.getState().items[0].isRunning).toBe(false);
    });
  });

  describe('setBadge', () => {
    it('should set badge number on an item', () => {
      useDockStore.getState().addItem({ id: 'test-1', icon: 'i', label: 'Test', type: 'app' });
      useDockStore.getState().setBadge('test-1', 5);
      expect(useDockStore.getState().items[0].badge).toBe(5);
    });

    it('should clear badge when set to undefined', () => {
      useDockStore.getState().addItem({ id: 'test-1', icon: 'i', label: 'Test', type: 'app' });
      useDockStore.getState().setBadge('test-1', 5);
      useDockStore.getState().setBadge('test-1', undefined);
      expect(useDockStore.getState().items[0].badge).toBeUndefined();
    });
  });

  describe('reorderItems', () => {
    it('should reorder items correctly', () => {
      for (let i = 0; i < 3; i++) {
        useDockStore.getState().addItem({ id: `item-${i}`, icon: 'i', label: `Item ${i}`, type: 'app' });
      }
      useDockStore.getState().reorderItems(0, 2);
      const items = useDockStore.getState().items;
      expect(items[2].id).toBe('item-0');
      expect(items[0].order).toBe(0);
      expect(items[1].order).toBe(1);
      expect(items[2].order).toBe(2);
    });

    it('should do nothing for invalid indices', () => {
      useDockStore.getState().addItem({ id: 'item-0', icon: 'i', label: 'Item 0', type: 'app' });
      useDockStore.getState().reorderItems(-1, 5);
      expect(useDockStore.getState().items).toHaveLength(1);
    });
  });

  describe('getItem and hasItem', () => {
    it('should find an item by id', () => {
      useDockStore.getState().addItem({ id: 'test-1', icon: 'i', label: 'Test', type: 'app' });
      const item = useDockStore.getState().getItem('test-1');
      expect(item).toBeDefined();
      expect(item?.id).toBe('test-1');
    });

    it('should return undefined for non-existent item', () => {
      const item = useDockStore.getState().getItem('nonexistent');
      expect(item).toBeUndefined();
    });

    it('hasItem should check existence', () => {
      useDockStore.getState().addItem({ id: 'test-1', icon: 'i', label: 'Test', type: 'app' });
      expect(useDockStore.getState().hasItem('test-1')).toBe(true);
      expect(useDockStore.getState().hasItem('nonexistent')).toBe(false);
    });
  });

  describe('getRunningApps', () => {
    it('should return only running items', () => {
      useDockStore.getState().addItem({ id: 'a', icon: 'i', label: 'A', type: 'app', isRunning: true });
      useDockStore.getState().addItem({ id: 'b', icon: 'i', label: 'B', type: 'app', isRunning: false });
      useDockStore.getState().addItem({ id: 'c', icon: 'i', label: 'C', type: 'app', isRunning: true });
      const running = useDockStore.getState().getRunningApps();
      expect(running).toHaveLength(2);
      expect(running.map(i => i.id)).toEqual(['a', 'c']);
    });
  });

  describe('clearNonPinnedItems', () => {
    it('should remove non-pinned items and keep pinned ones', () => {
      useDockStore.getState().addItem({ id: 'pinned', icon: 'i', label: 'Pinned', type: 'app', isPinned: true });
      useDockStore.getState().addItem({ id: 'not-pinned', icon: 'i', label: 'Not Pinned', type: 'app', isPinned: false });
      useDockStore.getState().clearNonPinnedItems();
      const items = useDockStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('pinned');
    });
  });

  describe('position and size', () => {
    it('should set position', () => {
      useDockStore.getState().setPosition('left');
      expect(useDockStore.getState().position).toBe('left');
      useDockStore.getState().setPosition('right');
      expect(useDockStore.getState().position).toBe('right');
    });

    it('should set size', () => {
      useDockStore.getState().setSize('small');
      expect(useDockStore.getState().size).toBe('small');
      useDockStore.getState().setSize('large');
      expect(useDockStore.getState().size).toBe('large');
    });
  });

  describe('toggles', () => {
    it('toggleAutoHide should toggle autoHide', () => {
      expect(useDockStore.getState().autoHide).toBe(false);
      useDockStore.getState().toggleAutoHide();
      expect(useDockStore.getState().autoHide).toBe(true);
      useDockStore.getState().toggleAutoHide();
      expect(useDockStore.getState().autoHide).toBe(false);
    });

    it('toggleRunningIndicator should toggle showRunningIndicator', () => {
      expect(useDockStore.getState().showRunningIndicator).toBe(true);
      useDockStore.getState().toggleRunningIndicator();
      expect(useDockStore.getState().showRunningIndicator).toBe(false);
    });

    it('toggleLabels should toggle showLabels', () => {
      expect(useDockStore.getState().showLabels).toBe(true);
      useDockStore.getState().toggleLabels();
      expect(useDockStore.getState().showLabels).toBe(false);
    });
  });

  describe('initializeDefaultDockItems', () => {
    it('should initialize items from config', () => {
      const configs: DockItemConfig[] = [
        { id: 'finder', icon: 'finder', label: 'Finder' },
        { id: 'trash', icon: 'trash', label: 'Trash', isPinned: false },
      ];
      initializeDefaultDockItems(configs);
      const items = useDockStore.getState().items;
      expect(items).toHaveLength(2);
      expect(items[0].id).toBe('finder');
      expect(items[0].isPinned).toBe(true);
      expect(items[0].isRunning).toBe(false);
      expect(items[1].id).toBe('trash');
      expect(items[1].isPinned).toBe(false);
    });
  });
});
