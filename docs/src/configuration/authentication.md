# Authentication

Configure how users authenticate with your ToCry instance.

## Authentication Modes

ToCry supports three authentication modes with automatic priority-based selection:

### 1. Google OAuth (Priority 1)

When Google OAuth credentials are configured, ToCry will use Google single sign-on.

**Configuration:**
```bash
export GOOGLE_CLIENT_ID="your-google-client-id"
export GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

**Setup Required:**
1. Create a Google Cloud Platform project
2. Enable Google+ API
3. Create OAuth 2.0 credentials
4. Add your ToCry URL to authorized redirect URIs

### 2. Basic Authentication (Priority 2)

When Google OAuth is not configured but basic auth credentials are provided, ToCry will use username/password authentication.

**Configuration:**
```bash
export TOCRY_AUTH_USER="your-username"
export TOCRY_AUTH_PASS="your-password"
```

**Features:**
- Simple username/password protection
- Session-based authentication
- Secure password handling

### 3. No Authentication (Default)

If no authentication credentials are configured, ToCry runs in open access mode.

**Features:**
- No login required
- Full access to all features
- Suitable for internal use or public instances

## Authentication Priority

ToCry automatically selects authentication method based on available configuration:

1. **Google OAuth** (if `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set)
2. **Basic Auth** (if `TOCRY_AUTH_USER` and `TOCRY_AUTH_PASS` are set)
3. **No Authentication** (if neither are configured)

## Session Management

- Sessions automatically expire after configurable timeout
- Secure session cookies with proper flags
- Session data stored server-side for security

## Security Notes

- Google OAuth provides the most secure authentication option
- Basic authentication should use strong passwords
- Consider using HTTPS in production environments
- Authentication methods are mutually exclusive - only one can be active at a time
