import { currentUser } from '@clerk/nextjs/server';
import { db } from './db';

export const checkUser = async () => {
  try {
    const user = await currentUser();

    if (!user) {
      return null;
    }

    // 1. Check if user already exists by clerkUserId
    const loggedInUser = await db.user.findUnique({
      where: {
        clerkUserId: user.id,
      },
    });

    if (loggedInUser) {
      return loggedInUser;
    }

    // 2. Extract name and email safely (Google accounts often have null lastName or no username)
    const email = user.emailAddresses?.[0]?.emailAddress || '';
    const nameParts = [user.firstName, user.lastName].filter(Boolean);
    const name = nameParts.length > 0 
      ? nameParts.join(' ') 
      : user.username || (email ? email.split('@')[0] : 'User');

    // 3. Prevent Prisma P2002 unique constraint failure if email already exists
    if (email) {
      const existingByEmail = await db.user.findUnique({
        where: { email },
      });

      if (existingByEmail) {
        const updatedUser = await db.user.update({
          where: { id: existingByEmail.id },
          data: {
            clerkUserId: user.id,
            name: existingByEmail.name || name,
            imageUrl: user.imageUrl || existingByEmail.imageUrl,
          },
        });
        return updatedUser;
      }
    }

    // 4. Create new user record
    const newUser = await db.user.create({
      data: {
        clerkUserId: user.id,
        name,
        imageUrl: user.imageUrl || null,
        email,
      },
    });

    return newUser;
  } catch (error) {
    console.error('Error in checkUser synchronization:', error);
    return null;
  }
};

