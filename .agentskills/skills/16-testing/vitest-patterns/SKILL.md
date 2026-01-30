---
name: Vitest Patterns
description: Modern unit and integration testing with Vitest - fast, Vite-native, Jest-compatible testing framework with TypeScript support.
---

# Vitest Patterns

## Overview

Vitest เป็น testing framework รุ่นใหม่ที่ออกแบบมาสำหรับ Vite ecosystem แต่ใช้ได้กับทุก project เร็วกว่า Jest มาก มี native TypeScript/ESM support และ Jest-compatible API ทำให้ migrate ง่าย

## Why This Matters

- **Speed**: 10-20x faster than Jest (Vite's transform pipeline)
- **Native ESM/TypeScript**: No transpilation config needed
- **Jest Compatible**: Same API, easy migration
- **Watch Mode**: Instant feedback with smart re-runs
- **UI Mode**: Visual test debugging interface

---

## Core Concepts

### 1. Setup

```typescript
// vite.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment
    environment: 'jsdom', // or 'node', 'happy-dom'
    
    // Global test APIs (describe, it, expect) - optional
    globals: true,
    
    // Setup files
    setupFiles: ['./src/test/setup.ts'],
    
    // Include patterns
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    
    // Exclude patterns
    exclude: ['node_modules', 'dist', 'e2e'],
    
    // Coverage
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        'src/test',
        '**/*.d.ts',
        '**/*.config.*',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    
    // Timeouts
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Parallel execution
    pool: 'threads', // or 'forks', 'vmThreads'
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1,
      },
    },
    
    // Path aliases (same as vite)
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock fetch if needed
global.fetch = vi.fn();
```

### 2. Basic Testing

```typescript
// src/utils/math.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { add, multiply, divide, Calculator } from './math';

// Basic assertions
describe('Math utilities', () => {
  it('adds two numbers', () => {
    expect(add(1, 2)).toBe(3);
  });

  it('multiplies two numbers', () => {
    expect(multiply(3, 4)).toBe(12);
  });

  it('divides two numbers', () => {
    expect(divide(10, 2)).toBe(5);
  });

  it('throws on division by zero', () => {
    expect(() => divide(10, 0)).toThrow('Cannot divide by zero');
  });
});

// Matchers
describe('Matchers examples', () => {
  it('demonstrates common matchers', () => {
    // Equality
    expect(1 + 1).toBe(2);
    expect({ a: 1 }).toEqual({ a: 1 });
    expect({ a: 1, b: 2 }).toMatchObject({ a: 1 });
    
    // Truthiness
    expect(true).toBeTruthy();
    expect(false).toBeFalsy();
    expect(null).toBeNull();
    expect(undefined).toBeUndefined();
    expect(1).toBeDefined();
    
    // Numbers
    expect(10).toBeGreaterThan(5);
    expect(5).toBeLessThanOrEqual(5);
    expect(0.1 + 0.2).toBeCloseTo(0.3);
    
    // Strings
    expect('hello world').toContain('world');
    expect('hello').toMatch(/^hel/);
    expect('hello').toHaveLength(5);
    
    // Arrays
    expect([1, 2, 3]).toContain(2);
    expect([1, 2, 3]).toHaveLength(3);
    expect([{ a: 1 }, { a: 2 }]).toContainEqual({ a: 1 });
    
    // Objects
    expect({ a: 1 }).toHaveProperty('a');
    expect({ a: 1, b: 2 }).toHaveProperty('a', 1);
  });
});

// Setup and teardown
describe('Calculator', () => {
  let calculator: Calculator;

  beforeEach(() => {
    calculator = new Calculator();
  });

  afterEach(() => {
    calculator.reset();
  });

  it('starts at zero', () => {
    expect(calculator.value).toBe(0);
  });

  it('adds numbers', () => {
    calculator.add(5);
    calculator.add(3);
    expect(calculator.value).toBe(8);
  });
});
```

### 3. Mocking

```typescript
// src/services/user.test.ts
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { userService } from './user.service';
import { api } from '@/lib/api';
import { prisma } from '@/lib/prisma';

// Mock entire module
vi.mock('@/lib/api');
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUser', () => {
    it('returns user from database', async () => {
      const mockUser = { id: '1', name: 'John', email: 'john@example.com' };
      
      (prisma.user.findUnique as Mock).mockResolvedValue(mockUser);

      const result = await userService.getUser('1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(result).toEqual(mockUser);
    });

    it('returns null for non-existent user', async () => {
      (prisma.user.findUnique as Mock).mockResolvedValue(null);

      const result = await userService.getUser('999');

      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    it('creates user with hashed password', async () => {
      const input = { name: 'John', email: 'john@example.com', password: 'secret' };
      const mockUser = { id: '1', ...input, password: 'hashed' };
      
      (prisma.user.create as Mock).mockResolvedValue(mockUser);

      const result = await userService.createUser(input);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'John',
          email: 'john@example.com',
          password: expect.not.stringMatching('secret'), // Password should be hashed
        }),
      });
      expect(result.id).toBe('1');
    });
  });
});

// Spy on methods
describe('Spying', () => {
  it('spies on method calls', () => {
    const obj = {
      method: (x: number) => x * 2,
    };

    const spy = vi.spyOn(obj, 'method');

    obj.method(5);
    obj.method(10);

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith(5);
    expect(spy).toHaveBeenLastCalledWith(10);
    expect(spy).toHaveReturnedWith(10);
  });
});

// Mock timers
describe('Timers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('handles setTimeout', async () => {
    const callback = vi.fn();

    setTimeout(callback, 1000);

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);

    expect(callback).toHaveBeenCalledOnce();
  });

  it('handles setInterval', () => {
    const callback = vi.fn();

    setInterval(callback, 100);

    vi.advanceTimersByTime(350);

    expect(callback).toHaveBeenCalledTimes(3);
  });
});

// Mock fetch
describe('Fetch mocking', () => {
  it('mocks fetch responses', async () => {
    const mockResponse = { data: 'test' };
    
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const response = await fetch('/api/data');
    const data = await response.json();

    expect(data).toEqual(mockResponse);
  });
});
```

### 4. React Component Testing

```typescript
// src/components/Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('shows loading state', () => {
    render(<Button loading>Submit</Button>);
    
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('applies variant styles', () => {
    render(<Button variant="primary">Primary</Button>);
    
    expect(screen.getByRole('button')).toHaveClass('bg-blue-500');
  });
});

// Testing hooks
// src/hooks/useCounter.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('initializes with default value', () => {
    const { result } = renderHook(() => useCounter());
    
    expect(result.current.count).toBe(0);
  });

  it('initializes with custom value', () => {
    const { result } = renderHook(() => useCounter(10));
    
    expect(result.current.count).toBe(10);
  });

  it('increments count', () => {
    const { result } = renderHook(() => useCounter());
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.count).toBe(1);
  });

  it('decrements count', () => {
    const { result } = renderHook(() => useCounter(5));
    
    act(() => {
      result.current.decrement();
    });
    
    expect(result.current.count).toBe(4);
  });
});

// Testing with providers
// src/components/UserProfile.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProfile } from './UserProfile';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('UserProfile', () => {
  it('shows loading state', () => {
    render(<UserProfile userId="1" />, { wrapper: createWrapper() });
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('displays user data', async () => {
    // Mock the API call
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '1', name: 'John Doe', email: 'john@example.com' }),
    } as Response);

    render(<UserProfile userId="1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('shows error state', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Failed to fetch'));

    render(<UserProfile userId="1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

### 5. Async Testing

```typescript
// src/services/async.test.ts
import { describe, it, expect, vi } from 'vitest';
import { fetchUser, processQueue, waitForCondition } from './async';

describe('Async operations', () => {
  // Promises
  it('resolves async function', async () => {
    const result = await fetchUser('1');
    
    expect(result).toHaveProperty('id', '1');
  });

  it('rejects on error', async () => {
    await expect(fetchUser('invalid')).rejects.toThrow('User not found');
  });

  // Callbacks (convert to promises)
  it('handles callbacks', async () => {
    const result = await new Promise((resolve) => {
      processQueue((data) => {
        resolve(data);
      });
    });

    expect(result).toBeDefined();
  });

  // Polling / waiting
  it('waits for condition', async () => {
    let ready = false;
    
    setTimeout(() => {
      ready = true;
    }, 100);

    await vi.waitFor(() => {
      expect(ready).toBe(true);
    });
  });

  // Multiple async assertions
  it('handles concurrent operations', async () => {
    const results = await Promise.all([
      fetchUser('1'),
      fetchUser('2'),
      fetchUser('3'),
    ]);

    expect(results).toHaveLength(3);
    results.forEach((result, index) => {
      expect(result.id).toBe(String(index + 1));
    });
  });
});
```

### 6. Snapshot Testing

```typescript
// src/components/Card.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('matches snapshot', () => {
    const { container } = render(
      <Card title="Test Card" description="This is a test">
        <p>Card content</p>
      </Card>
    );

    expect(container).toMatchSnapshot();
  });

  it('matches inline snapshot', () => {
    const { container } = render(<Card title="Simple" />);

    expect(container.innerHTML).toMatchInlineSnapshot(`
      "<div class="card">
        <h2>Simple</h2>
      </div>"
    `);
  });
});

// Object snapshots
describe('API responses', () => {
  it('matches response structure', async () => {
    const response = await api.getUser('1');

    expect(response).toMatchSnapshot({
      id: expect.any(String),
      createdAt: expect.any(Date),
    });
  });
});
```

### 7. Test Utilities

```typescript
// src/test/utils.tsx
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/providers/ThemeProvider';

// Custom render with all providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    }),
    ...options
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    queryClient,
  };
}

// Factory functions
export function createMockUser(overrides = {}) {
  return {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    createdAt: new Date(),
    ...overrides,
  };
}

export function createMockOrder(overrides = {}) {
  return {
    id: '1',
    userId: '1',
    items: [],
    total: 0,
    status: 'pending',
    ...overrides,
  };
}

// Re-export everything
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
```

### 8. Running Tests

```bash
# Run all tests
npx vitest

# Run in watch mode (default)
npx vitest --watch

# Run once
npx vitest run

# Run specific file
npx vitest src/utils/math.test.ts

# Run tests matching pattern
npx vitest -t "should add"

# Run with coverage
npx vitest run --coverage

# Run with UI
npx vitest --ui

# Run specific test file in isolation
npx vitest --no-threads src/heavy.test.ts
```

## Quick Start

1. **Install Vitest:**
   ```bash
   npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
   ```

2. **Add to vite.config.ts:**
   ```typescript
   import { defineConfig } from 'vitest/config';
   
   export default defineConfig({
     test: {
       environment: 'jsdom',
       globals: true,
       setupFiles: './src/test/setup.ts',
     },
   });
   ```

3. **Add scripts to package.json:**
   ```json
   {
     "scripts": {
       "test": "vitest",
       "test:run": "vitest run",
       "test:coverage": "vitest run --coverage"
     }
   }
   ```

4. **Write your first test:**
   ```typescript
   import { describe, it, expect } from 'vitest';
   
   describe('My first test', () => {
     it('works', () => {
       expect(1 + 1).toBe(2);
     });
   });
   ```

## Production Checklist

- [ ] Coverage thresholds configured
- [ ] Setup file for global mocks
- [ ] Test utilities and factories
- [ ] CI integration with coverage reporting
- [ ] Snapshot tests reviewed
- [ ] No skipped tests in main branch
- [ ] Reasonable test timeouts
- [ ] Mock cleanup in afterEach

## Anti-patterns

1. **Testing implementation details**: Test behavior, not internals
2. **Snapshot overuse**: Use for UI, not business logic
3. **No cleanup**: Always cleanup mocks and DOM
4. **Skipping async handling**: Always await async operations

## Further Reading

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/)
- [Vitest UI](https://vitest.dev/guide/ui.html)
