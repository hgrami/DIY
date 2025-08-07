import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { StripeService } from '../services/stripe';

const prisma = new PrismaClient();

export class SubscriptionController {
  static async getProducts(req: AuthenticatedRequest, res: Response) {
    try {
      const products = await StripeService.getProducts();
      res.json({
        success: true,
        data: products,
      });
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  }

  static async createCheckoutSession(req: AuthenticatedRequest, res: Response) {
    try {
      const { priceId, promoCode } = req.body;

      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (!priceId) {
        return res.status(400).json({ error: 'Price ID is required' });
      }

      const session = await StripeService.createCheckoutSession(
        priceId,
        req.user.id,
        promoCode
      );

      res.json({
        success: true,
        data: {
          sessionId: session.id,
          url: session.url,
        },
      });
    } catch (error) {
      console.error('Create checkout session error:', error);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  }

  static async createPaymentIntent(req: AuthenticatedRequest, res: Response) {
    try {
      const { priceId, promoCode } = req.body;

      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (!priceId) {
        return res.status(400).json({ error: 'Price ID is required' });
      }

      const paymentIntent = await StripeService.createPaymentIntent(
        priceId,
        req.user.id,
        promoCode
      );

      res.json({
        success: true,
        data: paymentIntent,
      });
    } catch (error) {
      console.error('Create payment intent error:', error);
      res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment intent' 
      });
    }
  }

  static async getSubscriptionStatus(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const subscription = await prisma.subscription.findFirst({
        where: {
          userId: req.user.id,
          status: {
            in: ['active', 'trialing'],
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.json({
        success: true,
        data: {
          subscription,
          userStatus: req.user.subscriptionStatus,
        },
      });
    } catch (error) {
      console.error('Get subscription status error:', error);
      res.status(500).json({ error: 'Failed to get subscription status' });
    }
  }

  static async validatePromoCode(req: AuthenticatedRequest, res: Response) {
    try {
      const { code } = req.body;

      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (!code) {
        return res.status(400).json({ error: 'Promo code is required' });
      }

      // Check for local promo codes first
      const promoCode = await prisma.promoCode.findUnique({
        where: { code },
        include: {
          redemptions: {
            where: { userId: req.user.id },
          },
        },
      });

      if (promoCode && promoCode.isActive) {
        // Validate local promo code
        if (promoCode.expiresAt < new Date()) {
          return res.json({
            success: false,
            data: { isValid: false, error: 'Promo code expired' },
          });
        }

        if (promoCode.usedCount >= promoCode.usageLimit) {
          return res.json({
            success: false,
            data: { isValid: false, error: 'Promo code usage limit exceeded' },
          });
        }

        if (promoCode.redemptions.length > 0) {
          return res.json({
            success: false,
            data: { isValid: false, error: 'Promo code already used' },
          });
        }

        return res.json({
          success: true,
          data: {
            isValid: true,
            subscriptionType: promoCode.subscriptionType,
            durationDays: promoCode.durationDays,
            isLifetime: promoCode.durationDays === null,
          },
        });
      }

      // Fallback to Stripe validation for discount codes
      const validation = await StripeService.validatePromoCode(code, req.user.id);

      res.json({
        success: validation.isValid,
        data: validation,
      });
    } catch (error) {
      console.error('Validate promo code error:', error);
      res.status(500).json({ error: 'Failed to validate promo code' });
    }
  }

  static async redeemPromoCode(req: AuthenticatedRequest, res: Response) {
    try {
      const { code } = req.body;

      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (!code) {
        return res.status(400).json({ error: 'Promo code is required' });
      }

      const promoCode = await prisma.promoCode.findUnique({
        where: { code },
        include: {
          redemptions: {
            where: { userId: req.user.id },
          },
        },
      });

      if (!promoCode || !promoCode.isActive) {
        return res.status(400).json({ error: 'Invalid promo code' });
      }

      if (promoCode.expiresAt < new Date()) {
        return res.status(400).json({ error: 'Promo code expired' });
      }

      if (promoCode.usedCount >= promoCode.usageLimit) {
        return res.status(400).json({ error: 'Promo code usage limit exceeded' });
      }

      if (promoCode.redemptions.length > 0) {
        return res.status(400).json({ error: 'Promo code already used' });
      }

      // Calculate expiration date for the redemption
      const expiresAt = promoCode.durationDays 
        ? new Date(Date.now() + promoCode.durationDays * 24 * 60 * 60 * 1000)
        : null;

      // Create redemption and update user in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create redemption record
        const redemption = await tx.promoCodeRedemption.create({
          data: {
            promoCodeId: promoCode.id,
            userId: req.user!.id,
            expiresAt,
          },
        });

        // Update promo code usage count
        await tx.promoCode.update({
          where: { id: promoCode.id },
          data: { usedCount: { increment: 1 } },
        });

        // Update user subscription status
        await tx.user.update({
          where: { id: req.user!.id },
          data: { subscriptionStatus: promoCode.subscriptionType },
        });

        return redemption;
      });

      res.json({
        success: true,
        data: {
          subscriptionType: promoCode.subscriptionType,
          expiresAt: result.expiresAt,
          isLifetime: promoCode.durationDays === null,
        },
      });
    } catch (error) {
      console.error('Redeem promo code error:', error);
      res.status(500).json({ error: 'Failed to redeem promo code' });
    }
  }

  static async getCurrentSubscription(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const subscription = await StripeService.getCurrentSubscription(req.user.id);

      res.json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      console.error('Get current subscription error:', error);
      res.status(500).json({ error: 'Failed to get current subscription' });
    }
  }

  static async cancelSubscription(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const subscription = await StripeService.cancelSubscription(req.user.id);

      res.json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      console.error('Cancel subscription error:', error);
      res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel subscription' 
      });
    }
  }

  static async reactivateSubscription(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const subscription = await StripeService.reactivateSubscription(req.user.id);

      res.json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      console.error('Reactivate subscription error:', error);
      res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reactivate subscription' 
      });
    }
  }
}