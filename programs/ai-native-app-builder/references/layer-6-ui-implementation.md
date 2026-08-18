# Layer 6 — UI Implementation Guide

## Purpose

Implementation-ready patterns for building AI application frontends on AWS. Two approaches: **Amplify AI Kit** (fastest, managed) and **Custom React + API Gateway** (full control). Choose based on your backend architecture.

## Decision: Which UI Approach?

```
Is your agent on AgentCore Runtime or custom Lambda?
├── AgentCore Runtime → Use FAST template (fullstack webapp)
├── Amplify Gen2 backend (defineData + a.conversation) → Use Amplify AI Kit
└── Custom Lambda + API Gateway → Use Custom React + API Gateway
```

| Approach | Backend | Streaming | Auth | Effort |
|----------|---------|-----------|------|--------|
| Amplify AI Kit | Amplify Gen2 (AppSync + Lambda) | Built-in (WebSocket via AppSync) | Built-in (Cognito) | Lowest |
| FAST Template | AgentCore Runtime | Built-in (WebSocket) | Built-in (Cognito) | Low |
| Custom React | Any (API Gateway + Lambda) | Manual (WebSocket or polling) | Manual (Cognito + fetch) | Medium |

---

## Approach 1: Amplify AI Kit (Recommended for New Apps)

**Best for:** Apps where you control the full stack and want the fastest path to a working AI chat UI with streaming.

### Backend Setup

```typescript
// amplify/data/resource.ts
import { a, type ClientSchema, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  // Conversation route — multi-turn chat with agent
  chat: a.conversation({
    aiModel: a.ai.model('Claude 3.5 Sonnet v2'),
    systemPrompt: `You are an insurance claims processing agent.
You help policy holders file claims, check status, and guide them through the process.
Always verify the policy ID before creating a claim.
Never approve claims above $10,000 without flagging for human review.`,
    tools: [
      { name: 'lookupPolicy', query: a.ref('lookupPolicy'), description: 'Look up policy details' },
      { name: 'createClaim', query: a.ref('createClaim'), description: 'Create a new claim' },
      { name: 'getClaimStatus', query: a.ref('getClaimStatus'), description: 'Get claim status' },
    ],
  }).authorization(allow => allow.owner()),

  // Tool queries (called by the AI model)
  lookupPolicy: a.query()
    .arguments({ policyId: a.string().required() })
    .returns(a.customType({ policyId: a.string(), holderName: a.string(), coverageAmount: a.float(), status: a.string() }))
    .handler(a.handler.function(lookupPolicyFunc))
    .authorization(allow => allow.authenticated()),

  createClaim: a.query()
    .arguments({ policyId: a.string().required(), claimType: a.string().required(), incidentDate: a.string().required(), description: a.string().required() })
    .returns(a.customType({ claimId: a.string(), status: a.string(), requiredDocuments: a.string().array() }))
    .handler(a.handler.function(createClaimFunc))
    .authorization(allow => allow.authenticated()),

  getClaimStatus: a.query()
    .arguments({ claimId: a.string().required() })
    .returns(a.customType({ claimId: a.string(), status: a.string(), claimType: a.string() }))
    .handler(a.handler.function(getClaimStatusFunc))
    .authorization(allow => allow.authenticated()),
});

export type Schema = ClientSchema<typeof schema>;
export const data = defineData({ schema });
```

### Frontend — AI Conversation Component

```typescript
// src/Chat.tsx
import { generateClient } from 'aws-amplify/data';
import { createAIHooks, AIConversation } from '@aws-amplify/ui-react-ai';
import { Authenticator } from '@aws-amplify/ui-react';
import type { Schema } from '../amplify/data/resource';

const client = generateClient<Schema>();
const { useAIConversation } = createAIHooks(client);

function ChatPage() {
  const [
    { data: { messages }, isLoading },
    handleSendMessage,
  ] = useAIConversation('chat');

  return (
    <div className="max-w-4xl mx-auto p-4 h-screen flex flex-col">
      <h1 className="text-2xl font-bold mb-4">Claims Assistant</h1>
      <div className="flex-1">
        <AIConversation
          messages={messages}
          isLoading={isLoading}
          handleSendMessage={handleSendMessage}
          welcomeMessage="Hi! I can help you file a claim, check status, or answer questions about your policy."
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Authenticator>
      {({ signOut }) => <ChatPage />}
    </Authenticator>
  );
}
```

### Packages Required

```bash
npm install aws-amplify @aws-amplify/ui-react @aws-amplify/ui-react-ai react-router-dom
npm install -D @aws-amplify/backend typescript vite @vitejs/plugin-react tailwindcss
```

### Key Constraints (Amplify AI Kit)

- `a.conversation()` **MUST** use `allow.owner()` authorization
- `a.generation()` **MUST NOT** use `allow.owner()` (use `allow.authenticated()`)
- Streaming is automatic via AppSync WebSocket — no manual setup
- Tool functions are Lambda functions defined with `defineFunction`
- Conversation history is managed automatically

---

## Approach 2: Custom React + API Gateway

**Best for:** Apps with existing Lambda/API Gateway backends, or when you need full control over the agent invocation.

### Project Setup

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install aws-amplify @aws-amplify/ui-react react-router-dom
npm install -D tailwindcss postcss autoprefixer @types/react @types/react-dom
npx tailwindcss init -p
```

### Entry Point

```typescript
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';
import './index.css';
import App from './App';

// Configure Amplify with Cognito (manual config if not using Amplify Gen2)
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);
```

### Authenticated API Client

```typescript
// src/api/client.ts
import { fetchAuthSession } from 'aws-amplify/auth';

const API_URL = import.meta.env.VITE_API_ENDPOINT;

async function getToken(): Promise<string> {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  if (!token) throw new Error('Not authenticated');
  return token;
}

export const api = {
  async chat(message: string): Promise<{ response: string }> {
    const token = await getToken();
    const res = await fetch(`${API_URL}/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },

  async getClaim(claimId: string) {
    const token = await getToken();
    const res = await fetch(`${API_URL}/claims/${claimId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  async getUploadUrl(claimId: string, docType: string, fileName: string) {
    const token = await getToken();
    const res = await fetch(`${API_URL}/claims/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ claimId, documentType: docType, fileName }),
    });
    return res.json();
  },
};
```

### Chat Component (Custom — No Amplify AI Kit)

```typescript
// src/components/Chat.tsx
import { useState, useRef, useEffect, FormEvent } from 'react';
import { api } from '../api/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { response } = await api.chat(input);
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: response }]);
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 mt-12">
            Hi! I can help you file a claim, check status, or answer policy questions.
          </p>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] rounded-xl px-4 py-2 text-sm whitespace-pre-wrap ${
              msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-xl px-4 py-2 text-sm text-gray-500 animate-pulse">Thinking...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} className="border-t p-4 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
```

### Dashboard Component

```typescript
// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';

interface Claim {
  claimId: string;
  status: string;
  claimType: string;
  claimAmount?: string;
  filingDate: string;
  description: string;
}

export function Dashboard() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listClaims().then(data => { setClaims(data.claims || []); setLoading(false); });
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading claims...</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Claims Dashboard</h2>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Claim ID</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Amount</th>
              <th className="text-left px-4 py-3 font-medium">Filed</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {claims.map(claim => (
              <tr key={claim.claimId} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-4 py-3 font-mono text-blue-600">{claim.claimId}</td>
                <td className="px-4 py-3 capitalize">{claim.claimType}</td>
                <td className="px-4 py-3"><StatusBadge status={claim.status} /></td>
                <td className="px-4 py-3">{claim.claimAmount ? `$${Number(claim.claimAmount).toLocaleString()}` : '—'}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(claim.filingDate).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {claims.length === 0 && <p className="p-8 text-center text-gray-400">No claims found.</p>}
      </div>
    </div>
  );
}
```

### Document Upload Component

```typescript
// src/components/DocumentUpload.tsx
import { useState, useCallback } from 'react';
import { api } from '../api/client';

interface Props {
  claimId: string;
  documentType: string;
  onComplete: (s3Key: string) => void;
}

export function DocumentUpload({ claimId, documentType, onComplete }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const { uploadUrl, s3Key } = await api.getUploadUrl(claimId, documentType, file.name);
      const uploadRes = await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      if (!uploadRes.ok) throw new Error('Upload failed');
      onComplete(s3Key);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [claimId, documentType, onComplete]);

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
      <input type="file" onChange={handleFile} disabled={uploading} className="hidden" id={`upload-${documentType}`} accept="image/*,.pdf" />
      <label htmlFor={`upload-${documentType}`} className="cursor-pointer">
        <p className="text-sm font-medium text-blue-600">{uploading ? 'Uploading...' : `Upload ${documentType.replace(/_/g, ' ')}`}</p>
        <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG up to 10MB</p>
      </label>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}
```

### Role-Based Navigation

```typescript
// src/components/Layout.tsx
import { Link, Outlet } from 'react-router-dom';
import { useUserGroups } from '../hooks/useUserGroups';

export function Layout({ signOut }: { signOut: () => void }) {
  const { groups, isAdmin, isAdjuster } = useUserGroups();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-lg text-blue-900">Claims Portal</span>
          <Link to="/" className="text-sm text-gray-600 hover:text-blue-600">Dashboard</Link>
          <Link to="/chat" className="text-sm text-gray-600 hover:text-blue-600">Chat</Link>
          {(isAdjuster || isAdmin) && (
            <Link to="/review" className="text-sm text-gray-600 hover:text-blue-600">Review Queue</Link>
          )}
        </div>
        <button onClick={signOut} className="text-sm text-gray-500 hover:text-red-600">Sign Out</button>
      </nav>
      <main><Outlet /></main>
    </div>
  );
}
```

### useUserGroups Hook

```typescript
// src/hooks/useUserGroups.ts
import { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

export function useUserGroups() {
  const [groups, setGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuthSession().then(session => {
      const g = (session.tokens?.idToken?.payload['cognito:groups'] as string[]) || [];
      setGroups(g);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return {
    groups,
    loading,
    isAdmin: groups.includes('Admins'),
    isAdjuster: groups.includes('Adjusters'),
    isPolicyHolder: groups.includes('PolicyHolders'),
  };
}
```

---

## Approach 3: FAST Template (AgentCore Fullstack)

**Best for:** Agent-first apps deployed on AgentCore Runtime.

```bash
git clone https://github.com/aws-samples/sample-amazon-bedrock-agentcore-fullstack-webapp.git
cd sample-amazon-bedrock-agentcore-fullstack-webapp
# Follow README for setup
```

Includes: React + Cognito + AgentCore streaming + CDK. Modify the agent and UI to fit your use case.

---

## Streaming Patterns

### Amplify AI Kit (automatic)

Streaming is built-in via AppSync WebSocket. The `useAIConversation` hook handles it — messages update in real-time as tokens arrive.

### Custom (WebSocket via API Gateway)

```typescript
// For real-time streaming without Amplify AI Kit
const ws = new WebSocket(`wss://${API_ID}.execute-api.${REGION}.amazonaws.com/prod`);

ws.onopen = () => {
  ws.send(JSON.stringify({ action: 'sendMessage', message: input, token: authToken }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Append chunk to current message
  setCurrentResponse(prev => prev + data.chunk);
};
```

### Custom (Server-Sent Events via Lambda Function URL)

```typescript
// Simpler than WebSocket for one-way streaming
const response = await fetch(`${API_URL}/chat/stream`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: input }),
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value);
  setCurrentResponse(prev => prev + chunk);
}
```

---

## Deployment

### Amplify Hosting (simplest)

```bash
# Connect repo to Amplify Hosting via console or CLI
npx ampx pipeline-deploy --branch main --app-id <APP_ID>
```

### S3 + CloudFront (CDK)

```python
from aws_cdk import aws_s3 as s3, aws_cloudfront as cf, aws_s3_deployment as s3deploy

bucket = s3.Bucket(self, "FrontendBucket",
    website_index_document="index.html",
    block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
)

distribution = cf.Distribution(self, "FrontendCDN",
    default_behavior=cf.BehaviorOptions(origin=origins.S3BucketOrigin(bucket)),
    default_root_object="index.html",
    error_responses=[cf.ErrorResponse(http_status=404, response_page_path="/index.html", response_http_status=200)],
)

s3deploy.BucketDeployment(self, "DeployFrontend",
    sources=[s3deploy.Source.asset("../frontend/dist")],
    destination_bucket=bucket,
    distribution=distribution,
)
```

---

## Build Checklist

- [ ] Choose approach (Amplify AI Kit, Custom React, or FAST)
- [ ] Set up project (Vite + React + TypeScript + Tailwind)
- [ ] Configure authentication (Authenticator component)
- [ ] Build chat interface (streaming or polling)
- [ ] Build dashboard (claims list, filters, status badges)
- [ ] Implement document upload (presigned URLs)
- [ ] Add role-based navigation and route guards
- [ ] Handle loading states and errors gracefully
- [ ] Set up deployment (Amplify Hosting or S3+CloudFront)
- [ ] Test on mobile viewport (responsive design)
- [ ] Add accessibility (ARIA labels, keyboard navigation)

## Common Mistakes

1. **No loading states** — Users think the app is broken when agent is thinking
2. **Missing error handling** — Network errors crash the app instead of showing a message
3. **Not responsive** — AI apps are often used on mobile; test at 375px width
4. **Hardcoded API URL** — Use environment variables (`VITE_API_ENDPOINT`)
5. **No message persistence** — Refreshing the page loses conversation; use conversation history API or localStorage
6. **Blocking the UI thread** — Long agent responses should stream or show progress
