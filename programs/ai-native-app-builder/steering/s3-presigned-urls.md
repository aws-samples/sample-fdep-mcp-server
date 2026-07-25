---
id: s3-presigned-urls
description: "Verified patterns for S3 presigned URL generation and consumption"
inclusion: auto
match: "aidlc-docs/construction/**"
priority: 91
---

# S3 Presigned URLs — Verified Patterns

## Context

Created after two presigned URL bugs:
1. Used `PutObjectCommand` to generate URLs for photo DISPLAY (should be `GetObjectCommand`)
2. Included `ContentType` in presigned PUT URL signature, but browser `fetch` didn't match the signed header exactly — uploads silently failed

## Rules

### 1. GET vs PUT — match the operation

```typescript
// For UPLOADING (customer puts a file into S3)
const uploadUrl = await getSignedUrl(s3Client, new PutObjectCommand({
  Bucket: PHOTO_BUCKET,
  Key: key,
  // Do NOT include ContentType — browser may send different casing or charset
}), { expiresIn: 300 });

// For VIEWING/DOWNLOADING (agent or customer views the photo)
const viewUrl = await getSignedUrl(s3Client, new GetObjectCommand({
  Bucket: PHOTO_BUCKET,
  Key: key,
}), { expiresIn: 3600 });
```

### 2. Do NOT sign ContentType for browser uploads

When generating presigned PUT URLs for browser `fetch()` uploads:
- Do NOT include `ContentType` in the `PutObjectCommand`
- The browser's `fetch` may send `Content-Type: image/jpeg` with or without charset, or may omit it entirely depending on the `body` type
- If the signed URL includes `ContentType` and the browser sends a slightly different header, the signature check fails silently (403 or no data lands in S3)

```typescript
// WRONG — browser upload will silently fail
new PutObjectCommand({ Bucket, Key, ContentType: 'image/jpeg' })

// CORRECT — let S3 accept any content type
new PutObjectCommand({ Bucket, Key })
```

### 3. KMS-encrypted buckets work automatically with presigned URLs

If the bucket uses SSE-KMS encryption:
- The Lambda's IAM role must have `kms:GenerateDataKey` permission (for PUT)
- The Lambda's IAM role must have `kms:Decrypt` permission (for GET)
- The presigned URL automatically includes the necessary KMS headers
- The browser does NOT need to send any encryption headers — S3 handles it

### 4. CORS for presigned URL uploads

The S3 bucket CORS must allow:
```json
{
  "AllowedHeaders": ["*"],
  "AllowedMethods": ["PUT", "GET"],
  "AllowedOrigins": ["*"],  // Tighten to CloudFront domain for production
  "MaxAgeSeconds": 3600
}
```

### 5. Frontend upload pattern

```typescript
// Step 1: Get presigned URL from your API
const { uploadUrl, key } = await fetch('/claims/upload-url', {
  method: 'POST',
  headers: { Authorization: token, 'Content-Type': 'application/json' },
  body: JSON.stringify({ filename: file.name }),
}).then(r => r.json());

// Step 2: PUT directly to S3 (no Authorization header — presigned URL IS the auth)
await fetch(uploadUrl, {
  method: 'PUT',
  body: file,  // The raw File object — browser sets Content-Type automatically
});

// Step 3: Use the 'key' in your claim submission
await submitClaim({ photoKeys: [key] });
```

### 6. Verify uploads land in S3

After generating and using a presigned URL, always verify the object exists:
```bash
aws s3 ls s3://<bucket>/<key>
```

If the file doesn't appear after a successful PUT (200 response), the signature mismatch is the cause — remove `ContentType` from the presigned URL generation.

## Enforcement

- During Code Generation: verify PUT URLs use `PutObjectCommand` (for uploads) and GET URLs use `GetObjectCommand` (for viewing)
- During Build and Test: include an actual upload + verify test (not mocked)
- Never include `ContentType` in presigned PUT URLs for browser uploads

## Origin

Created: 2026-06-11
Engagement: etihad-baggage
Failures:
1. Agent photo display used PutObjectCommand instead of GetObjectCommand — photos never displayed
2. ContentType in presigned PUT URL caused browser uploads to silently fail — photos never landed in S3, assessment service got "key does not exist"
