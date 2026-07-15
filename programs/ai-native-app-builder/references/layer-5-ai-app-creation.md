# Layer 5 — AI App Creation

## Purpose

Human-in-the-loop layer — build and manage AI applications with web/mobile frontends. This covers the user-facing experience: authentication flows, dashboards, chat interfaces, document upload, and role-based views.

## Coverage: 55% (Moderate — fullstack template exists, component library is partial)

## Capabilities

### 1. App Builder / Blueprints (Fullstack Webapp)

**Coverage:** 🟢 Agentic #38

| Resource | Link |
|----------|------|
| AgentCore Fullstack Webapp | https://github.com/aws-samples/sample-amazon-bedrock-agentcore-fullstack-webapp |
| FAST (Fullstack AgentCore Solution Template) | https://aws.amazon.com/blogs/machine-learning/accelerate-agentic-application-development-with-a-full-stack-starter-template-for-amazon-bedrock-agentcore/ |
| Amplify Gen2 Quickstart | https://docs.amplify.aws/react/start/quickstart/ |

**FAST template includes:**
- React frontend with Vite
- Amazon Cognito authentication
- AgentCore Runtime integration
- Real-time streaming chat
- CDK infrastructure
- Observability built-in

**Two approaches:**

| Approach | When to Use | Pros | Cons |
|----------|-------------|------|------|
| FAST (AgentCore) | Agent-first apps, complex multi-tool agents | Full AgentCore integration, streaming, memory | Heavier setup |
| Amplify Gen2 | CRUD apps with AI features, rapid prototyping | Fastest to deploy, managed hosting, built-in auth | Less agent control |

### 2. Web & Mobile Native Apps

**Coverage:** 🔵 Accel #41

| Resource | Link |
|----------|------|
| Amplify Gen2 (React) | https://docs.amplify.aws/react/ |
| Amplify UI Components | https://ui.docs.amplify.aws/react |
| React SPA with Cognito | https://github.com/aws-samples/aws-react-spa-with-cognito-auth |

**Standard tech stack for AI apps:**

```
React (Vite) + TypeScript
├── @aws-amplify/ui-react (Authenticator, StorageBrowser, FileUploader)
├── Tailwind CSS (styling)
├── React Router (navigation)
├── aws-amplify (auth, API calls)
└── Deployed via: Amplify Hosting OR S3 + CloudFront
```

**Key UI patterns for AI apps:**

| Pattern | Component | Purpose |
|---------|-----------|---------|
| Chat Interface | Custom | Conversational agent interaction |
| Authenticator | `@aws-amplify/ui-react` | Login/signup/MFA flows |
| File Upload | `FileUploader` or presigned URLs | Document submission |
| Dashboard | Custom + data tables | Status overview, metrics |
| Role-based Nav | Custom with `cognito:groups` | Show/hide based on user role |
| Streaming Response | EventSource / WebSocket | Real-time agent output |

### 3. Drag & Drop / Intelligent App Studio

**Coverage:** 🟠 Partial

| Resource | Link |
|----------|------|
| GAAB (Generative AI App Builder) | https://github.com/aws-solutions/generative-ai-application-builder-on-aws |

No true low-code/no-code builder exists. GAAB is the closest — deploys a configurable chatbot with RAG.

### 4. OOTB Components

**Coverage:** 🟠 Partial

Bedrock chat widgets exist but no full component library for agentic UIs. Build custom components for:
- Agent response rendering (markdown, code blocks, tool results)
- Approval/rejection buttons for HITL
- Document status cards
- Claim/task timeline views

## Frontend Architecture

### Recommended Structure

```
frontend/
├── src/
│   ├── main.tsx                    # Amplify.configure()
│   ├── App.tsx                     # Authenticator + Router
│   ├── api/
│   │   └── client.ts              # Authenticated API calls
│   ├── hooks/
│   │   ├── useAuth.ts             # User session + groups
│   │   ├── useChat.ts             # Agent chat state
│   │   └── useData.ts             # Data fetching
│   ├── components/
│   │   ├── Layout.tsx             # Shell + navigation
│   │   ├── ProtectedRoute.tsx     # Role guard
│   │   ├── ChatPanel.tsx          # Agent conversation
│   │   ├── FileUpload.tsx         # Document upload
│   │   └── StatusBadge.tsx        # Status indicators
│   └── pages/
│       ├── Dashboard.tsx
│       ├── Detail.tsx
│       ├── Chat.tsx
│       └── Admin.tsx
├── amplify/                        # If using Amplify Gen2
│   ├── backend.ts
│   └── auth/resource.ts
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

### Authentication Pattern

```typescript
// App.tsx
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <Layout user={user} signOut={signOut}>
          <Routes />
        </Layout>
      )}
    </Authenticator>
  );
}
```

### Role-Based Access

```typescript
// hooks/useAuth.ts
import { fetchAuthSession } from 'aws-amplify/auth';

export function useUserRole() {
  const [role, setRole] = useState<string>('user');

  useEffect(() => {
    fetchAuthSession().then((session) => {
      const groups = session.tokens?.idToken?.payload['cognito:groups'] as string[] || [];
      if (groups.includes('Admins')) setRole('admin');
      else if (groups.includes('Operators')) setRole('operator');
      else setRole('user');
    });
  }, []);

  return role;
}
```

### Authenticated API Client

```typescript
// api/client.ts
import { fetchAuthSession } from 'aws-amplify/auth';

const API_URL = import.meta.env.VITE_API_ENDPOINT;

export async function apiCall(path: string, options: RequestInit = {}) {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  }).then(r => r.json());
}
```

## Deployment Options

| Option | Best For | Setup |
|--------|----------|-------|
| Amplify Hosting | Fastest, auto CI/CD from Git | `amplify deploy` |
| S3 + CloudFront | Full control, custom domains | CDK `BucketDeployment` + `Distribution` |
| Vercel/Netlify | If team already uses them | Connect to repo |

## Build Checklist

- [ ] Choose approach: FAST template, Amplify Gen2, or custom React
- [ ] Set up authentication (Authenticator component)
- [ ] Define user roles and navigation
- [ ] Build chat interface for agent interaction
- [ ] Implement file upload (presigned URLs or Amplify Storage)
- [ ] Create dashboard with data tables
- [ ] Add role-based route protection
- [ ] Configure deployment (Amplify Hosting or S3+CloudFront)
- [ ] Set up environment variables for API endpoint

## Common Mistakes

1. **Missing `@aws-amplify/ui-react/styles.css` import** — Authenticator renders as unstyled HTML
2. **Calling `Amplify.configure()` in a component** — Must be in entry point (`main.tsx`)
3. **Not handling token refresh** — Amplify handles this, but custom fetch wrappers may not
4. **Blocking UI during agent response** — Use streaming or show loading state
5. **No error boundaries** — Agent errors should show user-friendly messages, not crash the app
