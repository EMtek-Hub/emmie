# 🚀 EMtek Tool Template

A modern Next.js boilerplate template for creating tools that integrate seamlessly with the EMtek Hub centralized OAuth2/OIDC authentication system.

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14.0-black.svg)
![React](https://img.shields.io/badge/React-18.2-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

- 🔐 **Centralized Authentication** - OAuth2/OIDC through EMtek Hub with Azure AD
- 🍪 **Secure Sessions** - HttpOnly cookies on shared domain (no localStorage)
- 🛡️ **Group-based Access Control** - Azure AD group to tool mapping
- 🎨 **Modern UI** - Built with React, Next.js, and Tailwind CSS
- 📱 **Responsive Design** - Mobile-first design following EMtek brand guidelines
- ⚡ **Production Ready** - Server-side authentication and optimization
- 🚀 **Netlify Ready** - Pre-configured for one-click deployment
- 🔒 **Zero Client-side Auth** - All authentication handled server-side

## 🚀 Quick Start

### 1. Use This Template
Click the **"Use this template"** button above, or clone the repository:

```bash
git clone https://github.com/EMtek-Hub/emtek-tool-template.git
cd emtek-tool-template
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
```bash
cp .env.example .env.local
```

Update the following variables in `.env.local`:
```env
# EMtek Hub Integration - Required
HUB_URL=https://auth.emtek.com.au
NEXT_PUBLIC_HUB_URL=https://auth.emtek.com.au
NEXT_PUBLIC_TOOL_URL=https://your-tool.emtek.com.au
TOOL_SLUG=your-tool-slug

# Tool Configuration - Required
NEXT_PUBLIC_TOOL_NAME=Your Tool Name
NEXT_PUBLIC_TOOL_DESCRIPTION=Description of your tool
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Visit http://localhost:3000

## 🏗️ Architecture Overview

### Centralized Authentication Flow

```
User → Tool → EMtek Hub OAuth2 → Azure AD → 
Hub Session → Tool Access Check → Tool Dashboard
```

1. **User visits tool**: Tool checks for Hub session server-side
2. **No session**: Redirects to Hub `/api/auth/signin?callbackUrl=toolUrl`
3. **Hub authentication**: User signs in via Azure AD through Hub
4. **Shared session**: Hub sets httpOnly cookie on `.emtek.com.au` domain
5. **Tool access**: Tool verifies session and permissions via Hub API
6. **Dashboard access**: User gains access to tool functionality

### Key Security Features

- **No client-side tokens**: All authentication tokens stay server-side
- **HttpOnly cookies**: Sessions use secure, httpOnly cookies
- **Shared domain sessions**: Single sign-on across `*.emtek.com.au`
- **Server-side validation**: All auth checks happen server-side
- **Group-based permissions**: Access controlled via Azure AD groups

## 📁 Project Structure

```
emtek-tool-template/
├── lib/
│   └── hubAuth.js         # Hub authentication utilities
├── pages/
│   ├── api/
│   │   └── example.js     # Protected API route example
│   ├── _app.js            # App wrapper
│   ├── index.js           # Landing page (with SSR auth check)
│   └── dashboard.js       # Protected dashboard (requires auth)
├── components/
│   └── Sidebar.jsx        # Navigation component
├── styles/
│   └── globals.css        # Global styles with EMtek branding
├── .env.example           # Environment variables template
├── next.config.js         # Next.js configuration
├── tailwind.config.js     # Tailwind CSS configuration
└── package.json           # Dependencies and scripts
```

## 🔧 Development Guide

### Creating Protected Pages

Use `requireHubAuth` for pages that need authentication:

```javascript
// pages/my-protected-page.js
import { requireHubAuth, getToolConfig } from '../lib/hubAuth';

export default function MyPage({ session, toolConfig }) {
  return (
    <div>
      <h1>Welcome {session.user.name}</h1>
      {/* Your page content */}
    </div>
  );
}

export async function getServerSideProps(context) {
  const authResult = await requireHubAuth(context);
  
  if (authResult.redirect) {
    return authResult; // User will be redirected to Hub auth
  }

  const toolConfig = getToolConfig();
  
  return {
    props: {
      toolConfig,
      session: authResult.props.session,
    },
  };
}
```

### Creating Protected API Routes

Use `withHubAuth` middleware for API routes:

```javascript
// pages/api/my-endpoint.js
import { withHubAuth } from '../../lib/hubAuth';

async function handler(req, res) {
  // Access authenticated user data
  const user = req.user;
  const session = req.session;
  
  res.json({ 
    message: 'Hello from protected API',
    user: user.name 
  });
}

export default withHubAuth(handler);
```

### Available Authentication Utilities

```javascript
import { 
  getHubSession,      // Get session from Hub (server-side only)
  getUserPermissions, // Get user's tool permissions
  checkToolAccess,    // Check if user has access to this tool
  requireHubAuth,     // Protect pages with SSR
  withHubAuth,        // Protect API routes
  signOut,            // Sign out (client-side)
  getToolConfig       // Get tool configuration
} from '../lib/hubAuth';
```

## 🎨 Customization

### Styling

The template uses Tailwind CSS with EMtek brand colors:
- `--emtek-navy`: #005b99 (Primary)
- `--emtek-blue`: #003087 (Secondary)  
- `--emtek-orange`: #ef730b (Accent)

These are defined in `styles/globals.css` and can be customized.

### Adding Tool Functionality

Replace the sample dashboard content in `pages/dashboard.js`:

```javascript
{/* Replace sample cards with your tool's components */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  <YourToolComponent />
  <AnotherComponent />
</div>
```

### Environment Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `HUB_URL` | Yes | Hub server URL (server-side) |
| `NEXT_PUBLIC_HUB_URL` | Yes | Hub URL (client-side) |
| `NEXT_PUBLIC_TOOL_URL` | Yes | This tool's URL |
| `TOOL_SLUG` | Yes | Unique tool identifier |
| `NEXT_PUBLIC_TOOL_NAME` | Yes | Tool display name |
| `NEXT_PUBLIC_TOOL_DESCRIPTION` | Yes | Tool description |

## 🚀 Deployment

### Production Environment Variables

Set these in your deployment platform:

```env
HUB_URL=https://auth.emtek.com.au
NEXT_PUBLIC_HUB_URL=https://auth.emtek.com.au
NEXT_PUBLIC_TOOL_URL=https://your-tool.emtek.com.au
TOOL_SLUG=your-tool-slug
NEXT_PUBLIC_TOOL_NAME=Your Tool Name
NEXT_PUBLIC_TOOL_DESCRIPTION=Description of your tool
```

### Build Commands

```bash
# Build for production
npm run build

# Start production server
npm start

# Export static files (if applicable)
npm run export
```

### Deployment Platforms

Compatible with any Next.js hosting platform:
- **Vercel** (recommended)
- **Netlify** 
- **Railway**
- **AWS Amplify**
- **Custom servers**

## 🔧 Hub Configuration

### 1. Tool Registration

Hub administrators need to register your tool:

```javascript
// In Hub admin panel
{
  slug: "your-tool-slug",
  name: "Your Tool Name", 
  url: "https://your-tool.emtek.com.au",
  status: "prod" // or "staging"
}
```

### 2. Azure AD Group Mapping

Map Azure AD groups to tool access:

```javascript
// Example mapping
{
  toolSlug: "your-tool-slug",
  groups: [
    "azure-group-id-1", // Full access group
    "azure-group-id-2"  // Limited access group  
  ]
}
```

### 3. CORS Configuration

Hub needs to allow your tool's domain:

```javascript
// Hub CORS settings
{
  origins: [
    "https://your-tool.emtek.com.au",
    "https://staging-tool.emtek.com.au"
  ],
  credentials: true
}
```

## 🧪 Testing

### Local Development

1. Set up Hub locally or use staging environment
2. Configure your tool in Hub admin
3. Update `.env.local` with Hub URLs
4. Test full authentication flow

### Testing Checklist

- [ ] Unauthenticated user redirected to Hub
- [ ] Hub authentication redirects back to tool
- [ ] Dashboard loads with user information
- [ ] API routes protected and working
- [ ] Sign out redirects to Hub
- [ ] Access denied for users without permissions

## 🔍 Troubleshooting

### Common Issues

**"Authentication required" on API calls**
- Check that `withHubAuth` is applied to API route
- Verify Hub session cookies are being sent
- Ensure CORS is configured correctly

**Redirect loops**
- Check `NEXT_PUBLIC_TOOL_URL` matches actual domain
- Verify Hub callback URL configuration
- Ensure tool is registered in Hub

**Access denied for valid users**
- Check Azure AD group mappings in Hub
- Verify user is in correct Azure AD groups
- Check tool status (prod vs staging)

### Debug Mode

Enable debug logging in development:

```javascript
// In pages/_app.js or individual components
console.log('Session:', session);
console.log('Tool config:', toolConfig);
```

## 📞 Support

- **Hub Integration Issues**: Contact Hub administrators
- **Template Questions**: Create GitHub issue
- **Azure AD Problems**: Contact IT/Identity team
- **Next.js Help**: See [Next.js documentation](https://nextjs.org/docs)

## 📄 License

MIT License - Feel free to customize for your organization's needs.

---

**⚡ New in v2.0.0**: Complete refactor to centralized OAuth2/OIDC authentication with secure cookie-based sessions and Azure AD group mapping.
