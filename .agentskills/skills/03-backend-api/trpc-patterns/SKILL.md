---
name: tRPC Patterns
description: End-to-end type-safe APIs with tRPC for seamless TypeScript integration between client and server without code generation.
---

# tRPC Patterns

## Overview

tRPC ช่วยให้สร้าง type-safe APIs โดยไม่ต้องเขียน schema หรือ generate code แยก โดย types จะ shared ระหว่าง client และ server อัตโนมัติ เหมาะสำหรับ TypeScript monorepos และ full-stack applications

## Why This Matters

- **Zero Code Generation**: Types inferred automatically, no codegen step
- **End-to-End Type Safety**: Catch API errors at compile time
- **Excellent DX**: Autocomplete for API calls in IDE
- **Small Bundle**: Minimal client-side overhead

---

## Core Concepts

### 1. Router Definition

```typescript
// server/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);

// Middleware
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { user: ctx.user } });
});
```

### 2. Procedures (Endpoints)

```typescript
// server/routers/user.ts
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';

export const userRouter = router({
  // Query (GET)
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      return ctx.prisma.user.findUnique({ where: { id: input.id } });
    }),

  // Mutation (POST/PUT/DELETE)
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      bio: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: input,
      });
    }),

  // Subscription (WebSocket)
  onNewMessage: protectedProcedure
    .subscription(({ ctx }) => {
      return observable<Message>((emit) => {
        const onMessage = (msg: Message) => emit.next(msg);
        ctx.ee.on('newMessage', onMessage);
        return () => ctx.ee.off('newMessage', onMessage);
      });
    }),
});
```

### 3. App Router

```typescript
// server/routers/_app.ts
import { router } from '../trpc';
import { userRouter } from './user';
import { postRouter } from './post';
import { commentRouter } from './comment';

export const appRouter = router({
  user: userRouter,
  post: postRouter,
  comment: commentRouter,
});

export type AppRouter = typeof appRouter;
```

### 4. Client Setup (React)

```typescript
// utils/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../server/routers/_app';

export const trpc = createTRPCReact<AppRouter>();

// Provider setup
function App() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          headers: () => ({
            authorization: getAuthToken(),
          }),
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <MyApp />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

### 5. Using in Components

```typescript
// Full type safety and autocomplete!
function UserProfile({ userId }: { userId: string }) {
  // Query
  const { data: user, isLoading } = trpc.user.getById.useQuery({ id: userId });
  
  // Mutation
  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      utils.user.getById.invalidate({ id: userId });
    },
  });

  // Optimistic updates
  const utils = trpc.useUtils();
  
  const handleUpdate = (name: string) => {
    updateProfile.mutate({ name });
  };

  if (isLoading) return <Spinner />;
  return <div>{user?.name}</div>;
}
```

## Quick Start

1. **Install packages:**
   ```bash
   npm install @trpc/server @trpc/client @trpc/react-query @tanstack/react-query zod
   ```

2. **Create tRPC instance:**
   ```typescript
   // server/trpc.ts
   import { initTRPC } from '@trpc/server';
   const t = initTRPC.create();
   export const router = t.router;
   export const publicProcedure = t.procedure;
   ```

3. **Define your router:**
   ```typescript
   export const appRouter = router({
     hello: publicProcedure
       .input(z.object({ name: z.string() }))
       .query(({ input }) => `Hello ${input.name}`),
   });
   ```

4. **Setup API handler (Next.js):**
   ```typescript
   // pages/api/trpc/[trpc].ts
   import { createNextApiHandler } from '@trpc/server/adapters/next';
   export default createNextApiHandler({ router: appRouter });
   ```

5. **Use in components:**
   ```typescript
   const { data } = trpc.hello.useQuery({ name: 'World' });
   ```

## Production Checklist

- [ ] Error handling with custom error formatter
- [ ] Input validation with Zod schemas
- [ ] Rate limiting middleware
- [ ] Authentication middleware
- [ ] Request logging
- [ ] Response caching strategy
- [ ] Batch link configured for performance
- [ ] WebSocket setup for subscriptions (if needed)
- [ ] OpenAPI generation for external consumers (optional)

## Anti-patterns

1. **Skipping Input Validation**: Always use Zod schemas for input validation
2. **Huge Routers**: Split routers by domain, don't put everything in one file
3. **Business Logic in Procedures**: Keep procedures thin, delegate to services
4. **Ignoring Error Handling**: Use proper TRPCError codes for client handling

## Integration Points

- **Next.js**: `@trpc/server/adapters/next`
- **Express**: `@trpc/server/adapters/express`
- **Fastify**: `@trpc/server/adapters/fastify`
- **Prisma**: Direct integration in context
- **NextAuth**: Session in context
- **React Query**: `@trpc/react-query`

## Further Reading

- [tRPC Documentation](https://trpc.io/docs)
- [tRPC + Next.js Example](https://github.com/trpc/trpc/tree/main/examples/next-prisma-starter)
- [T3 Stack](https://create.t3.gg/) - Next.js + tRPC + Prisma + NextAuth
