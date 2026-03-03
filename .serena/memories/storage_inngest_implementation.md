# Storage & Inngest Integration - Implementation Complete

## Completed Work

### Storage System Unification

Created a unified storage abstraction supporting three providers (local, minio, r2) controlled by `STORAGE_PROVIDER` env var.

**Files created/modified:**
- `src/lib/storage/config.ts` - Storage configuration factory with `getStorageProvider()`, `getStorageConfig()`, `getMinioConfig()`, `getR2Config()`, `getLocalConfig()`
- `src/lib/storage/local.ts` - `LocalStorage` class implementing `IStorage` interface (uses filesystem with signed URL support)
- `src/lib/storage/minio-storage.ts` - `MinioStorage` class implementing `IStorage` interface
- `src/lib/storage/client.ts` - Updated `getStorage()` to use config-based provider selection
- `src/lib/storage/types.ts` - Added "local" to `StorageProvider` type
- `src/lib/storage/server.ts` - Updated all server functions to use unified `getStorageInstance()`
- `src/routes/api/storage/files/$.ts` - New route to serve local storage files with signed URLs
- `src/routes/api/storage/upload.ts` - Updated to use unified storage
- `src/routes/api/storage/avatar/$userId.ts` - Updated to use unified storage

**Provider selection logic:**
- `STORAGE_PROVIDER=local` (default) - Uses filesystem storage at `LOCAL_STORAGE_PATH`
- `STORAGE_PROVIDER=minio` - Uses MinIO S3-compatible storage
- `STORAGE_PROVIDER=r2` - Uses Cloudflare R2

### Inngest Integration

Fixed broken imports and improved background job functions.

**Files modified:**
- `src/lib/inngest/functions.ts` - Complete rewrite:
  - Uses unified storage via `getStorage()`
  - `fileUploadedFunction` - Image optimization with sharp (thumbnails, webp, avif variants)
  - `userSignedUpFunction` - Sends welcome email + analytics event
  - `userEmailVerifiedFunction` - Logs analytics event
  - `userAvatarUploadedFunction` - Avatar processing with multiple sizes
- `src/lib/inngest/events.ts` - Fixed `FileUploadedPayload` type to include proper fields

### Database Schema

Added analytics event tracking table.

**Added to `src/lib/db/schema/auth.schema.ts`:**
- `analyticsEvent` table with: id, userId, eventName, eventProperties, context, createdAt
- Indexes on userId, eventName, createdAt
- Relations to user table

**Migration generated:** `drizzle/0002_rare_ironclad.sql`

### Account Settings Avatar Upload

Integrated avatar upload into account settings.

**Files created:**
- `src/components/admin/account/AvatarSettingsCard.tsx` - Card component with avatar upload
- Updated `src/components/admin/account/AccountTabs.tsx` - Added AvatarSettingsCard to SettingsTab

**Enhanced existing components:**
- `src/components/File/AvatarUpload.tsx` - Polished with shadcn/ui components, progress indicator, preview
- `src/components/File/FileManager.tsx` - Enhanced file manager with table view
- `src/components/File/index.ts` - Barrel export

### Admin Storage Page

**Created:** `src/routes/(authenticated)/admin/storage.tsx` - Storage management page using FileManager

### Environment Variables

**Added to `.env.example` and `src/env/server.ts`:**
- `STORAGE_PROVIDER` - "local" | "minio" | "r2" (default: "local")
- `LOCAL_STORAGE_PATH` - Path for local storage (default: "./storage")
- `LOCAL_STORAGE_URL_PREFIX` - URL prefix for local files (default: "/api/storage/files")

### Constants

**Added to `src/constants.ts`:**
- `QUERY_KEYS.FILES.LIST` and `QUERY_KEYS.FILES.DETAIL(id)`

## Usage

### Local Storage (Development Default)
No configuration needed. Files stored in `./storage` directory.

### MinIO (Self-hosted S3-compatible)
```env
STORAGE_PROVIDER=minio
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
```

### Cloudflare R2 (Production)
```env
STORAGE_PROVIDER=r2
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
R2_ENDPOINT=https://...r2.cloudflarestorage.com
R2_PUBLIC_URL=https://files.yourapp.com
```

## Storage Architecture Refactoring (Latest)

### New Layered Architecture

The storage system has been refactored into a clean, layered architecture:

```
src/lib/storage/
├── client.ts              # Storage singleton factory (MinIO/Local)
├── config.ts              # Provider configuration
├── types.ts               # Storage interfaces
├── image-processing.ts    # NEW: Generic Sharp service with presets
├── service.ts             # NEW: Domain methods (uploadAvatar, deleteAvatar, etc.)
├── server.ts              # REFACTORED: Thin server functions calling service
├── avatar.ts              # NEW: Client-side avatar upload utilities
└── upload.ts              # Generic file upload with progress

src/hooks/
└── use-file-upload.ts     # Extended with useAvatar() hook
```

### Key Files Created

**`image-processing.ts`** - Sharp image processing service:
- Presets: `avatar` (256x256 webp), `thumbnail` (200x200), `optimized` (1920x1080), `preview` (400x400)
- Functions: `processImage()`, `processWithPreset()`, `processAvatar()`, `generateVariants()`
- Validators: `isAllowedImageType()`, `isAllowedImageSize()`

**`service.ts`** - Domain business logic:
- `uploadAvatar(file, userId)` - Full avatar upload flow with processing
- `deleteAvatar(userId)` - Delete avatar from storage and DB
- `uploadFile(file, category, userId)` - Generic file upload
- `deleteFile(fileId, userId)` - Delete any file
- `generateStoragePath()` - Generate unique paths
- `getPublicUrl()`, `getAvatarUrl()` - URL helpers

**`avatar.ts`** - Client-side avatar utilities:
- `uploadAvatar(file, onProgress)` - Upload with progress tracking
- `deleteAvatar()` - Delete avatar
- `AVATAR_QUERY_KEYS` - Cache invalidation keys

**`server.ts`** - Thin server functions:
- `$createAvatarUploadUrl` - Generate storage path
- `$completeAvatarUpload` - Create DB record, update user
- `$deleteAvatar` - Calls service.deleteAvatar
- `$getDownloadUrl`, `$getUserFiles`, `$deleteFile` - Generic file operations

### Hooks Extended

**`use-file-upload.ts`** now exports:
- `useAvatar()` - Upload/delete avatar with progress, cache invalidation
- `useFileUpload(category)` - Upload files with progress
- `useMultipleFileUpload(category)` - Batch upload
- `useDeleteFile()`, `useUserFiles()`, `useGetDownloadUrl()`

### Provider Simplified

**`better-auth-ui-provider.tsx`** is now just:
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

### Magic Strings Removed

All hardcoded paths now use constants from `src/constants.ts`:
- `STORAGE_API.UPLOAD` - "/api/storage/upload"
- `STORAGE_API.FILES` - "/api/storage/files"
- `STORAGE_API.AVATAR(userId)` - "/api/storage/avatar/{userId}"
- `STORAGE_PATHS.AVATAR`, `STORAGE_PATHS.UPLOADS`, etc.

### Upload Route Simplified

`src/routes/api/storage/upload.ts` is now a thin wrapper:
- Auth check
- Form data parsing
- Path validation
- Calls `processAvatar()` from image-processing for avatars
- Uploads via storage client

### Benefits

1. **Reusability**: Same `uploadAvatar`/`deleteAvatar` works in provider AND custom components
2. **Testability**: Service layer can be unit tested independently
3. **Separation of Concerns**: Routes thin, business logic in services
4. **Type Safety**: All functions properly typed
5. **No Magic Strings**: Constants centralized

## Remaining Work
- Test avatar upload end-to-end with new architecture
- Debug "fetch failed" error (likely MinIO connection or stream issue)
- Ensure MinIO container is running (`docker-compose up minio`)