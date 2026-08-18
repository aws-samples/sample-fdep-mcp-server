# Layer 6 — UI Design System Reference

## Purpose

Implementation-ready design system patterns for AI application frontends. This reference provides component code, layout patterns, and domain-specific UI recipes that ensure every PoC looks production-grade from day one.

---

## 1. Tailwind CSS Configuration (Design Tokens)

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        brand: {
          50: 'hsl(214, 100%, 97%)',
          100: 'hsl(214, 95%, 93%)',
          200: 'hsl(214, 90%, 86%)',
          300: 'hsl(214, 87%, 74%)',
          400: 'hsl(214, 85%, 65%)',
          500: 'hsl(214, 84%, 56%)',
          600: 'hsl(214, 84%, 46%)',
          700: 'hsl(214, 84%, 36%)',
          800: 'hsl(214, 84%, 26%)',
          900: 'hsl(214, 84%, 16%)',
        },
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        'elevated': '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
      },
      animation: {
        'shimmer': 'shimmer 2s infinite linear',
        'slide-in': 'slideIn 200ms ease-out',
        'fade-in': 'fadeIn 150ms ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
```

---

## 2. Core UI Components

### Loading Skeleton

```tsx
// src/components/Skeleton.tsx
interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className = '', lines = 1 }: SkeletonProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-md bg-gray-100 h-4"
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-200 to-transparent animate-shimmer" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg border p-6 space-y-4">
      <Skeleton className="w-1/3 h-6" />
      <Skeleton lines={3} />
      <div className="flex gap-2 pt-2">
        <Skeleton className="w-20 h-8 rounded-md" />
        <Skeleton className="w-20 h-8 rounded-md" />
      </div>
    </div>
  );
}
```

### Empty State

```tsx
// src/components/EmptyState.tsx
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="text-gray-300 mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
```

### Status Badge

```tsx
// src/components/StatusBadge.tsx
const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  review: 'bg-purple-50 text-purple-700 border-purple-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status.toLowerCase()] ?? 'bg-gray-50 text-gray-700 border-gray-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
```

### Metric Card

```tsx
// src/components/MetricCard.tsx
interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: { direction: 'up' | 'down' | 'flat'; value: string };
  icon?: React.ReactNode;
}

export function MetricCard({ label, value, trend, icon }: MetricCardProps) {
  const trendColor = trend?.direction === 'up' ? 'text-green-600' : trend?.direction === 'down' ? 'text-red-600' : 'text-gray-500';

  return (
    <div className="bg-white rounded-lg border p-5 shadow-card hover:shadow-card-hover transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500 font-medium">{label}</span>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {trend && (
          <span className={`text-xs font-medium ${trendColor}`}>
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}
```

### Progress Stepper (Multi-Step Workflows)

```tsx
// src/components/Stepper.tsx
interface Step {
  id: string;
  label: string;
  status: 'completed' | 'current' | 'upcoming';
}

export function Stepper({ steps }: { steps: Step[] }) {
  return (
    <nav className="flex items-center gap-2" aria-label="Progress">
      {steps.map((step, idx) => (
        <div key={step.id} className="flex items-center">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold
            ${step.status === 'completed' ? 'bg-brand-600 text-white' : ''}
            ${step.status === 'current' ? 'bg-brand-100 text-brand-700 border-2 border-brand-600' : ''}
            ${step.status === 'upcoming' ? 'bg-gray-100 text-gray-400' : ''}
          `}>
            {step.status === 'completed' ? '✓' : idx + 1}
          </div>
          <span className={`ml-2 text-sm font-medium
            ${step.status === 'current' ? 'text-brand-700' : 'text-gray-500'}
          `}>
            {step.label}
          </span>
          {idx < steps.length - 1 && (
            <div className={`mx-3 h-px w-8
              ${step.status === 'completed' ? 'bg-brand-600' : 'bg-gray-200'}
            `} />
          )}
        </div>
      ))}
    </nav>
  );
}
```

### Toast Notification

```tsx
// src/components/Toast.tsx
import { useEffect, useState } from 'react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

const ICONS = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
const STYLES = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
};

export function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 w-80">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className={`animate-slide-in flex items-center gap-3 px-4 py-3 rounded-lg border shadow-elevated ${STYLES[toast.type]}`}>
      <span className="text-lg">{ICONS[toast.type]}</span>
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button onClick={onDismiss} className="text-current opacity-50 hover:opacity-100">✕</button>
    </div>
  );
}
```

---

## 3. Page Layout Patterns

### Sidebar Layout (4+ routes)

```tsx
// src/layouts/SidebarLayout.tsx
export function SidebarLayout({ children, nav }: { children: React.ReactNode; nav: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="h-14 flex items-center px-6 border-b">
          <span className="text-lg font-bold text-brand-900">KYC Portal</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">{nav}</nav>
        <div className="border-t p-4">
          <button className="text-sm text-gray-500 hover:text-red-600 w-full text-left">Sign Out</button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
```

### Dashboard Grid

```tsx
// src/pages/Dashboard.tsx
export function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Metrics row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Pending Reviews" value={12} trend={{ direction: 'down', value: '3 this week' }} />
        <MetricCard label="Avg. Processing Time" value="4.2 min" trend={{ direction: 'up', value: '0.3 min' }} />
        <MetricCard label="Approved Today" value={28} />
        <MetricCard label="Escalated" value={3} trend={{ direction: 'flat', value: 'unchanged' }} />
      </div>

      {/* Content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Table or main content */}
        </div>
        <div>
          {/* Activity feed or sidebar widget */}
        </div>
      </div>
    </div>
  );
}
```

---

## 4. Banking / KYC-Specific Patterns

### Document Verification Card

```tsx
// src/components/DocumentCard.tsx
interface DocumentCardProps {
  type: string;
  fileName: string;
  status: 'verified' | 'pending' | 'rejected' | 'uploading';
  confidence?: number;
  onView: () => void;
}

export function DocumentCard({ type, fileName, status, confidence, onView }: DocumentCardProps) {
  return (
    <div className="bg-white border rounded-lg p-4 flex items-center gap-4 hover:shadow-card-hover transition-shadow">
      <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
        📄
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{type}</p>
        <p className="text-xs text-gray-500 truncate">{fileName}</p>
      </div>
      {confidence !== undefined && (
        <div className="text-right">
          <p className="text-xs text-gray-500">Confidence</p>
          <p className={`text-sm font-bold ${confidence >= 90 ? 'text-green-600' : confidence >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
            {confidence}%
          </p>
        </div>
      )}
      <StatusBadge status={status} />
      <button onClick={onView} className="text-sm text-brand-600 hover:text-brand-700 font-medium">View</button>
    </div>
  );
}
```

### SLA Gauge

```tsx
// src/components/SlaGauge.tsx
interface SlaGaugeProps {
  label: string;
  elapsed: number; // minutes
  target: number;  // minutes
}

export function SlaGauge({ label, elapsed, target }: SlaGaugeProps) {
  const percentage = Math.min((elapsed / target) * 100, 100);
  const color = percentage < 60 ? 'bg-green-500' : percentage < 85 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600 font-medium">{label}</span>
        <span className="text-gray-500">{elapsed} / {target} min</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
```

### HITL Escalation Queue Item

```tsx
// src/components/EscalationItem.tsx
interface EscalationItemProps {
  id: string;
  customerName: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  waitTime: string;
  onClaim: () => void;
}

export function EscalationItem({ customerName, reason, priority, waitTime, onClaim }: EscalationItemProps) {
  const priorityStyles = {
    high: 'border-l-red-500',
    medium: 'border-l-yellow-500',
    low: 'border-l-blue-500',
  };

  return (
    <div className={`bg-white border rounded-lg border-l-4 ${priorityStyles[priority]} p-4 flex items-center gap-4 hover:shadow-card-hover transition-shadow`}>
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-900">{customerName}</p>
        <p className="text-xs text-gray-500 mt-0.5">{reason}</p>
      </div>
      <div className="text-right mr-4">
        <p className="text-xs text-gray-400">Waiting</p>
        <p className="text-sm font-medium text-gray-700">{waitTime}</p>
      </div>
      <button
        onClick={onClaim}
        className="px-3 py-1.5 bg-brand-600 text-white text-xs font-medium rounded-md hover:bg-brand-700 transition-colors"
      >
        Claim
      </button>
    </div>
  );
}
```

---

## 5. AWS Reference Implementations

| Reference | URL | What it demonstrates |
|-----------|-----|---------------------|
| Amplify UI (Design System) | https://github.com/aws-amplify/amplify-ui | Themeable, accessible React components with design token system |
| Amplify UI Theming Docs | https://ui.docs.amplify.aws/react/theming | How to apply custom themes, token overrides, dark mode |
| AgentCore Fullstack Webapp | https://github.com/aws-samples/sample-amazon-bedrock-agentcore-fullstack-webapp | Complete agent UI with chat, auth, streaming |
| Amplify Vite React Template | https://github.com/aws-samples/amplify-vite-react-template | Minimal starter with Vite + React + Amplify |
| Bedrock Claude3 UI | https://github.com/aws-samples/aws-bedrock-claude3-ui | Chat UI patterns for Bedrock models |
| Amplify AI Kit Docs | https://docs.amplify.aws/react/ai/ | AI conversation components, streaming, tool use |
| Amplify Connected Components | https://ui.docs.amplify.aws/react/connected-components | Pre-built auth, storage, and AI components |
| AWS Cloudscape Design System | https://cloudscape.design | Enterprise-grade React components (used in AWS Console) |

### When to Use Which

| Use Case | Recommended Library |
|----------|-------------------|
| Fastest path, AI chat focus | Amplify UI + AI Kit |
| Enterprise-grade, data-heavy dashboards | AWS Cloudscape |
| Full custom, maximum flexibility | Tailwind + Headless UI / Radix |
| Banking/financial with strict branding | Tailwind + custom component library |

---

## 6. Design Quality Checklist

Before presenting any UI to a customer (even PoC):

- [ ] All pages have loading skeletons (no blank screens)
- [ ] Empty states have illustrations/icons + CTAs
- [ ] Errors show friendly messages + retry options
- [ ] Navigation shows current location
- [ ] Tables have sort, pagination, and row hover
- [ ] Forms validate on blur with inline messages
- [ ] Buttons show loading state during async operations
- [ ] Color contrast passes WCAG 2.1 AA (4.5:1 ratio)
- [ ] Focus rings visible on keyboard navigation
- [ ] Responsive at 375px, 768px, and 1280px
- [ ] Transitions are 150-200ms (not jarring, not sluggish)
- [ ] Toast notifications for success/error feedback
- [ ] No raw JSON, stack traces, or developer artifacts visible

---

## 7. Anti-Patterns to Avoid

| Anti-pattern | Fix |
|---|---|
| Bare `<table>` with no styling | Use card-based table with hover, sort, pagination |
| `alert()` or `console.log` for user feedback | Use toast notification component |
| Spinner only (no context) | Use skeleton with content-shaped placeholders |
| Hardcoded colors like `#3b82f6` | Use design tokens via Tailwind config or CSS variables |
| No empty state — just blank space | Always show an illustration + explanation + CTA |
| Full-width content on large screens | Max-width constraint (1280px) with centered layout |
| Dense text walls | Use whitespace, headers, cards to break up information |
| Unstyled `<input>` elements | Consistent border, radius, focus ring, label placement |
