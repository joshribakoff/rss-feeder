import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function configurePassport() {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL = `${process.env.APP_URL || 'http://localhost:3000'}/auth/google/callback`;

  if (!clientID || !clientSecret) {
    throw new Error('Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env file');
  }

  // Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          const googleId = profile.id;
          const name = profile.displayName;
          const picture = profile.photos?.[0]?.value;

          if (!email) {
            return done(new Error('No email found in Google profile'), undefined);
          }

          // Find user by email or googleId
          let user = await prisma.user.findFirst({
            where: {
              OR: [
                { googleId },
                { email }
              ]
            }
          });

          if (user) {
            // Update existing user with Google info
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                googleId,
                email,
                name,
                picture,
              },
            });
          } else {
            // Create new user
            user = await prisma.user.create({
              data: {
                googleId,
                email,
                name,
                picture,
              },
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error, undefined);
        }
      }
    )
  );

  // GitHub OAuth Strategy
  const githubClientID = process.env.GITHUB_CLIENT_ID;
  const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
  const githubCallbackURL = `${process.env.APP_URL || 'http://localhost:3000'}/auth/github/callback`;

  if (githubClientID && githubClientSecret) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: githubClientID,
          clientSecret: githubClientSecret,
          callbackURL: githubCallbackURL,
          scope: ['user:email'],
        },
        async (accessToken: string, refreshToken: string, profile: any, done: any) => {
          try {
            const email = profile.emails?.[0]?.value;
            const githubId = profile.id;
            const name = profile.displayName || profile.username;
            const picture = profile.photos?.[0]?.value;

            if (!email) {
              return done(new Error('No email found in GitHub profile'), undefined);
            }

            // Find user by email or githubId
            let user = await prisma.user.findFirst({
              where: {
                OR: [
                  { githubId },
                  { email }
                ]
              }
            });

            if (user) {
              // Update existing user with GitHub info
              user = await prisma.user.update({
                where: { id: user.id },
                data: {
                  githubId,
                  email,
                  name,
                  picture,
                },
              });
            } else {
              // Create new user
              user = await prisma.user.create({
                data: {
                  githubId,
                  email,
                  name,
                  picture,
                },
              });
            }

            return done(null, user);
          } catch (error) {
            return done(error as Error, undefined);
          }
        }
      )
    );
  }

  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
      });
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  return passport;
}
