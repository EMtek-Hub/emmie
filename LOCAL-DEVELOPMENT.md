# Local Development Mode

This document explains how to run the Emmie application locally for development and testing without requiring real EMtek Hub authentication.

## Setup Local Development

### 1. Enable Development Mode

Set the following in your `.env.local` file:

```bash
# Local Development Mode - Set to true for local testing with dummy credentials
LOCAL_DEV_MODE=true
```

### 2. Mock User Session

When `LOCAL_DEV_MODE=true`, the application will automatically create a mock user session with the following credentials:

- **User ID**: `dev-user-123`
- **Email**: `developer@emtek.local`
- **Name**: `Local Developer`
- **Groups**: `['emmie-users', 'developers']`
- **Azure AD Object ID**: `dev-user-123`

### 3. Authentication Bypass

In local development mode:
- ✅ No real authentication calls to EMtek Hub
- ✅ Automatic session creation with mock user data
- ✅ All tool permissions are automatically granted
- ✅ Full access to all application features
- ✅ Console logging shows when development mode is active

## Testing Features

### Chat Interface
Visit `http://localhost:3000` and you'll be automatically logged in as the mock user and redirected to the chat interface at `/chat`.

### Projects Page
Access the projects page at `http://localhost:3000/projects` to test project management features.

### API Endpoints
All API endpoints that require authentication will work with the mock user session.

## Development Mode Indicators

When running in development mode, you'll see console logs like:
- `🔧 Local Development Mode: Using mock session`
- `🔧 Local Development Mode: Auto-allowing tool access for emmie`

## Production Deployment

### Important Notes:
- **Production deployment is NOT affected** - the `LOCAL_DEV_MODE` variable is only used locally
- Production environment variables remain unchanged
- Real EMtek Hub authentication is used in production
- Security is maintained for production deployments

### Deployment Checklist:
1. Ensure `LOCAL_DEV_MODE` is not set in production environment variables
2. Verify `HUB_URL` points to production EMtek Hub
3. Confirm `TOOL_ORIGIN` matches your production domain
4. Test authentication flow works with real Azure AD

## Switching Between Modes

### Enable Local Development:
```bash
# In .env.local
LOCAL_DEV_MODE=true
```

### Disable Local Development (Production Mode):
```bash
# In .env.local - comment out or remove
# LOCAL_DEV_MODE=true
```

Or set to false:
```bash
LOCAL_DEV_MODE=false
```

## Troubleshooting

### Still Getting 404 Errors?
1. Ensure `LOCAL_DEV_MODE=true` is set in `.env.local`
2. Restart the development server: `npm run dev`
3. Check console logs for development mode indicators

### Authentication Still Required?
1. Verify the environment variable is set correctly
2. Check that there are no typos in `LOCAL_DEV_MODE=true`
3. Restart the Next.js development server

### API Errors?
Some API endpoints may require additional mock data setup. Check the console for specific error messages and add mock data as needed.

## Mock Data Extension

To add more realistic mock data for testing:

1. **Projects**: Update the projects API to return sample projects in development mode
2. **Chat History**: Add mock chat conversations for testing
3. **User Preferences**: Mock user settings and preferences

This ensures a complete testing environment that mirrors production functionality.
