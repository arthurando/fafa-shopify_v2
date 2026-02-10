# Authentication Setup Guide

## Overview
Phase A: Authentication Foundation has been implemented. This adds user authentication with JWT tokens and role-based access control (admin/user).

## What's Implemented

### 1. Database Schema
- **Table:** `fafa_users`
  - `id` (UUID, primary key)
  - `mobile` (TEXT, unique) - Login username
  - `password_hash` (TEXT) - bcrypt hashed password
  - `display_name` (TEXT, nullable)
  - `role` (TEXT) - 'admin' or 'user'
  - `is_active` (BOOLEAN) - Account status
  - `created_at`, `updated_at` (TIMESTAMPTZ)

### 2. Authentication Library
- **File:** `src/lib/auth.ts`
- **Functions:**
  - `hashPassword()` - Hash passwords with bcrypt
  - `verifyPassword()` - Verify password against hash
  - `signJWT()` - Generate JWT tokens
  - `verifyJWT()` - Verify JWT tokens
  - `authGuard()` - Middleware to require authentication
  - `requireAdmin()` - Middleware to require admin role
  - `setAuthCookie()` / `clearAuthCookie()` - Cookie management
  - `getCurrentUser()` - Get current user from cookie

### 3. API Routes
- **POST /api/auth/login** - Login with mobile/password, returns JWT in httpOnly cookie
- **POST /api/auth/logout** - Clear auth cookie
- **GET /api/auth/me** - Get current user info
- **GET /api/auth/users** - List all users (admin only)
- **POST /api/auth/users** - Create new user (admin only)

### 4. UI Components
- **Login Page:** `/login` - Mobile-first responsive login form
- **Auth Provider:** `src/components/AuthProvider.tsx` - React context for authentication state
- **User Management:** Added to Settings page (admin only) - create/list users, logout button

### 5. Middleware
- **File:** `src/middleware.ts`
- Protects all routes except `/login` and `/api/auth/login`
- Redirects unauthenticated users to login page

### 6. Protected API Routes
Added `authGuard()` to existing routes:
- `/api/settings`
- `/api/sets`
- `/api/products/create`

## Manual Setup Required

### Step 1: Apply Database Migration
The migration file is ready at: `supabase/migrations/008_authentication.sql`

**Option A: Supabase Studio**
1. Go to https://supabase.com/dashboard/project/kzmxikzjnumwbbiwgvfu/sql/new
2. Copy and paste the contents of `008_authentication.sql`
3. Click "Run"

**Option B: Command Line (if psql available)**
```bash
psql "postgresql://postgres.[YOUR-PASSWORD]@db.kzmxikzjnumwbbiwgvfu.supabase.co:5432/postgres" -f supabase/migrations/008_authentication.sql
```

### Step 2: Seed Admin User
After migration is applied, run:
```bash
npx tsx scripts/seed-admin.ts
```

This creates the admin user:
- **Mobile:** `sttmall`
- **Password:** `STTMall520!@#$`

### Step 3: Add Environment Variable to Vercel
1. Go to Vercel project settings: https://vercel.com/arthurs-projects-7ad87361/fafa-shopify/settings/environment-variables
2. Add new variable:
   - **Name:** `JWT_SECRET`
   - **Value:** Generate a random 64-character string (you can use: `openssl rand -base64 48` or any password generator)
   - **Environment:** Production, Preview, Development
3. Redeploy the app

### Step 4: Test Authentication
1. Navigate to your app (will redirect to /login)
2. Login with:
   - Mobile: `sttmall`
   - Password: `STTMall520!@#$`
3. Should redirect to home page
4. Go to Settings page:
   - See "User Management" section (admin only)
   - Create additional users
   - Logout button at bottom

## Security Features
- Passwords hashed with bcrypt (10 rounds)
- JWT tokens signed with HS256 algorithm
- Tokens stored in httpOnly cookies (not accessible to JavaScript)
- 7-day token expiration
- Role-based access control (admin/user)
- All API routes protected by authentication middleware

## Architecture Decisions
- **bcryptjs:** Used instead of bcrypt for Edge runtime compatibility
- **jose:** Used instead of jsonwebtoken for Edge runtime compatibility
- **Cookie-based auth:** More secure than localStorage for JWT storage
- **Middleware protection:** Next.js middleware for route-level protection

## Next Steps
After authentication is deployed:
- Phase B: Settings Enhancements + Product Title
- Phase C: Two-Level Variants (Color × Size)
- Phase E: Enhanced Pricing & Margin Calculation
- Phase F: Inventory Management Tab
