# 🔄 Migration Guide: v1.0 → v2.0

This guide helps you migrate from the legacy authentication system (v1.0) to the new centralized OAuth2/OIDC system (v2.0).

## 🚨 Breaking Changes

### Authentication Architecture
- **Removed**: NextAuth.js from individual tools
- **Removed**: localStorage-based session management
- **Removed**: URL parameter authentication
- **Added**: Centralized Hub OAuth2/OIDC authentication
- **Added**: Secure httpOnly cookie sessions
- **Added**: Azure AD group-based permissions

### Removed Files
- `pages/auth/callback.js`
- `pages/api/auth/[...nextauth].js`
- `lib/authConfig.js`

### Modified Files
- `lib/hubAuth.js` - Completely rewritten
- `pages/index.js` - Updated to use SSR auth
- `pages/dashboard.js` - Updated to use SSR auth
- `pages/api/example.js` - Updated to use new middleware
- `.env.example` - Updated environment variables
- `package.json` - Removed NextAuth dependency

## 📋 Migration Steps

### 1. Update Dependencies
Remove NextAuth.js (now handled by Hub):
```bash
npm uninstall next-auth
```

### 2. Environment Variables

**Before (v1.0):**
```env
EMTEK_HUB_URL=https://your-emtek-hub-instance.com
TOOL_SLUG=your-tool-slug
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXT_PUBLIC_TOOL_NAME=Your Tool Name
NEXT_PUBLIC_TOOL_DESCRIPTION=Description of your tool
```

**After (v2.0):**
```env
HUB_URL=https://auth.emtek.com.au
NEXT_PUBLIC_HUB_URL=https://auth.emtek.com.au
NEXT_PUBLIC_TOOL_URL=https://your-tool.emtek.com.au
TOOL_SLUG=your-tool-slug
NEXT_PUBLIC_TOOL_NAME=Your Tool Name
NEXT_PUBLIC_TOOL_DESCRIPTION=Description of your tool
```

### 3. Update Authentication Utilities

**Before (v1.0):**
```javascript
import { verifyHubAccess, getToolConfig } from '../lib/hubAuth';

// Legacy session check
const session = await getServerSession(req, res, authOptions);
const access = await verifyHubAccess(toolSlug, session);
```

**After (v2.0):**
```javascript
import { requireHubAuth, getToolConfig } from '../lib/hubAuth';

// New SSR auth
export async function getServerSideProps(context) {
  const authResult = await requireHubAuth(context);
  if (authResult.redirect) return authResult;
  
  return { props: { session: authResult.props.session } };
}
```

### 4. Update Protected Pages

**Before (v1.0):**
```javascript
// Client-side session check with localStorage
useEffect(() => {
  const savedSession = localStorage.getItem('hubSession');
  // ... localStorage logic
}, []);
```

**After (v2.0):**
```javascript
// Server-side authentication
export async function getServerSideProps(context) {
  return await requireHubAuth(context);
}
```

### 5. Update API Routes

**Before (v1.0):**
```javascript
import { getServerSession } from 'next-auth';
import { authOptions } from '../lib/authConfig';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  // ...
}
```

**After (v2.0):**
```javascript
import { withHubAuth } from '../lib/hubAuth';

async function handler(req, res) {
  // req.user and req.session automatically available
  const user = req.user;
  // ...
}

export default withHubAuth(handler);
```

### 6. Update Client-Side Sign Out

**Before (v1.0):**
```javascript
import { signOut } from 'next-auth/react';

// Old way
signOut({ callbackUrl: '/' });
// or localStorage.removeItem('hubSession');
```

**After (v2.0):**
```javascript
import { signOut } from '../lib/hubAuth';

// New way
signOut(); // Redirects to Hub sign out
```

## 🔧 Hub Configuration Required

### 1. Tool Registration
Hub administrators must register your tool in the new system:

```javascript
{
  slug: "your-tool-slug",
  name: "Your Tool Name",
  url: "https://your-tool.emtek.com.au",
  status: "prod"
}
```

### 2. Azure AD Group Mapping
Map Azure AD groups to your tool:

```javascript
{
  toolSlug: "your-tool-slug",
  groups: ["azure-group-id-1", "azure-group-id-2"]
}
```

### 3. CORS Configuration
Add your domain to Hub CORS settings:

```javascript
{
  origins: ["https://your-tool.emtek.com.au"],
  credentials: true
}
```

## ✅ Verification Checklist

After migration, verify these work:

- [ ] Unauthenticated users redirect to Hub
- [ ] Hub authentication redirects back to tool
- [ ] Dashboard shows user information from session
- [ ] API routes are protected and receive user data
- [ ] Sign out redirects to Hub
- [ ] No authentication data in localStorage
- [ ] No NextAuth routes exist
- [ ] Environment variables updated

## 🚫 What to Remove

### Client-Side Code
```javascript
// Remove all localStorage auth code
localStorage.getItem('hubSession');
localStorage.setItem('hubSession', ...);
localStorage.removeItem('hubSession');

// Remove NextAuth imports
import { useSession, signIn, signOut } from 'next-auth/react';
import { getSession } from 'next-auth/react';
```

### Server-Side Code
```javascript
// Remove NextAuth server code
import { getServerSession } from 'next-auth';
import { authOptions } from '../lib/authConfig';
import NextAuth from 'next-auth';
```

### Environment Variables
```env
# Remove these
NEXTAUTH_URL=...
NEXTAUTH_SECRET=...
EMTEK_HUB_URL=... # (use HUB_URL instead)
```

## 🔍 Common Issues

### Redirect Loops
- Ensure `NEXT_PUBLIC_TOOL_URL` matches your actual domain
- Check Hub callback URL configuration

### Session Not Found
- Verify tool is registered in Hub
- Check CORS configuration allows your domain
- Ensure cookies are set on correct domain

### Access Denied
- Verify Azure AD group mappings
- Check user is in correct groups
- Confirm tool status (prod vs staging)

## 📞 Getting Help

- **Hub Integration**: Contact Hub administrators
- **Migration Issues**: Check this guide or create GitHub issue
- **Azure AD**: Contact IT/Identity team

---

**🎉 Migration Complete!** Your tool now uses secure, centralized authentication through EMtek Hub.
