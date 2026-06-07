import { EventBus, getEventBus, resetEventBus } from '../EventBus';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it('should subscribe and emit events', () => {
    const handler = jest.fn();
    bus.on('test:event', handler);
    bus.emit('test:event', { data: 42 });
    expect(handler).toHaveBeenCalledWith({ data: 42 });
  });

  it('should not call handler after unsubscribe', () => {
    const handler = jest.fn();
    const unsubscribe = bus.on('test:event', handler);
    unsubscribe();
    bus.emit('test:event', { data: 42 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('should support once subscription', () => {
    const handler = jest.fn();
    bus.once('test:event', handler);
    bus.emit('test:event', 'first');
    bus.emit('test:event', 'second');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should handle errors in handlers gracefully', () => {
    const handler = jest.fn().mockImplementation(() => { throw new Error('handler error'); });
    const errorHandler = jest.fn();
    bus.setErrorHandler(errorHandler);
    bus.on('test:event', handler);
    bus.emit('test:event', 'data');
    expect(errorHandler).toHaveBeenCalled();
  });

  it('should unsubscribe a mod completely', () => {
    const handler = jest.fn();
    bus.on('event:a', handler, 'mod1');
    bus.on('event:b', handler, 'mod1');
    bus.unsubscribeMod('mod1');
    bus.emit('event:a');
    bus.emit('event:b');
    expect(handler).not.toHaveBeenCalled();
  });

  it('should check for subscribers', () => {
    expect(bus.hasSubscribers('test')).toBe(false);
    bus.on('test', jest.fn());
    expect(bus.hasSubscribers('test')).toBe(true);
  });

  it('should get subscriber count', () => {
    expect(bus.getSubscriberCount('test')).toBe(0);
    bus.on('test', jest.fn());
    expect(bus.getSubscriberCount('test')).toBe(1);
  });

  it('should get mod subscriptions', () => {
    bus.on('event:a', jest.fn(), 'mod1');
    bus.on('event:b', jest.fn(), 'mod1');
    const subs = bus.getModSubscriptions('mod1');
    expect(subs).toContain('event:a');
    expect(subs).toContain('event:b');
  });

  it('should clear all subscriptions', () => {
    bus.on('test', jest.fn());
    bus.clear();
    expect(bus.hasSubscribers('test')).toBe(false);
  });

  it('should not emit when no subscribers', () => {
    expect(() => bus.emit('nonexistent')).not.toThrow();
  });

  it('should expose SYSTEM_EVENTS', () => {
    expect(EventBus.SYSTEM_EVENTS).toBeDefined();
  });
});

describe('getEventBus', () => {
  beforeEach(() => {
    resetEventBus();
  });

  it('should return a singleton instance', () => {
    const a = getEventBus();
    const b = getEventBus();
    expect(a).toBe(b);
  });
});
