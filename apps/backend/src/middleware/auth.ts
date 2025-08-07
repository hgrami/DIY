import { Request, Response, NextFunction } from 'express';
import { verifyToken, createClerkClient } from '@clerk/backend';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';

const prisma = new PrismaClient();
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
    }
    
    // Verify token with Clerk - using secretKey directly
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });

    if (!payload) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
    }

    // Get user details from Clerk to get the email
    const clerkUser = await clerkClient.users.getUser(payload.sub);

    if (!clerkUser || !clerkUser.emailAddresses.length) {
      return res.status(401).json({ 
        success: false,
        error: 'User not found or no email address',
        code: 'USER_NOT_FOUND'
      });
    }

    const userEmail = clerkUser.emailAddresses[0].emailAddress;

    // Find or create user in our database
    const user = await prisma.user.upsert({
      where: { clerkId: payload.sub },
      update: {
        email: userEmail,
      },
      create: {
        clerkId: payload.sub,
        email: userEmail,
      },
    });

    req.user = user;
    next();
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    
    // Handle specific Clerk token verification errors
    if (error.reason === 'token-expired') {
      return res.status(401).json({
        success: false,
        error: 'Token has expired',
        code: 'TOKEN_EXPIRED',
        message: 'Please refresh your token and try again'
      });
    }

    if (error.reason === 'token-invalid') {
      return res.status(401).json({
        success: false,
        error: 'Token is invalid',
        code: 'TOKEN_INVALID',
        message: 'Please login again'
      });
    }

    // Handle other verification errors
    if (error.name === 'TokenVerificationError') {
      return res.status(401).json({
        success: false,
        error: 'Token verification failed',
        code: 'TOKEN_VERIFICATION_FAILED',
        message: 'Authentication token could not be verified'
      });
    }

    // Generic auth error
    return res.status(401).json({ 
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_FAILED',
      message: 'Unable to authenticate request'
    });
  }
};