---
id: csp-s3-images
description: "Content Security Policy configuration for S3 presigned URL image sources"
inclusion: auto
match: "aidlc-docs/construction/**"
priority: 89
---

# CSP Must Allow S3 Presigned URL Image Sources

## Context

Created after images failed to display in both customer portal and agent dashboard despite presigned URLs being valid and returning 200 from curl. The browser silently blocked image loads due to Content-Security-Policy violation — the `img-src` directive only allowed `'self'` but the images were served from an S3 presigned URL on a different origin.

This is a silent failure — no JavaScript error, no network error in the console (unless you check the CSP violation tab), just a broken image icon.

## Rule

When generating CloudFront response headers policy with Content-Security-Policy:

### 1. If the app displays images from S3 presigned URLs, include S3 in img-src

```typescript
// WRONG — images from S3 presigned URLs will silently fail
"img-src 'self' data: blob:"

// CORRECT — allow the S3 bucket origin
"img-src 'self' data: blob: https://*.s3.<region>.amazonaws.com"
```

### 2. If the app uploads to S3 via presigned URLs, include S3 in connect-src

```typescript
// MUST include S3 for both fetch() API calls AND presigned URL uploads
"connect-src 'self' https://*.amazonaws.com https://*.amazoncognito.com"
// The *.amazonaws.com wildcard covers S3, API Gateway, Cognito, and Bedrock
```

### 3. CSP checklist for typical FDE apps

| Directive | Minimum for PoC | Why |
|-----------|-----------------|-----|
| `default-src` | `'self'` | Baseline |
| `script-src` | `'self'` | No inline scripts |
| `style-src` | `'self' 'unsafe-inline'` | Tailwind + Amplify UI needs inline styles |
| `img-src` | `'self' data: blob: https://*.s3.<region>.amazonaws.com` | Photos from S3 |
| `connect-src` | `'self' https://*.amazonaws.com https://*.amazoncognito.com` | API + Auth + S3 uploads |
| `font-src` | `'self'` | Local fonts |
| `object-src` | `'none'` | Block Flash/plugins |
| `frame-ancestors` | `'none'` | Prevent clickjacking |

### 4. How to detect this failure

- Image `<img>` tag shows broken icon or alt text
- Network tab shows NO failed request (CSP blocks before request)
- Console shows CSP violation: `Refused to load the image 'https://...s3...' because it violates the Content-Security-Policy directive: "img-src 'self' data: blob:"`
- Curl to the same URL returns 200 with image data (proving the URL works)

### 5. Why this is easy to miss

- The `<img>` tag fails silently — no JavaScript error thrown
- The presigned URL is valid (verified by curl)
- The S3 CORS is configured correctly
- The IAM permissions are correct
- Only the CSP header (set at CloudFront level, not in the application code) is blocking it
- Developers testing locally (without CloudFront) won't hit this — it only manifests in production/staging

## When this applies

- Any app that stores user-uploaded files in S3 and displays them via presigned GET URLs
- Both the customer-facing app AND the agent/admin app (they share the same headers policy)
- Any CloudFront distribution with security headers enabled

## Enforcement

During Infrastructure Design, when defining CloudFront response headers:
1. Check if the app displays images/files from S3
2. If yes, include the S3 bucket's domain in `img-src`
3. For cross-region setups, include both regions: `https://*.s3.<region1>.amazonaws.com https://*.s3.<region2>.amazonaws.com`

## Rationale

This rule exists because a CloudFront CSP `img-src 'self' data: blob:` directive
that omits the S3 origin silently blocks images served from S3 presigned URLs —
the presigned GET URL is valid (curl returns 200) but the browser refuses the
load with only a CSP-violation entry and a broken-image icon. Adding the S3
origin (e.g. `https://*.s3.<region>.amazonaws.com`) to `img-src` fixes it.
