🗄️ Database Schema (Approach #2 - Production)
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

🔐 Why This Schema?

Separation of concerns:

users = identity (who you are)
accounts = authentication methods (how you prove who you are)
sessions = authorization (what you can do right now)

Multiple auth methods:

User can link Google + Email/Password
If Google email matches existing email account, merge them

Security:

Password hash only stored for credentials provider
Sessions can be invalidated individually
Refresh tokens allow short-lived access tokens

Flexibility:

Easy to add GitHub, Twitter, etc.
Can enforce email verification per provider
Track device/location per session

🎫 Session Strategy: Hybrid (Most Secure)
Two-Token System:
Access Token (Short-lived):

Lives in httpOnly cookie
Expires in 15 minutes
Used for every request
Stored as JWT (contains user_id, role)

Refresh Token (Long-lived):

Stored in database
Expires in 30 days
Used only to get new access tokens
Rotates on each use (one-time use)

Why Hybrid?

Short access token = Security

If stolen, only valid for 15 minutes
Contains minimal data

Long refresh token = UX

User stays logged in for 30 days
Can invalidate from database (logout works)

Refresh rotation = Extra security

Each refresh token used once
If reused, indicates token theft → invalidate all sessions

🔑 Authentication Flow
Email/Password Registration:

1. User submits: email, password, name
2. Backend validates:
   - Email not already used
   - Password meets requirements (min 8 chars, etc.)
3. Hash password with bcrypt (12 rounds)
4. Transaction:
   - INSERT INTO users (email, name, email_verified=false)
   - INSERT INTO accounts (user_id, provider='credentials', password_hash)
5. Generate email verification token
6. Send verification email
7. Return 201 Created (don't auto-login until verified)
   Email/Password Login:
8. User submits: email, password
9. Backend:
   - Find user by email
   - Find account with provider='credentials'
   - Compare password with bcrypt
   - Check if email_verified = true
10. If valid:
    - Generate access token (JWT, 15min)
    - Generate refresh token (random, 30 days)
    - INSERT INTO sessions (user_id, token=access_token, expires_at)
    - INSERT INTO refresh_tokens (user_id, token, expires_at)
    - Set httpOnly cookies: accessToken, refreshToken
11. Return user data
    Google OAuth:
12. User clicks "Sign in with Google"
13. Frontend redirects to: /api/auth/google
14. Backend redirects to Google OAuth URL
15. User approves
16. Google redirects to: /api/auth/callback/google?code=abc123
17. Backend:
    - Exchange code for access_token + id_token
    - Decode id_token to get: google_id, email, name, avatar
    - Check if account exists: SELECT \* FROM accounts WHERE provider='google' AND provider_account_id=google_id
    - If exists:
      - Get user_id
    - If not exists:
      - Check if email already used
      - If yes: Link to existing user (UPDATE or INSERT account)
      - If no: Create new user + account
    - Generate access + refresh tokens
    - Set cookies
18. Redirect to: /dashboard

🛡️ Authorization (Role-Based Access Control)
Roles Table Setup:
sqlINSERT INTO roles (name, permissions) VALUES
('user', '["posts.read", "posts.create"]'),
('editor', '["posts.read", "posts.create", "posts.edit", "posts.delete"]'),
('admin', '["*"]');

-- Assign role to user
INSERT INTO user_roles (user_id, role_id) VALUES (user_uuid, role_uuid);

```

### **Backend Authorization Middleware:**
```

1. Extract access token from cookie
2. Verify JWT signature
3. Check if not expired
4. Decode to get user_id
5. Lookup user in database:
   - Get roles
   - Get permissions
6. Attach to req.user = { id, email, roles, permissions }
7. Next middleware checks permissions:
   - requirePermission('posts.delete')
   - requireRole('admin')

```

### **Middleware Chain:**
```

Request → authenticate() → authorize(['posts.delete']) → controller

```

**authenticate()**: Verifies token, loads user
**authorize()**: Checks if user has required permission

---

## 🔄 **Token Refresh Flow**
```

1. Frontend makes API request
2. Backend returns 401 Unauthorized (access token expired)
3. Frontend automatically calls: POST /api/auth/refresh
   - Sends refresh token (from httpOnly cookie)
4. Backend:
   - Validate refresh token from database
   - Check not expired
   - Generate NEW access token (15min)
   - Generate NEW refresh token (rotation)
   - Delete old refresh token
   - INSERT new refresh token
   - Set new cookies
5. Frontend retries original request with new access token
6. Success

```

**Important:** If refresh token is invalid/expired → logout user

---

## 🎨 **Frontend Implementation**

### **Structure:**
```

context/
AuthContext.tsx # Global auth state
hooks/
useAuth.ts # Access auth context
useUser.ts # Get current user
useLogin.ts # Login mutation
useLogout.ts # Logout mutation
useRegister.ts # Register mutation
middleware/
auth-middleware.ts # Next.js middleware for protected routes
lib/
api-client.ts # Axios/Fetch wrapper with auto-refresh
Auth Context Pattern:
typescript// Stores:

- user: User | null
- isLoading: boolean
- isAuthenticated: boolean

// Methods:

- login(email, password)
- loginWithGoogle()
- logout()
- refreshUser()

```

### **API Client with Auto-Refresh:**
```

Every API request:

1. Include credentials (cookies sent automatically)
2. If 401 response:
   - Call /api/auth/refresh
   - Retry original request
   - If refresh fails: logout user
     Protected Routes (Next.js Middleware):
     typescript// middleware.ts
     export function middleware(request) {
     const token = request.cookies.get('accessToken')

if (!token) {
return redirect('/login')
}

// Verify JWT
const decoded = verifyJWT(token)

if (!decoded || expired) {
return redirect('/login')
}

// Check permissions for route
if (request.nextUrl.pathname.startsWith('/admin')) {
if (!decoded.roles.includes('admin')) {
return redirect('/unauthorized')
}
}

return NextResponse.next()
}

export const config = {
matcher: ['/dashboard/:path*', '/admin/:path*']
}

```

---

## 🔒 **Security Measures**

### **1. httpOnly Cookies:**
- Access token in httpOnly cookie (JavaScript can't access)
- Refresh token in httpOnly cookie
- Secure flag (HTTPS only)
- SameSite=Strict (CSRF protection)

### **2. CSRF Protection:**
- Even with httpOnly cookies, need CSRF tokens
- Generate CSRF token per session
- Include in forms/requests
- Verify on backend

### **3. Rate Limiting:**
```

Login endpoint: 5 attempts per 15 minutes per IP
Register endpoint: 3 attempts per hour per IP
Refresh endpoint: 10 attempts per minute per user 4. Password Requirements:

Minimum 8 characters
At least 1 uppercase, 1 lowercase, 1 number
Check against common passwords list
Bcrypt with 12 rounds

5. Session Security:

Store IP address and user agent
Alert on login from new location/device
"Active sessions" page (view all, logout from each)

6. Token Security:

Access token: 15 minutes (short as possible)
Refresh token: 30 days, one-time use, rotation
Signed JWTs with RS256 (asymmetric, more secure)

🔐 Authorization Patterns
Permission-Based (Granular):
typescript// Backend
requirePermission('posts.delete')

// Database
user → user_roles → roles → permissions ['posts.delete']

// Check
if (user.permissions.includes('posts.delete')) allow()
Role-Based (Simpler):
typescript// Backend
requireRole('admin')

// Check
if (user.roles.includes('admin')) allow()
Hybrid (Best):
typescript// Admin can do anything
if (user.roles.includes('admin')) allow()

// Otherwise check specific permission
if (user.permissions.includes('posts.delete')) allow()
Resource-Based (Most Complex):
typescript// User can only delete their own posts
const post = await getPost(id)
if (post.author_id === user.id || user.roles.includes('admin')) {
allow()
}

```

---

## 🎯 **Complete Auth/Authz Flow Example**

### **Scenario: User wants to delete a post**
```

1. Frontend: User clicks "Delete" button
2. Frontend checks: Can I delete? (client-side, UX only)
   - Check user.permissions.includes('posts.delete')
   - If no, hide button
3. Frontend calls: DELETE /api/posts/123
   - Sends accessToken cookie automatically
4. Backend Middleware Chain:
   a. authenticate()
   - Extract token from cookie
   - Verify JWT
   - Load user from DB (with roles/permissions)
   - Attach to req.user
     b. authorize(['posts.delete'])
   - Check req.user.permissions.includes('posts.delete')
   - If no: return 403 Forbidden
     c. resourceOwnership() (optional)
   - Get post.author_id
   - Check if req.user.id === post.author_id OR req.user.roles.includes('admin')
   - If no: return 403 Forbidden
5. Controller: deletePost()
   - Delete from database
   - Return 204 No Content
6. Frontend: Update UI (remove post from list)

```

---

## 🔄 **What Happens When:**

### **Access Token Expires (Every 15 min):**
```

1. API call fails with 401
2. Frontend calls /api/auth/refresh (sends refresh token)
3. Backend:
   - Validate refresh token
   - Generate new access + refresh tokens
   - Rotate refresh token
4. Retry original request
5. Success

```

### **Refresh Token Expires (After 30 days):**
```

1. API call fails with 401
2. Frontend calls /api/auth/refresh
3. Backend returns 401 (refresh token invalid)
4. Frontend logs out user
5. Redirect to /login

```

### **User Clicks Logout:**
```

1. Frontend calls /api/auth/logout
2. Backend:
   - Delete session from database
   - Delete refresh token from database
3. Clear cookies
4. Redirect to /login

```

### **User Changes Password:**
```

1. Update password_hash in accounts table
2. Delete ALL sessions for this user
3. Delete ALL refresh tokens for this user
4. Force re-login everywhere

📊 Performance Considerations
Caching User Permissions:

Load permissions on login
Store in JWT (access token)
No DB lookup on every request
Refresh when user gains/loses permissions

Database Indexes:
sqlCREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_accounts_provider ON accounts(provider, provider_account_id);
CREATE INDEX idx_users_email ON users(email);
Session Cleanup:

Cron job to delete expired sessions daily
Delete expired refresh tokens
Keep last 5 sessions per user, delete older
