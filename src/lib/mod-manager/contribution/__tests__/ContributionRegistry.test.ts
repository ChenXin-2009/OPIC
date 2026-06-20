import { ContributionRegistry } from '../ContributionRegistry';
import { ContributionError, type ContributionPoints } from '../types';

function createMockRegistry() {
  return {
    get: jest.fn(),
    has: jest.fn().mockReturnValue(true),
  } as any;
}

function createMockEventBus() {
  return {
    emit: jest.fn(),
    on: jest.fn(),
  } as any;
}

describe('ContributionRegistry', () => {
  let registry: ContributionRegistry;
  let mockModRegistry: ReturnType<typeof createMockRegistry>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  beforeEach(() => {
    mockModRegistry = createMockRegistry();
    mockEventBus = createMockEventBus();
    registry = new ContributionRegistry(mockModRegistry, mockEventBus);
  });

  describe('dockIcons', () => {
    it('should register a dock icon', () => {
      registry.registerContributions('mod1', {
        dockIcons: [{ id: 'icon1', icon: 'star', label: 'Star', command: 'mod1.toggle' }],
      });

      const icon = registry.getDockIcon('mod1.icon1');
      expect(icon).toBeDefined();
      expect(icon!.modId).toBe('mod1');
      expect(icon!.fullId).toBe('mod1.icon1');
      expect(icon!.label).toBe('Star');
    });

    it('should emit event on dock icon registration', () => {
      registry.registerContributions('mod1', {
        dockIcons: [{ id: 'icon1', icon: 'star', label: 'Star', command: 'mod1.toggle' }],
      });

      expect(mockEventBus.emit).toHaveBeenCalledWith('contribution:dock-icon-registered', {
        modId: 'mod1',
        iconId: 'mod1.icon1',
      });
    });

    it('should throw on duplicate dock icon registration', () => {
      registry.registerContributions('mod1', {
        dockIcons: [{ id: 'icon1', icon: 'star', label: 'Star', command: 'mod1.toggle' }],
      });

      expect(() => {
        registry.registerContributions('mod1', {
          dockIcons: [{ id: 'icon1', icon: 'star', label: 'Star', command: 'mod1.toggle' }],
        });
      }).toThrow(ContributionError);
    });

    it('should unregister dock icon', () => {
      registry.registerContributions('mod1', {
        dockIcons: [{ id: 'icon1', icon: 'star', label: 'Star', command: 'mod1.toggle' }],
      });

      registry.unregisterContributions('mod1');
      expect(registry.getDockIcon('mod1.icon1')).toBeUndefined();
    });

    it('should emit event on dock icon unregistration', () => {
      registry.registerContributions('mod1', {
        dockIcons: [{ id: 'icon1', icon: 'star', label: 'Star', command: 'mod1.toggle' }],
      });

      mockEventBus.emit.mockClear();
      registry.unregisterContributions('mod1');

      expect(mockEventBus.emit).toHaveBeenCalledWith('contribution:dock-icon-unregistered', {
        iconId: 'mod1.icon1',
      });
    });

    it('should get all dock icons sorted by order', () => {
      registry.registerContributions('mod1', {
        dockIcons: [
          { id: 'icon1', icon: 'a', label: 'A', command: 'a', order: 20 },
          { id: 'icon2', icon: 'b', label: 'B', command: 'b', order: 10 },
        ],
      });

      const icons = registry.getDockIcons();
      expect(icons.length).toBe(2);
      expect(icons[0].id).toBe('icon2');
      expect(icons[1].id).toBe('icon1');
    });

    it('should update dock icon badge', () => {
      registry.registerContributions('mod1', {
        dockIcons: [{ id: 'icon1', icon: 'star', label: 'Star', command: 'mod1.toggle' }],
      });

      registry.updateDockIconBadge('mod1.icon1', 5);
      expect(registry.getDockIcon('mod1.icon1')!.badge).toBe(5);
    });
  });

  describe('windows', () => {
    it('should register a window', () => {
      registry.registerContributions('mod1', {
        windows: [{ id: 'win1', title: 'Settings', component: 'SettingsPanel' }],
      });

      const win = registry.getWindow('mod1.win1');
      expect(win).toBeDefined();
      expect(win!.modId).toBe('mod1');
      expect(win!.fullId).toBe('mod1.win1');
      expect(win!.title).toBe('Settings');
    });

    it('should emit event on window registration', () => {
      registry.registerContributions('mod1', {
        windows: [{ id: 'win1', title: 'Settings', component: 'SettingsPanel' }],
      });

      expect(mockEventBus.emit).toHaveBeenCalledWith('contribution:window-registered', {
        modId: 'mod1',
        windowId: 'mod1.win1',
      });
    });

    it('should throw on duplicate window registration', () => {
      registry.registerContributions('mod1', {
        windows: [{ id: 'win1', title: 'Settings', component: 'SettingsPanel' }],
      });

      expect(() => {
        registry.registerContributions('mod1', {
          windows: [{ id: 'win1', title: 'Settings', component: 'SettingsPanel' }],
        });
      }).toThrow(ContributionError);
    });

    it('should unregister window', () => {
      registry.registerContributions('mod1', {
        windows: [{ id: 'win1', title: 'Settings', component: 'SettingsPanel' }],
      });

      registry.unregisterContributions('mod1');
      expect(registry.getWindow('mod1.win1')).toBeUndefined();
    });

    it('should get all windows', () => {
      registry.registerContributions('mod1', {
        windows: [
          { id: 'win1', title: 'A', component: 'A' },
          { id: 'win2', title: 'B', component: 'B' },
        ],
      });

      expect(registry.getWindows().length).toBe(2);
    });

    it('should get windows by mod', () => {
      registry.registerContributions('mod1', {
        windows: [{ id: 'win1', title: 'A', component: 'A' }],
      });
      registry.registerContributions('mod2', {
        windows: [{ id: 'win2', title: 'B', component: 'B' }],
      });

      expect(registry.getWindowsByMod('mod1').length).toBe(1);
      expect(registry.getWindowsByMod('mod1')[0].fullId).toBe('mod1.win1');
    });
  });

  describe('commands', () => {
    it('should register a command', () => {
      registry.registerContributions('mod1', {
        commands: [{ id: 'cmd1', title: 'Run', handler: 'handleRun' }],
      });

      const cmd = registry.getCommand('mod1.cmd1');
      expect(cmd).toBeDefined();
      expect(cmd!.modId).toBe('mod1');
      expect(cmd!.fullId).toBe('mod1.cmd1');
      expect(cmd!.handler).toBe('handleRun');
    });

    it('should emit event on command registration', () => {
      registry.registerContributions('mod1', {
        commands: [{ id: 'cmd1', title: 'Run', handler: 'handleRun' }],
      });

      expect(mockEventBus.emit).toHaveBeenCalledWith('contribution:command-registered', {
        modId: 'mod1',
        commandId: 'mod1.cmd1',
      });
    });

    it('should throw on duplicate command registration', () => {
      registry.registerContributions('mod1', {
        commands: [{ id: 'cmd1', title: 'Run', handler: 'handleRun' }],
      });

      expect(() => {
        registry.registerContributions('mod1', {
          commands: [{ id: 'cmd1', title: 'Run', handler: 'handleRun' }],
        });
      }).toThrow(ContributionError);
    });

    it('should check command existence', () => {
      expect(registry.hasCommand('mod1.cmd1')).toBe(false);

      registry.registerContributions('mod1', {
        commands: [{ id: 'cmd1', title: 'Run', handler: 'handleRun' }],
      });

      expect(registry.hasCommand('mod1.cmd1')).toBe(true);
    });

    it('should get commands by category', () => {
      registry.registerContributions('mod1', {
        commands: [
          { id: 'cmd1', title: 'A', handler: 'a', category: 'File' },
          { id: 'cmd2', title: 'B', handler: 'b', category: 'File' },
          { id: 'cmd3', title: 'C', handler: 'c', category: 'Edit' },
        ],
      });

      const byCategory = registry.getCommandsByCategory();
      expect(byCategory.get('File')!.length).toBe(2);
      expect(byCategory.get('Edit')!.length).toBe(1);
    });

    it('should get commands by mod', () => {
      registry.registerContributions('mod1', {
        commands: [{ id: 'cmd1', title: 'A', handler: 'a' }],
      });
      registry.registerContributions('mod2', {
        commands: [{ id: 'cmd2', title: 'B', handler: 'b' }],
      });

      expect(registry.getCommandsByMod('mod1').length).toBe(1);
      expect(registry.getCommandsByMod('mod2').length).toBe(1);
    });

    it('should throw when executing non-existent command', async () => {
      await expect(registry.executeCommand('nonexistent')).rejects.toThrow(ContributionError);
    });

    it('should execute command through registry', async () => {
      const handler = jest.fn();
      mockModRegistry.get.mockReturnValue({
        context: { modId: 'mod1' },
        lifecycleHooks: { handleRun: handler },
      });

      registry.registerContributions('mod1', {
        commands: [{ id: 'cmd1', title: 'Run', handler: 'handleRun' }],
      });

      await registry.executeCommand('mod1.cmd1', 'arg1', 'arg2');
      expect(handler).toHaveBeenCalledWith({ modId: 'mod1' }, 'arg1', 'arg2');
    });
  });

  describe('registerContributions', () => {
    it('should register all contribution types at once', () => {
      const contributions: ContributionPoints = {
        dockIcons: [{ id: 'icon1', icon: 'star', label: 'Star', command: 'mod1.toggle' }],
        windows: [{ id: 'win1', title: 'Settings', component: 'SettingsPanel' }],
        commands: [{ id: 'cmd1', title: 'Run', handler: 'handleRun' }],
      };

      registry.registerContributions('mod1', contributions);

      expect(registry.getDockIcon('mod1.icon1')).toBeDefined();
      expect(registry.getWindow('mod1.win1')).toBeDefined();
      expect(registry.getCommand('mod1.cmd1')).toBeDefined();
    });

    it('should handle empty contributions', () => {
      registry.registerContributions('mod1', {});
      expect(registry.getStats().total).toBe(0);
    });
  });

  describe('unregisterContributions', () => {
    it('should unregister only contributions from the specified mod', () => {
      registry.registerContributions('mod1', {
        dockIcons: [{ id: 'icon1', icon: 'a', label: 'A', command: 'a' }],
        commands: [{ id: 'cmd1', title: 'A', handler: 'a' }],
      });
      registry.registerContributions('mod2', {
        dockIcons: [{ id: 'icon2', icon: 'b', label: 'B', command: 'b' }],
      });

      registry.unregisterContributions('mod1');

      expect(registry.getDockIcon('mod1.icon1')).toBeUndefined();
      expect(registry.getCommand('mod1.cmd1')).toBeUndefined();
      expect(registry.getDockIcon('mod2.icon2')).toBeDefined();
    });
  });

  describe('getStats', () => {
    it('should return correct stats', () => {
      registry.registerContributions('mod1', {
        dockIcons: [{ id: 'i1', icon: 'a', label: 'A', command: 'a' }],
        windows: [{ id: 'w1', title: 'A', component: 'A' }],
        commands: [{ id: 'c1', title: 'A', handler: 'a' }],
      });

      const stats = registry.getStats();
      expect(stats.dockIcons).toBe(1);
      expect(stats.windows).toBe(1);
      expect(stats.commands).toBe(1);
      expect(stats.total).toBe(3);
    });

    it('should return correct mod stats', () => {
      registry.registerContributions('mod1', {
        dockIcons: [{ id: 'i1', icon: 'a', label: 'A', command: 'a' }],
        commands: [{ id: 'c1', title: 'A', handler: 'a' }],
      });
      registry.registerContributions('mod2', {
        windows: [{ id: 'w1', title: 'A', component: 'A' }],
      });

      const stats1 = registry.getModStats('mod1');
      expect(stats1.dockIcons).toBe(1);
      expect(stats1.windows).toBe(0);
      expect(stats1.commands).toBe(1);

      const stats2 = registry.getModStats('mod2');
      expect(stats2.dockIcons).toBe(0);
      expect(stats2.windows).toBe(1);
      expect(stats2.commands).toBe(0);
    });
  });
});
