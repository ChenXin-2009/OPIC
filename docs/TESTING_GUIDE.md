# Testing Guide

## Test Runner

```bash
# Run all tests
npm test

# Run tests with coverage
npx jest --coverage

# Run a specific test file
npx jest src/lib/utils/__tests__/math.test.ts

# Run tests matching a pattern
npx jest --testPathPattern="state"

# Run tests with verbose output
npx jest --verbose
```

## Test Structure

Tests live in `__tests__/` directories alongside source code:

```
src/lib/utils/
├── math.ts
└── __tests__/
    └── math.test.ts
```

## Writing Tests

### Unit Tests (Pure Logic)

For files without external dependencies (math, validation, models):

```typescript
import { degreesToRadians } from '../math';

describe('math', () => {
  it('should convert degrees to radians', () => {
    expect(degreesToRadians(180)).toBeCloseTo(Math.PI);
  });
});
```

### Tests with Internal Dependencies

Use the `@/` alias (configured in jest.config.js):

```typescript
import { CameraController } from '@/lib/3d/camera/CameraController';
```

### Tests with Three.js

Three.js is available without mocking:

```typescript
import * as THREE from 'three';

it('should create a vector', () => {
  const v = new THREE.Vector3(1, 2, 3);
  expect(v.length()).toBeCloseTo(3.742);
});
```

### Tests with Cesium

Cesium is a dynamic import and must be mocked:

```typescript
jest.mock('cesium', () => ({
  Viewer: jest.fn(),
  // ... other mocks as needed
}));
```

### Tests with localStorage

```typescript
it('should handle storage errors', () => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('Storage error');
  });
  // ... test logic
  jest.restoreAllMocks();
});
```

## State Store Tests

For Zustand stores:

```typescript
import { useDockStore } from '../DockStore';

describe('DockStore', () => {
  beforeEach(() => {
    useDockStore.setState({ items: [] });
  });

  it('should add items', () => {
    useDockStore.getState().addItem({ id: 'test', ... });
    expect(useDockStore.getState().items).toHaveLength(1);
  });
});
```

## Coverage

Current thresholds (jest.config.js):

| Metric | Threshold |
|--------|-----------|
| Statements | 7% |
| Branches | 4% |
| Functions | 7% |
| Lines | 7% |

Generate coverage report:

```bash
npx jest --coverage
open coverage/lcov-report/index.html
```

## Common Pitfalls

1. **`fs` module**: Not available in jsdom. Avoid in test environment.
2. **`@/` alias**: Works in tests (configured in jest.config.js).
3. **Cesium**: Dynamic import only; always mock in tests.
4. **TextEncoder**: Not defined in jsdom. Mock if needed.
5. **Test isolation**: Always reset state between tests (use `beforeEach`).
