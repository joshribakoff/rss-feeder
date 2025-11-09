# Authentication Setup Guide

This application now includes Google OAuth authentication. Follow these steps to set it up:

## 1. Create Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Select "Web application" as the application type
6. Add authorized redirect URIs:
   - For development: `http://localhost:3000/auth/google/callback`
   - For production: `https://yourdomain.com/auth/google/callback`
7. Copy your Client ID and Client Secret

## 2. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in your credentials:
   ```
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   SESSION_SECRET=generate-a-random-string-here
   NODE_ENV=development
   APP_URL=http://localhost:3000
   ```

   To generate a secure SESSION_SECRET, you can run:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

## 3. Run Database Migration

Apply the database schema changes:
```bash
npx prisma migrate deploy
# OR if in development
npx prisma db push
npx prisma generate
```

## 4. Build and Start

### Development
```bash
# Terminal 1 - Start the server
npm run dev:server

# Terminal 2 - Start the client
npm run dev:client
```

### Production
```bash
# Build
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production
```

## Features Implemented

✅ Google OAuth authentication
✅ User registration and login (upsert on login)
✅ Session management (filesystem-based)
✅ Protected API routes (requires authentication)
✅ Protected frontend routes (login page for unauthenticated users)
✅ Logout functionality
✅ User profile display with avatar

## Security Notes

- Sessions are stored on the filesystem in the default session directory
- The SESSION_SECRET should be a long, random string in production
- In production, cookies are set to `secure: true` (requires HTTPS)
- All API routes are now protected and require authentication
- The frontend displays a login page for unauthenticated users

## Database Schema

New tables added:
- **User**: Stores user information (email, name, googleId, picture)
- **Session**: Stores session data (not actively used with express-session's default store, but available for future use)
