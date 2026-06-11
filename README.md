# rec0

**Give any AI memory. In one line.**

A production-grade JavaScript and TypeScript SDK for rec0. Store durable user memories, recall relevant context, and inject it into any model prompt.

## Installation

npm:

```bash
npm install @rec0ai/rec0
```

yarn:

```bash
yarn add @rec0ai/rec0
```

pnpm:

```bash
pnpm add @rec0ai/rec0
```

## Quick Start

```typescript
import { Memory } from '@rec0ai/rec0';

const mem = new Memory({
  userId: 'user_123',
  apiKey: 'r0_live_sk_...',
});

await mem.store('I prefer TypeScript over JavaScript');

const memories = await mem.recall('what are my coding preferences?');
// -> [{ content: 'I prefer TypeScript over JavaScript', relevance_score: 0.94 }]

const context = await mem.context('coding preferences');
// -> "- I prefer TypeScript over JavaScript"
```

## Use with any LLM

```typescript
import OpenAI from 'openai';
import { Memory } from '@rec0ai/rec0';

const mem = new Memory({
  userId: 'user_123',
  apiKey: process.env.REC0_API_KEY,
});

const openai = new OpenAI();

async function chat(userMessage: string) {
  const context = await mem.context(userMessage);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: context
          ? `Here is relevant context about the user:\n${context}`
          : 'You are a helpful assistant.',
      },
      { role: 'user', content: userMessage },
    ],
  });

  await mem.store(userMessage);

  return response.choices[0]?.message?.content ?? '';
}
```

## API Reference

### Constructor

```typescript
new Memory(options: MemoryClientOptions)
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| userId | string | required | Unique user identifier |
| apiKey | string | REC0_API_KEY env | Your rec0 API key |
| appId | string | "default" | Namespace for memory isolation |
| baseUrl | string | https://memorylayer-production.up.railway.app | API base URL |
| timeout | number | 10000 | Request timeout in milliseconds |
| retry | RetryOptions | defaults below | Retry and backoff strategy |
| headers | Record<string, string> | undefined | Extra headers for each request |

### RetryOptions

| Field | Type | Default |
|-------|------|---------|
| maxRetries | number | 3 |
| initialDelay | number | 500 |
| maxDelay | number | 60000 |
| exponentialBase | number | 2 |
| jitter | boolean | true |

### Methods

#### 1) store

```typescript
store(content: string): Promise<MemoryObject>
```

Stores a new memory.

```typescript
const created = await mem.store('User likes concise answers');
console.log(created.id);
```

#### 2) recall

```typescript
recall(query: string, options?: RecallOptions): Promise<MemoryObject[]>
```

Returns relevant memories sorted by semantic relevance.

```typescript
const memories = await mem.recall('communication style', {
  limit: 10,
  recallLimit: 40,
  offset: 0,
});
```

#### 3) context

```typescript
context(
  query: string,
  options?: Pick<RecallOptions, 'limit' | 'appId'>
): Promise<string>
```

Returns a bullet-list string ready to inject into prompts.

```typescript
const context = await mem.context('project goals', { limit: 5 });
```

#### 4) list

```typescript
list(options?: ListOptions): Promise<MemoryObject[]>
```

Lists active memories for the current user.

```typescript
const allMemories = await mem.list({ limit: 50, offset: 0 });
```

#### 5) delete

```typescript
delete(memoryId: string): Promise<void>
```

Soft-deletes one memory.

```typescript
await mem.delete('7f9b3f7f-50f6-4f65-bb1c-8c5f40f5c2f0');
```

#### 6) deleteUser

```typescript
deleteUser(): Promise<UserDeleteResult>
```

Deletes all memories for the current user via GDPR erasure endpoint.

```typescript
const result = await mem.deleteUser();
console.log(result.memories_removed);
```

#### 7) export

```typescript
export(): Promise<ExportResult>
```

Exports all active memories for the current user.

```typescript
const data = await mem.export();
console.log(data.total_memories);
```

#### 8) ping

```typescript
ping(): Promise<boolean>
```

Checks API health.

```typescript
if (!(await mem.ping())) {
  console.error('rec0 API unavailable');
}
```

#### 9) whoami

```typescript
whoami(): Promise<WhoAmIResult>
```

Returns account metadata for the API key.

```typescript
const account = await mem.whoami();
console.log(account.plan, account.ops_limit);
```

### Error Handling

```typescript
import {
  Memory,
  AuthError,
  RateLimitError,
  NotFoundError,
  ValidationError,
  Rec0Error,
} from '@rec0ai/rec0';

const mem = new Memory({
  userId: 'user_123',
  apiKey: process.env.REC0_API_KEY,
});

try {
  await mem.store('User likes dark mode');
} catch (err) {
  if (err instanceof ValidationError) {
    console.error('Invalid input:', err.message);
  } else if (err instanceof AuthError) {
    console.error('Invalid API key');
  } else if (err instanceof RateLimitError) {
    console.error(`Rate limited. Retry after ${err.retryAfter}s`);
  } else if (err instanceof NotFoundError) {
    console.error('Memory not found');
  } else if (err instanceof Rec0Error) {
    console.error(`rec0 API error (${err.status}):`, err.message);
  } else {
    console.error('Unexpected error:', err);
  }
}
```

### Environment Variables

- REC0_API_KEY: API key (alternative to passing apiKey in constructor)

## Framework Examples

### Express.js middleware

```typescript
import express from 'express';
import { Memory } from '@rec0ai/rec0';

const app = express();
app.use(express.json());

app.post('/chat', async (req, res) => {
  const userId = req.body.userId;
  const message = req.body.message;

  const mem = new Memory({
    userId,
    apiKey: process.env.REC0_API_KEY,
    appId: 'my-express-app',
  });

  const context = await mem.context(message);
  await mem.store(message);

  res.json({ context });
});
```

### Next.js API route

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { Memory } from '@rec0ai/rec0';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, message } = req.body;

  const mem = new Memory({
    userId,
    apiKey: process.env.REC0_API_KEY,
    appId: 'next-api',
  });

  const context = await mem.context(message);
  await mem.store(message);

  return res.status(200).json({ context });
}
```

### LangChain memory adapter

```typescript
import { Memory } from '@rec0ai/rec0';

export class Rec0LangChainMemory {
  constructor(private readonly mem: Memory) {}

  async loadMemoryVariables(input: { input: string }) {
    const context = await this.mem.context(input.input);
    return { history: context };
  }

  async saveContext(input: { input: string }) {
    await this.mem.store(input.input);
  }
}
```

### Vercel AI SDK

```typescript
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { Memory } from '@rec0ai/rec0';

export async function POST(req: Request) {
  const { userId, message } = await req.json();

  const mem = new Memory({
    userId,
    apiKey: process.env.REC0_API_KEY,
    appId: 'vercel-ai',
  });

  const context = await mem.context(message);

  const result = await streamText({
    model: openai('gpt-4o-mini'),
    system: context
      ? `Relevant user context:\n${context}`
      : 'You are a helpful assistant.',
    prompt: message,
  });

  void mem.store(message);

  return result.toDataStreamResponse();
}
```

## Notes

- Runtime requirement: Node.js 18+ (native fetch required).
- Authentication uses X-API-Key by default.
- For browser usage, never expose secret keys to untrusted clients.
