# CSRF Protection Implementation

## Overview

CSRF (Cross-Site Request Forgery) protection has been implemented across the application to prevent unauthorized state-changing operations.

## Implementation Details

### 1. CSRF Utilities (`src/lib/security/csrf.ts`)

- **Token Generation**: Secure random 32-byte hex tokens
- **Token Storage**: HttpOnly cookies (prevents JavaScript access)
- **Token Validation**: Constant-time comparison to prevent timing attacks
- **Token Transport**: Tokens sent via `X-CSRF-Token` header (recommended) or request body

### 2. CSRF Token Endpoint

**GET `/api/csrf-token`**
- Returns a CSRF token for authenticated users
- Token is returned in response body AND set as httpOnly cookie
- Requires authentication

### 3. Middleware

**`withCsrfProtection`** middleware wraps route handlers to:
- Only validate CSRF for POST/PUT/PATCH/DELETE methods
- Skip CSRF for authentication endpoints (they have rate limiting protection)
- Return 403 error if token is missing or invalid

## Protected Routes

The following routes now have CSRF protection:

### Admin Routes
- ✅ `POST /api/admin/wipe-data` - Data wipe
- ✅ `PATCH /api/admin/users/[id]/role` - Role changes

### Competition Routes
- ✅ `POST /api/competitions` - Create competition
- ✅ `PATCH /api/competitions/[id]` - Update competition
- ✅ `DELETE /api/competitions/[id]` - Delete competition
- ✅ `POST /api/competitions/[id]/athletes` - Add athlete to competition
- ✅ `DELETE /api/competitions/[id]/athletes` - Remove athlete from competition

### Score Routes
- ✅ `POST /api/scores/[discipline]` - Enter scores

### Athlete Routes
- ✅ `POST /api/athletes` - Create athlete
- ✅ `POST /api/athlete/training` - Create training entry
- ✅ `DELETE /api/athlete/training` - Delete training entry

### Auth Routes (Protected by Rate Limiting, Not CSRF)
- ⚠️ `POST /api/auth/login` - Login (rate limited)
- ⚠️ `POST /api/auth/register` - Registration (rate limited)
- ⚠️ `POST /api/auth/athlete-login` - DOB login (rate limited)
- ⚠️ `POST /api/auth/logout` - Logout
- ✅ `POST /api/auth/change-password` - Password change (CSRF protected)

## Frontend Integration

To use CSRF protection in the frontend:

1. **Get CSRF Token** (on login or page load):
```typescript
const response = await fetch('/api/csrf-token', {
  credentials: 'include' // Important: include cookies
});
const { csrfToken } = await response.json();
// Store token in memory (not localStorage - it's sensitive)
```

2. **Include Token in Requests**:
```typescript
await fetch('/api/competitions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken // Include CSRF token
  },
  credentials: 'include', // Include cookies
  body: JSON.stringify(data)
});
```

## Remaining Routes to Protect

The following routes still need CSRF protection (if they modify data):

- `POST /api/competitions/[id]/events` - Create event
- `PATCH /api/competitions/[id]/events` - Update event
- `POST /api/competitions/[id]/swim-seeding` - Set swim seeding
- `PATCH /api/competitions/[id]/swim-seeding` - Update swim seeding
- `DELETE /api/competitions/[id]/swim-seeding` - Delete swim seeding
- `POST /api/competitions/[id]/fencing-de-bracket` - Create bracket
- `PATCH /api/competitions/[id]/fencing-de-bracket` - Update bracket
- `DELETE /api/competitions/[id]/fencing-de-bracket` - Delete bracket
- `POST /api/competitions/[id]/handicap` - Set handicap
- `POST /api/admin/consent/[athleteId]` - Consent management
- `POST /api/admin/privacy/deletion-requests` - Deletion request
- `PATCH /api/admin/privacy/deletion-requests` - Process deletion
- `POST /api/admin/privacy/retention/process` - Process retention
- `PATCH /api/admin/security/alerts` - Acknowledge alerts
- `DELETE /api/admin/sessions` - Terminate sessions
- `POST /api/athlete/privacy` - Privacy settings
- `POST /api/athlete/deletion` - Request deletion
- `DELETE /api/athlete/deletion` - Cancel deletion
- `POST /api/athlete/export` - Export data
- `POST /api/athletes/[id]/link` - Link athlete
- `DELETE /api/athletes/[id]/link` - Unlink athlete
- `PATCH /api/super-admin/accounts` - Super admin actions
- `DELETE /api/super-admin/accounts` - Super admin actions
- `POST /api/super-admin/import` - Import data

## Security Notes

1. **Authentication Endpoints**: CSRF protection is intentionally skipped for `/api/auth/*` endpoints as they are protected by rate limiting and other mechanisms.

2. **Token Expiry**: CSRF tokens expire after 24 hours. Frontend should refresh tokens periodically.

3. **Same-Origin Policy**: CSRF protection relies on the browser's Same-Origin Policy to prevent malicious sites from reading the CSRF cookie.

4. **Constant-Time Comparison**: Token validation uses constant-time comparison to prevent timing attacks.

5. **HttpOnly Cookies**: CSRF tokens are stored in httpOnly cookies, preventing JavaScript access (XSS protection).

## Testing

To test CSRF protection:

1. **Valid Request**: Include valid CSRF token in header
2. **Missing Token**: Omit `X-CSRF-Token` header → Should return 403
3. **Invalid Token**: Include wrong token → Should return 403
4. **Expired Token**: Use expired token → Should return 403

## Migration Notes

- Existing API clients will need to be updated to include CSRF tokens
- Frontend should fetch CSRF token on login and refresh periodically
- Consider adding automatic token refresh in API client wrapper
