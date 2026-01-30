---
name: Supabase Patterns
description: Building applications with Supabase - open source Firebase alternative with PostgreSQL, Auth, Realtime, Storage, and Edge Functions.
---

# Supabase Patterns

## Overview

Supabase เป็น open-source Firebase alternative ที่ใช้ PostgreSQL เป็น core database มี features ครบ: Authentication, Realtime subscriptions, Storage, Edge Functions, และ Vector embeddings สำหรับ AI applications

## Why This Matters

- **PostgreSQL Power**: Full SQL, joins, transactions, extensions
- **Open Source**: Self-host ได้, ไม่ vendor lock-in
- **Realtime Built-in**: Subscribe to database changes
- **Row Level Security**: Fine-grained access control
- **AI Ready**: pgvector for embeddings

---

## Core Concepts

### 1. Project Setup

```typescript
// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types'; // Generated types

// Browser client (uses anon key)
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Server client (uses service role - NEVER expose to client)
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Server component client (Next.js App Router)
// lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}
```

### 2. Authentication

```typescript
// hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signInWithOAuth = async (provider: 'google' | 'github' | 'facebook') => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
    return data;
  };

  const signUp = async (email: string, password: string, metadata?: object) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return {
    user,
    session,
    loading,
    signInWithEmail,
    signInWithOAuth,
    signUp,
    signOut,
  };
}
```

### 3. Database Queries with Type Safety

```typescript
// Generate types first: npx supabase gen types typescript --project-id <id> > database.types.ts

// services/posts.service.ts
import { supabase } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/database.types';

type Post = Database['public']['Tables']['posts']['Row'];
type PostInsert = Database['public']['Tables']['posts']['Insert'];
type PostUpdate = Database['public']['Tables']['posts']['Update'];

export const postsService = {
  // Get all posts with author
  async getPosts(options?: { limit?: number; offset?: number }) {
    const query = supabase
      .from('posts')
      .select(`
        *,
        author:profiles(id, username, avatar_url),
        comments(count)
      `)
      .order('created_at', { ascending: false });

    if (options?.limit) query.limit(options.limit);
    if (options?.offset) query.range(options.offset, options.offset + (options.limit || 10) - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data, count };
  },

  // Get single post
  async getPost(id: string) {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles(*),
        comments(
          *,
          author:profiles(id, username, avatar_url)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Create post
  async createPost(post: PostInsert) {
    const { data, error } = await supabase
      .from('posts')
      .insert(post)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update post
  async updatePost(id: string, updates: PostUpdate) {
    const { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete post
  async deletePost(id: string) {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Search posts
  async searchPosts(query: string) {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .textSearch('title', query, { type: 'websearch' });

    if (error) throw error;
    return data;
  },
};
```

### 4. Row Level Security (RLS)

```sql
-- migrations/001_create_posts.sql

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read published posts
CREATE POLICY "Public posts are viewable by everyone"
ON posts FOR SELECT
USING (status = 'published');

-- Policy: Users can read their own drafts
CREATE POLICY "Users can view own drafts"
ON posts FOR SELECT
USING (auth.uid() = author_id AND status = 'draft');

-- Policy: Users can insert their own posts
CREATE POLICY "Users can create own posts"
ON posts FOR INSERT
WITH CHECK (auth.uid() = author_id);

-- Policy: Users can update their own posts
CREATE POLICY "Users can update own posts"
ON posts FOR UPDATE
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

-- Policy: Users can delete their own posts
CREATE POLICY "Users can delete own posts"
ON posts FOR DELETE
USING (auth.uid() = author_id);

-- Policy: Admins can do everything
CREATE POLICY "Admins have full access"
ON posts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

### 5. Realtime Subscriptions

```typescript
// hooks/useRealtimePosts.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export function useRealtimePosts(channelId: string) {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    // Initial fetch
    const fetchPosts = async () => {
      const { data } = await supabase
        .from('posts')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });
      
      if (data) setPosts(data);
    };

    fetchPosts();

    // Subscribe to changes
    const channel = supabase
      .channel(`posts:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload: RealtimePostgresChangesPayload<Post>) => {
          if (payload.eventType === 'INSERT') {
            setPosts(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setPosts(prev =>
              prev.map(p => (p.id === payload.new.id ? payload.new : p))
            );
          } else if (payload.eventType === 'DELETE') {
            setPosts(prev => prev.filter(p => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  return posts;
}

// Presence (online users)
export function usePresence(roomId: string, userId: string) {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    const channel = supabase.channel(`room:${roomId}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat().map((p: any) => p.user_id);
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: userId, online_at: new Date().toISOString() });
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [roomId, userId]);

  return onlineUsers;
}
```

### 6. Storage

```typescript
// services/storage.service.ts
import { supabase } from '@/lib/supabase/client';

export const storageService = {
  // Upload file
  async uploadFile(bucket: string, path: string, file: File) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;
    return data;
  },

  // Upload with auto-generated name
  async uploadAvatar(userId: string, file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    await this.uploadFile('avatars', filePath, file);
    
    // Get public URL
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  // Download file
  async downloadFile(bucket: string, path: string) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path);

    if (error) throw error;
    return data;
  },

  // Get signed URL (for private buckets)
  async getSignedUrl(bucket: string, path: string, expiresIn = 3600) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  },

  // Delete file
  async deleteFile(bucket: string, paths: string[]) {
    const { error } = await supabase.storage
      .from(bucket)
      .remove(paths);

    if (error) throw error;
  },

  // List files
  async listFiles(bucket: string, folder: string) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) throw error;
    return data;
  },
};
```

### 7. Edge Functions

```typescript
// supabase/functions/send-email/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify JWT
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { to, subject, body } = await req.json();

    // Send email using Resend/SendGrid/etc
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@myapp.com',
        to,
        subject,
        html: body,
      }),
    });

    const result = await emailResponse.json();

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Call from client
// const { data, error } = await supabase.functions.invoke('send-email', {
//   body: { to: 'user@example.com', subject: 'Hello', body: '<h1>Hi</h1>' },
// });
```

### 8. Vector Search (AI)

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create table with embedding column
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- OpenAI ada-002 dimension
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast similarity search
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Search function
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

```typescript
// Vector search from client
async function searchDocuments(query: string) {
  // Get embedding from OpenAI
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: query,
  });
  
  const embedding = embeddingResponse.data[0].embedding;

  // Search in Supabase
  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: embedding,
    match_threshold: 0.7,
    match_count: 10,
  });

  return data;
}
```

## Quick Start

1. **Create project:** https://supabase.com/dashboard

2. **Install SDK:**
   ```bash
   npm install @supabase/supabase-js @supabase/ssr
   ```

3. **Generate types:**
   ```bash
   npx supabase gen types typescript --project-id <id> > lib/database.types.ts
   ```

4. **Setup client** (see examples above)

5. **Enable RLS** on all tables

## Production Checklist

- [ ] RLS enabled on all tables
- [ ] RLS policies tested thoroughly
- [ ] Service role key NEVER exposed to client
- [ ] Database backups configured
- [ ] Edge function secrets configured
- [ ] Storage bucket policies set
- [ ] Rate limiting configured
- [ ] Monitoring and alerts set up

## Anti-patterns

1. **Disabling RLS**: Always use RLS, even for "simple" apps
2. **Service key on client**: NEVER expose service role key
3. **No type generation**: Always generate and use TypeScript types
4. **Polling instead of Realtime**: Use subscriptions for live data

## Integration Points

- **Auth Providers**: Google, GitHub, Apple, SAML, etc.
- **AI/ML**: pgvector for embeddings, OpenAI integration
- **Storage**: S3-compatible, CDN built-in
- **Edge**: Deno-based edge functions

## Further Reading

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase GitHub](https://github.com/supabase/supabase)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
