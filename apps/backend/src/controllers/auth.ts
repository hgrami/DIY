import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';

const prisma = new PrismaClient();

export class AuthController {
  static async syncUser(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Return the user profile
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          subscriptionStatus: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error('Sync user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}