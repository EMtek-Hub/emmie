# 🚀 Deploying EMtek Tool Template to Netlify

This guide will walk you through deploying your EMtek Tool Template to Netlify for full testing with the live EMtek Hub.

## 📋 Prerequisites

- [x] Netlify account (free tier is sufficient)
- [x] GitHub repository with your tool template
- [x] Access to EMtek Hub admin panel (for registering your tool)

## 🔧 Step 1: Prepare for Deployment

The project is already configured with:
- ✅ `netlify.toml` configuration file
- ✅ Next.js build scripts
- ✅ Environment variable templates
- ✅ Security headers and CSP

## 🌐 Step 2: Deploy to Netlify

### Option A: Netlify CLI (Recommended)
1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Login to Netlify:
   ```bash
   netlify login
   ```

3. Deploy from the emtek-tool-template directory:
   ```bash
   cd emtek-tool-template
   netlify deploy
   ```

4. For production deployment:
   ```bash
   netlify deploy --prod
   ```

### Option B: Netlify Web Interface
1. Go to [Netlify](https://app.netlify.com/)
2. Click "New site from Git"
3. Connect your GitHub repository
4. Select your repository
5. Configure build settings:
   - **Base directory**: `emtek-tool-template`
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
6. Click "Deploy site"

## ⚙️ Step 3: Configure Environment Variables

In your Netlify dashboard, go to Site settings > Environment variables and add:

### Required Variables:
```
HUB_URL=https://emtekhub.netlify.app
NEXT_PUBLIC_HUB_URL=https://emtekhub.netlify.app
NEXT_PUBLIC_TOOL_URL=https://your-site-name.netlify.app
TOOL_SLUG=your-tool-slug
NEXT_PUBLIC_TOOL_NAME=Your Tool Name
NEXT_PUBLIC_TOOL_DESCRIPTION=Description of your tool
```

## 🔗 Step 4: Register Your Tool with EMtek Hub

1. Go to the [EMtek Hub Admin Panel](https://your-emtek-hub-instance.com/admin)
2. Sign in with your admin credentials
3. Navigate to "Tools Management"
4. Click "Add New Tool"
5. Fill in the details:
   - **Tool Name**: Your Tool Name
   - **Tool Slug**: your-tool-slug
   - **Tool URL**: https://your-site-name.netlify.app
   - **Callback URL**: https://your-site-name.netlify.app/auth/callback
   - **Description**: Description of your tool
   - **Status**: Active

## 🧪 Step 5: Test the Full Authentication Flow

1. Visit your deployed site: `https://your-site-name.netlify.app`
2. Click "Sign In with EMtek Hub"
3. You should be redirected to EMtek Hub login
4. Sign in with your Microsoft 365 credentials
5. After successful login, you should be redirected back to your tool's dashboard

## 🔍 Troubleshooting

### Common Issues:

**Build Failures:**
- Check the Netlify build logs for specific errors
- Ensure all dependencies are in package.json
- Verify Node.js version (should be 18+)
- **"Missing script: build" Error**: If you see this error, it means Netlify didn't properly install dependencies before running the build. This is fixed by using `npm ci && npm run build` instead of just `npm run build` in netlify.toml
- Run `npm run verify-build` locally to check your configuration

**Authentication Issues:**
- Verify NEXT_PUBLIC_TOOL_URL matches your deployed domain
- Check that your tool is properly registered in EMtek Hub
- Ensure callback URLs match exactly

**Environment Variables:**
- Double-check all environment variables are set correctly
- Remember that NEXT_PUBLIC_ variables are exposed to the client

### Debug Steps:
1. Check Netlify build logs
2. Check browser console for errors
3. Verify network requests in browser dev tools
4. Check EMtek Hub logs for authentication issues

## 📱 Step 6: Test Different Scenarios

Once deployed, test these scenarios:

1. **Fresh visit** - Clear cookies and visit the site
2. **Direct dashboard access** - Try accessing `/dashboard` without auth
3. **Sign out flow** - Test the complete sign-out process
4. **Authentication callback** - Verify the callback page works
5. **Mobile responsiveness** - Test on mobile devices

## 🔄 Step 7: Continuous Deployment

Netlify automatically rebuilds your site when you push to your connected Git branch. This means:
- Push changes to your main branch
- Netlify automatically builds and deploys
- Your live site updates within minutes

## 📊 Monitoring

Monitor your deployed application:
- **Netlify Analytics**: Built-in traffic and performance metrics
- **Netlify Functions**: Monitor API route performance
- **Browser Console**: Check for client-side errors
- **EMtek Hub Admin**: Monitor authentication success/failure rates

## 🛡️ Security Considerations

The deployed site includes:
- ✅ Security headers (CSP, X-Frame-Options, etc.)
- ✅ HTTPS enforcement
- ✅ Secure authentication flow
- ✅ Environment variable protection

## 🎉 Success!

Your EMtek Tool Template is now live and fully integrated with EMtek Hub! Users can:
- Access your tool through the EMtek Hub
- Sign in with their Microsoft 365 credentials
- Enjoy seamless SSO experience
- Navigate between your tool and the Hub

## 📞 Support

If you encounter issues:
1. Check this troubleshooting guide
2. Review Netlify documentation
3. Contact EMtek Hub support team
4. Check the EMtek Hub developer documentation

---

**Happy coding! 🚀**
