import { DatabaseService } from "./services/databaseService";
import { configurePassport } from "./services/authService";
import { requireAuth } from "./middleware/authMiddleware";
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const db = new DatabaseService();
const app = express();
const port = process.env['NODE_ENV'] == 'production' ? 80 : 3000;

// Middleware
app.use(cookieParser());
app.use(express.json());

// Session configuration with filesystem storage
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Initialize passport
configurePassport();
app.use(passport.initialize());
app.use(passport.session());

// Auth routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req: any, res: any) => {
    // Successful authentication, redirect to home
    res.redirect('/');
  }
);

app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));

app.get(
  '/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req: any, res: any) => {
    // Successful authentication, redirect to home
    res.redirect('/');
  }
);

app.post('/auth/logout', (req: any, res: any) => {
  req.logout((err: any) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

app.get('/auth/user', (req: any, res: any) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Protected API routes
app.get('/api', requireAuth, async (req: any, res: any) => {
  const clusters = await db.getClustersWithArticles();
  res.send(clusters);
});

// Serve static files from public directory (must be after API routes)
app.use(express.static('public'));

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn('WARNING: Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env file');
  }
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    console.warn('WARNING: GitHub OAuth credentials not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env file');
  }
});

process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err}`);
});