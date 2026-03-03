# Storage System Architecture

## File Structure

```
src/lib/storage/
├── avatar.ts              # Client-side avatar upload utilities
├── client.ts              # Storage singleton factory (MinIO/Local)
├── config.ts              # Provider configuration
├── image-processing.ts    # Sharp image processing with presets
├── local.ts               # LocalStorage implementation
├── minio-storage.ts       # MinioStorage implementation
├── server.ts              # TanStack server functions
├── service.ts             # Domain business logic
├── types.ts               # TypeScript interfaces
├── upload.ts              # Generic file upload with progress
└── utils.ts               # Validation helpers

src/routes/api/storage/
├── upload.ts              # POST - File upload with processing
├── avatar/$userId.ts      # GET - Avatar serving with caching
└── files/$.ts             # GET - File serving (local storage)

src/hooks/
└── use-file-upload.ts     # Hooks: useAvatar, useFileUpload, etc.
```

## Layer Responsibilities

### 1. Client Layer (`avatar.ts`, `upload.ts`)
- Client-side upload with progress tracking
- Uses XHR for progress events
- Calls server functions for path generation and completion

### 2. Server Layer (`server.ts`)
- Thin TanStack server functions
- Auth middleware integration
- Delegates to service layer
- Functions: `$createAvatarUploadUrl`, `$completeAvatarUpload`, `$deleteAvatar`, `$getUserFiles`, `$deleteFile`, `$getDownloadUrl`

### 3. Service Layer (`service.ts`)
- Domain business logic
- Database operations
- Storage operations
- Functions: `uploadAvatar`, `deleteAvatar`, `uploadFile`, `deleteFile`, `generateStoragePath`, `getPublicUrl`, `getAvatarUrl`, `fileExists`, `getDownloadUrl`

### 4. Processing Layer (`image-processing.ts`)
- Sharp image processing
- Presets: avatar, thumbnail, optimized, preview
- Functions: `processImage`, `processWithPreset`, `processAvatar`, `generateVariants`

### 5. Storage Layer (`client.ts`, `minio-storage.ts`, `local.ts`)
- Storage abstraction
- Provider implementations (MinIO, Local)
- Interface: `IStorage` with upload, delete, exists, getPresignedUrl, etc.

## Constants (src/constants.ts)

```typescript
STORAGE_API = {
  UPLOAD: "/api/storage/upload",
  FILES: "/api/storage/files", 
  AVATAR: (userId) => `/api/storage/avatar/${userId}`,
}

STORAGE_PATHS = {
  AVATAR: "avatar",
  UPLOADS: "uploads",
  ATTACHMENTS: "attachments",
  DOCUMENTS: "documents",
  MEDIA: "media",
}

AVATAR_CONFIG = {
  MAX_SIZE_BYTES: 5MB,
  OUTPUT_SIZE: 256,
  OUTPUT_FORMAT: "webp",
  OUTPUT_QUALITY: 85,
  ALLOWED_TYPES: ["image/jpeg", "image/png", "image/webp", "image/gif"],
}
```

## Avatar Upload Flow

1. **Client**: `uploadAvatar(file)` from `avatar.ts`
2. **Server**: `$createAvatarUploadUrl` generates path
3. **Route**: POST `/api/storage/upload` - Sharp processes to 256x256 webp
4. **Server**: `$completeAvatarUpload` creates DB record, updates user
5. **Inngest**: Optional async variant generation (128px, 512px, avif)
6. **Serving**: GET `/api/storage/avatar/$userId` with ETag caching

## Hooks (use-file-upload.ts)

- `useAvatar()` - Upload/delete avatar with progress
- `useFileUpload(category)` - Upload single file
- `useMultipleFileUpload(category)` - Batch upload
- `useDeleteFile()` - Delete by fileId
- `useUserFiles()` - List user's files
- `useGetDownloadUrl()` - Get presigned URL

## Provider Integration

`better-auth-ui-provider.tsx` uses:
```tsx
avatar={{
  upload: async (file) => {
    const result = await uploadAvatar(file);
    return result.imageUrl;
  },
  delete: async () => {
    await deleteAvatar();
  },
}}
```

Same `uploadAvatar`/`deleteAvatar` work in custom components via `useAvatar()` hook.
