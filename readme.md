# Authentication & Authorization Guide

## 🔒 Security Checklist

### Must-Have:

- ✅ httpOnly cookies (prevent XSS)
- ✅ HTTPS only
- ✅ CSRF tokens
- ✅ Rate limiting on auth endpoints
- ✅ Password strength requirements
- ✅ Email verification
- ✅ Secure session expiration

⚠️ Never store plain token (only hashed, like passwords)
⚠️ Token expires in 24 hours (security + urgency)
⚠️ One-time use only (prevents replay attacks)

## 🗄️ Database Design

users
├─ id (UUID primary key)
├─ email (unique, indexed)
├─ email_verified (boolean, default false)
├─ name
├─ avatar_url
├─ created_at
└─ updated_at

accounts
├─ id (UUID primary key)
├─ user_id (foreign key → users.id, ON DELETE CASCADE)
├─ provider ('credentials' | 'google' | 'github')
├─ provider_account_id (unique per provider)
├─ password_hash (only for 'credentials' provider)
├─ created_at
└─ UNIQUE(provider, provider_account_id)

sessions
├─ id (UUID primary key)
├─ user_id (foreign key → users.id, ON DELETE CASCADE)
├─ token (unique, indexed, 64-char random string)
├─ expires_at (timestamp)
├─ ip_address
├─ user_agent
└─ created_at

refresh_tokens (optional but recommended)
├─ id (UUID primary key)
├─ user_id (foreign key → users.id, ON DELETE CASCADE)
├─ token (unique, indexed, 64-char random string)
├─ expires_at (timestamp, 30 days)
├─ created_at
└─ last_used_at

## 1. REGISTRATION PHASE

User Action: Submits registration form
System Actions:

1. User submits: email, password, name
2. Backend validates:
   - Email not already used
   - Name is provided
   - Password meets requirements (min 8 chars, etc.)
3. Hash password with bcrypt (12 rounds)
4. Transaction:
   - INSERT INTO users (email, name, email_verified=false)
   - INSERT INTO accounts (user_id, provider='credentials', password_hash)
5. Generate email verification token
   - Generate secure random token (32-character code)
   - Store HASHED token in database (for security)
   - Send email with verification link containing token
6. Return 201 Created (don't auto-login until verified)

## 2. VERIFICATION PHASE

1. Extract token from URL
2. Hash the incoming token (for comparison)
3. Search database for matching hash
4. CHECK 1: Token exists?
5. CHECK 2: Not expired? (< 24 hours old)
6. CHECK 3: Not already used?
7. CHECK 4: User not already verified?
8. If ALL checks pass → Mark token as used
9. Update user: email_verified = true
10. Delete other tokens for this user (cleanup)
