# 🚀 EMtek Tool Template

A modern Next.js boilerplate template for creating tools that integrate seamlessly with the EMtek Hub SSO system.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14.0-black.svg)
![React](https://img.shields.io/badge/React-18.2-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

- 🔐 **EMtek Hub SSO Integration** - Seamless authentication through the central Hub
- 🎨 **Modern UI** - Built with React, Next.js, and Tailwind CSS
- 🛡️ **Access Control** - Automatic user permission verification via Hub API
- 📱 **Responsive Design** - Mobile-first design following EMtek brand guidelines
- ⚡ **Production Ready** - Optimized build configuration and deployment setup
- 🚀 **Netlify Ready** - Pre-configured for one-click deployment
- 🎯 **TypeScript Support** - Full type safety (optional)
- 📊 **Built-in Analytics** - Ready for monitoring integration

## 🚀 Quick Start

### 1. Use This Template
Click the **"Use this template"** button above, or clone the repository:

```bash
git clone https://github.com/EMtek-Hub/emtek-tool-template.git
cd emtek-tool-template
```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Update the following variables in `.env.local`:
   - `TOOL_SLUG`: Unique identifier for your tool (must match Hub configuration)
   - `NEXT_PUBLIC_TOOL_NAME`: Display name for your tool
   - `NEXT_PUBLIC_TOOL_DESCRIPTION`: Brief description of your tool
   - `NEXTAUTH_SECRET`: Random secret for session encryption
   - `EMTEK_HUB_URL`: URL of your EMtek Hub instance (default: https://emtekhub.netlify.app)

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Visit http://localhost:3000**

## Project Structure

```
emtek-tool-template/
├── lib/
│   ├── authConfig.js      # NextAuth configuration
│   └── hubAuth.js         # EMtek Hub integration utilities
├── pages/
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth].js  # NextAuth API route
│   ├── _app.js            # App wrapper with session provider
│   ├── index.js           # Landing page
│   └── dashboard.js       # Main authenticated area
├── styles/
│   └── globals.css        # Global styles with EMtek branding
├── .env.example           # Environment variables template
├── next.config.js         # Next.js configuration
├── tailwind.config.js     # Tailwind CSS configuration
└── package.json           # Dependencies and scripts
```

## EMtek Hub Integration

### Authentication Flow

1. User visits your tool
2. If not authenticated, they're redirected to EMtek Hub
3. After Hub authentication, user returns to your tool
4. Your tool verifies access permissions with Hub API
5. User gains access to your tool's functionality

### Access Control

The template automatically:
- Verifies user authentication via NextAuth sessions
- Checks user permissions for your specific tool via Hub API
- Handles access denied scenarios gracefully
- Provides navigation back to the Hub

### API Integration

Use the provided utilities in `lib/hubAuth.js`:

```javascript
import { verifyHubAccess, getToolConfig } from '../lib/hubAuth';

// Check if user has access to your tool
const access = await verifyHubAccess(toolSlug, session);

// Get tool configuration
const config = getToolConfig();

// Protect API routes
import { withHubAuth } from '../lib/hubAuth';
export default withHubAuth(async (req, res) => {
  // Your protected API logic here
  // req.user contains user info
  // req.toolAccess contains access details
});
```

## Customization

### Styling

The template uses Tailwind CSS with EMtek brand colors:
- `emtek-navy`: #005b99 (Primary)
- `emtek-blue`: #003087 (Secondary)
- `emtek-orange`: #ef730b (Accent)

Modify `tailwind.config.js` and `styles/globals.css` to customize the design.

### Components

Replace the sample dashboard content in `pages/dashboard.js` with your tool's functionality:

```javascript
// Remove sample cards and add your components
<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Your tool-specific components */}
</div>
```

### Navigation

The template includes a basic navigation bar. Customize it in `pages/dashboard.js`:

```javascript
// Add navigation items, tool-specific actions, etc.
<nav className="navbar">
  {/* Your navigation content */}
</nav>
```

## Deployment

### Environment Variables

Set these environment variables in your deployment platform:

- `EMTEK_HUB_URL`: URL of your EMtek Hub instance
- `TOOL_SLUG`: Your tool's unique identifier
- `NEXTAUTH_URL`: Your tool's production URL
- `NEXTAUTH_SECRET`: Random secret for session encryption
- `NEXT_PUBLIC_TOOL_NAME`: Your tool's display name
- `NEXT_PUBLIC_TOOL_DESCRIPTION`: Your tool's description

### Build Commands

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Platform-Specific Deployment

The template works with any Next.js-compatible hosting platform:
- Vercel (recommended)
- Netlify
- Heroku
- AWS
- Railway

## Hub Admin Configuration

Before users can access your tool, an EMtek Hub administrator must:

1. **Add your tool** to the Hub's tool registry
2. **Configure tool settings** (name, description, URL, slug)
3. **Assign user permissions** for who can access your tool
4. **Test the integration** to ensure SSO works correctly

Contact your Hub administrator with:
- Tool name and description
- Production URL
- Desired tool slug
- Initial list of users who should have access

## Development Tips

### Testing Hub Integration

1. Set up a local Hub instance or use the staging environment
2. Configure your tool in the Hub admin panel
3. Test the authentication flow end-to-end
4. Verify access control works for different user permission levels

### API Routes

Create protected API routes using the `withHubAuth` wrapper:

```javascript
// pages/api/my-endpoint.js
import { withHubAuth } from '../../lib/hubAuth';

export default withHubAuth(async (req, res) => {
  // This code only runs for authenticated users with tool access
  const user = req.user;
  const toolAccess = req.toolAccess;
  
  res.json({ success: true, user });
});
```

### Error Handling

The template includes error handling for common scenarios:
- User not authenticated
- User doesn't have tool access
- Hub connection issues
- Invalid tool configuration

Customize error messages and handling in your components as needed.

## Support

For issues with:
- **EMtek Hub integration**: Contact your Hub administrator
- **Template usage**: Check this README or create an issue
- **Next.js/React questions**: Refer to official documentation

## License

MIT License - feel free to customize for your organization's needs.
