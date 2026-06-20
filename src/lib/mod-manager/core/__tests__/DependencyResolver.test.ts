import {
  DependencyResolver,
  getDependencyResolver,
  resetDependencyResolver,
} from '../DependencyResolver';

describe('DependencyResolver', () => {
  let resolver: DependencyResolver;

  beforeEach(() => {
    resolver = new DependencyResolver();
  });

  describe('register and unregister', () => {
    it('should register a mod without dependencies', () => {
      resolver.register('mod-a');
      expect(resolver.topologicalSort()).toContain('mod-a');
    });

    it('should register a mod with dependencies', () => {
      resolver.register('mod-a');
      resolver.register('mod-b', [{ id: 'mod-a' }]);
      const sort = resolver.topologicalSort();
      expect(sort).toContain('mod-a');
      expect(sort).toContain('mod-b');
    });

    it('should unregister a mod', () => {
      resolver.register('mod-a');
      resolver.unregister('mod-a');
      expect(resolver.topologicalSort()).not.toContain('mod-a');
    });

    it('should rebuild graph after unregister', () => {
      resolver.register('mod-a');
      resolver.register('mod-b', [{ id: 'mod-a' }]);
      resolver.unregister('mod-a');
      const sort = resolver.topologicalSort();
      expect(sort).toContain('mod-b');
      expect(sort).not.toContain('mod-a');
    });
  });

  describe('topologicalSort', () => {
    it('should return empty array for empty graph', () => {
      expect(resolver.topologicalSort()).toEqual([]);
    });

    it('should return single mod', () => {
      resolver.register('mod-a');
      expect(resolver.topologicalSort()).toEqual(['mod-a']);
    });

    it('should sort independent mods', () => {
      resolver.register('mod-a');
      resolver.register('mod-b');
      resolver.register('mod-c');
      const sort = resolver.topologicalSort();
      expect(sort).toHaveLength(3);
      expect(sort).toContain('mod-a');
      expect(sort).toContain('mod-b');
      expect(sort).toContain('mod-c');
    });

    it('should produce a valid topological ordering for linear chain', () => {
      resolver.register('mod-a');
      resolver.register('mod-b', [{ id: 'mod-a' }]);
      resolver.register('mod-c', [{ id: 'mod-b' }]);
      const sort = resolver.topologicalSort();
      expect(sort).toHaveLength(3);
      const idxA = sort.indexOf('mod-a');
      const idxB = sort.indexOf('mod-b');
      const idxC = sort.indexOf('mod-c');
      expect(idxA).not.toBe(-1);
      expect(idxB).not.toBe(-1);
      expect(idxC).not.toBe(-1);
      expect(idxA).not.toBe(idxB);
      expect(idxB).not.toBe(idxC);
    });

    it('should include all nodes in diamond dependency', () => {
      resolver.register('mod-base');
      resolver.register('mod-left', [{ id: 'mod-base' }]);
      resolver.register('mod-right', [{ id: 'mod-base' }]);
      resolver.register('mod-top', [
        { id: 'mod-left' },
        { id: 'mod-right' },
      ]);
      const sort = resolver.topologicalSort();
      expect(sort).toHaveLength(4);
      expect(sort).toContain('mod-base');
      expect(sort).toContain('mod-left');
      expect(sort).toContain('mod-right');
      expect(sort).toContain('mod-top');
    });
  });

  describe('detectCycles', () => {
    it('should return no cycles for empty graph', () => {
      expect(resolver.detectCycles()).toEqual([]);
    });

    it('should return no cycles for acyclic graph', () => {
      resolver.register('mod-a');
      resolver.register('mod-b', [{ id: 'mod-a' }]);
      expect(resolver.detectCycles()).toEqual([]);
    });

    it('should detect simple two-node cycle', () => {
      resolver.register('mod-a', [{ id: 'mod-b' }]);
      resolver.register('mod-b', [{ id: 'mod-a' }]);
      const cycles = resolver.detectCycles();
      expect(cycles.length).toBeGreaterThan(0);
    });

    it('should detect three-node cycle', () => {
      resolver.register('mod-a', [{ id: 'mod-c' }]);
      resolver.register('mod-b', [{ id: 'mod-a' }]);
      resolver.register('mod-c', [{ id: 'mod-b' }]);
      const cycles = resolver.detectCycles();
      expect(cycles.length).toBeGreaterThan(0);
    });

    it('should return no cycles after removing cycle', () => {
      resolver.register('mod-a', [{ id: 'mod-b' }]);
      resolver.register('mod-b', [{ id: 'mod-a' }]);
      expect(resolver.hasCycles()).toBe(true);
      resolver.unregister('mod-b');
      expect(resolver.hasCycles()).toBe(false);
    });
  });

  describe('hasCycles', () => {
    it('should return false for empty graph', () => {
      expect(resolver.hasCycles()).toBe(false);
    });

    it('should return true when cycles exist', () => {
      resolver.register('mod-a', [{ id: 'mod-b' }]);
      resolver.register('mod-b', [{ id: 'mod-a' }]);
      expect(resolver.hasCycles()).toBe(true);
    });
  });

  describe('getMissingDependencies', () => {
    it('should return empty for mod with no deps', () => {
      resolver.register('mod-a');
      expect(resolver.getMissingDependencies('mod-a')).toEqual([]);
    });

    it('should return empty when all deps are registered', () => {
      resolver.register('mod-a');
      resolver.register('mod-b', [{ id: 'mod-a' }]);
      expect(resolver.getMissingDependencies('mod-b')).toEqual([]);
    });

    it('should return missing non-optional deps', () => {
      resolver.register('mod-b', [{ id: 'mod-a' }]);
      expect(resolver.getMissingDependencies('mod-b')).toEqual(['mod-a']);
    });

    it('should not return missing optional deps', () => {
      resolver.register('mod-b', [{ id: 'mod-a', optional: true }]);
      expect(resolver.getMissingDependencies('mod-b')).toEqual([]);
    });

    it('should return empty for unregistered mod', () => {
      expect(resolver.getMissingDependencies('nonexistent')).toEqual([]);
    });
  });

  describe('getAllMissingDependencies', () => {
    it('should return empty map when no missing deps', () => {
      resolver.register('mod-a');
      resolver.register('mod-b', [{ id: 'mod-a' }]);
      expect(resolver.getAllMissingDependencies().size).toBe(0);
    });

    it('should return all missing deps', () => {
      resolver.register('mod-a', [{ id: 'mod-x' }]);
      resolver.register('mod-b', [{ id: 'mod-y' }]);
      const missing = resolver.getAllMissingDependencies();
      expect(missing.size).toBe(2);
      expect(missing.get('mod-a')).toEqual(['mod-x']);
      expect(missing.get('mod-b')).toEqual(['mod-y']);
    });
  });

  describe('getEnableOrder', () => {
    it('should return success with all requested mods', () => {
      resolver.register('mod-a');
      resolver.register('mod-b', [{ id: 'mod-a' }]);
      const result = resolver.getEnableOrder(['mod-a', 'mod-b']);
      expect(result.success).toBe(true);
      expect(result.loadOrder).toContain('mod-a');
      expect(result.loadOrder).toContain('mod-b');
    });

    it('should fail when cycles detected', () => {
      resolver.register('mod-a', [{ id: 'mod-b' }]);
      resolver.register('mod-b', [{ id: 'mod-a' }]);
      const result = resolver.getEnableOrder(['mod-a', 'mod-b']);
      expect(result.success).toBe(false);
      expect(result.cycles.length).toBeGreaterThan(0);
    });

    it('should fail when missing dependencies', () => {
      resolver.register('mod-b', [{ id: 'mod-a' }]);
      const result = resolver.getEnableOrder(['mod-b']);
      expect(result.success).toBe(false);
      expect(result.missing).toContain('mod-a');
    });

    it('should only include requested mods', () => {
      resolver.register('mod-a');
      resolver.register('mod-b', [{ id: 'mod-a' }]);
      resolver.register('mod-c', [{ id: 'mod-b' }]);
      const result = resolver.getEnableOrder(['mod-b', 'mod-c']);
      expect(result.loadOrder).not.toContain('mod-a');
      expect(result.loadOrder).toContain('mod-b');
      expect(result.loadOrder).toContain('mod-c');
    });
  });

  describe('getDisableOrder', () => {
    it('should return all requested mods', () => {
      resolver.register('mod-a');
      resolver.register('mod-b', [{ id: 'mod-a' }]);
      resolver.register('mod-c', [{ id: 'mod-b' }]);
      const order = resolver.getDisableOrder(['mod-a', 'mod-b', 'mod-c']);
      expect(order).toContain('mod-a');
      expect(order).toContain('mod-b');
      expect(order).toContain('mod-c');
      expect(order).toHaveLength(3);
    });

    it('should only include requested mods', () => {
      resolver.register('mod-a');
      resolver.register('mod-b', [{ id: 'mod-a' }]);
      resolver.register('mod-c');
      const order = resolver.getDisableOrder(['mod-a', 'mod-b']);
      expect(order).not.toContain('mod-c');
    });
  });

  describe('getAllDependencies', () => {
    it('should return empty for mod with no deps', () => {
      resolver.register('mod-a');
      expect(resolver.getAllDependencies('mod-a')).toEqual([]);
    });

    it('should return direct dependencies', () => {
      resolver.register('mod-a');
      resolver.register('mod-b', [{ id: 'mod-a' }]);
      expect(resolver.getAllDependencies('mod-b')).toContain('mod-a');
    });

    it('should return transitive dependencies', () => {
      resolver.register('mod-a');
      resolver.register('mod-b', [{ id: 'mod-a' }]);
      resolver.register('mod-c', [{ id: 'mod-b' }]);
      const deps = resolver.getAllDependencies('mod-c');
      expect(deps).toContain('mod-b');
      expect(deps).toContain('mod-a');
    });

    it('should return empty for unregistered mod', () => {
      expect(resolver.getAllDependencies('nonexistent')).toEqual([]);
    });
  });

  describe('getAllDependents', () => {
    it('should return empty for mod with no dependents', () => {
      resolver.register('mod-a');
      expect(resolver.getAllDependents('mod-a')).toEqual([]);
    });

    it('should return direct dependents', () => {
      resolver.register('mod-a');
      resolver.register('mod-b', [{ id: 'mod-a' }]);
      expect(resolver.getAllDependents('mod-a')).toContain('mod-b');
    });

    it('should return transitive dependents', () => {
      resolver.register('mod-a');
      resolver.register('mod-b', [{ id: 'mod-a' }]);
      resolver.register('mod-c', [{ id: 'mod-b' }]);
      const dependents = resolver.getAllDependents('mod-a');
      expect(dependents).toContain('mod-b');
      expect(dependents).toContain('mod-c');
    });

    it('should return empty for unregistered mod', () => {
      expect(resolver.getAllDependents('nonexistent')).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should clear all registrations', () => {
      resolver.register('mod-a');
      resolver.register('mod-b', [{ id: 'mod-a' }]);
      resolver.clear();
      expect(resolver.topologicalSort()).toEqual([]);
    });
  });

  describe('getDependencyResolver singleton', () => {
    beforeEach(() => {
      resetDependencyResolver();
    });

    it('should return same instance', () => {
      const a = getDependencyResolver();
      const b = getDependencyResolver();
      expect(a).toBe(b);
    });
  });
});
