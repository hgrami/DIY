import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { StripeProduct, PromoCodeValidationResult } from '../types';

const prisma = new PrismaClient();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export class StripeService {
  static async getProducts(): Promise<StripeProduct[]> {
    const products = await stripe.products.list({
      active: true,
    });

    const allProducts: StripeProduct[] = [];

    for (const product of products.data) {
      // Get all prices for this product
      const prices = await stripe.prices.list({
        product: product.id,
        active: true,
      });

      // Create a product entry for each price
      for (const price of prices.data) {
        allProducts.push({
          id: price.id, // Use price ID instead of product ID for frontend
          name: product.name,
          description: product.description || '',
          price: (price.unit_amount || 0) / 100,
          currency: price.currency,
          interval: price.recurring?.interval || 'one-time',
          features: product.features?.map((f) => f.name).filter((name): name is string => name !== undefined) || [],
        });
      }
    }

    return allProducts;
  }

  static async createCheckoutSession(
    priceId: string,
    userId: string,
    promoCode?: string
  ) {
    let sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
      metadata: {
        userId,
      },
    };

    // Note: Promo codes are now handled separately in the subscription controller
    // This method only handles Stripe-based payments without local promo codes

    return await stripe.checkout.sessions.create(sessionParams);
  }

  static async createPaymentIntent(
    priceId: string,
    userId: string,
    promoCode?: string
  ) {
    // Get the price details
    const price = await stripe.prices.retrieve(priceId);
    const product = await stripe.products.retrieve(price.product as string);

    // Find or create customer
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    let customerId = await this.findOrCreateStripeCustomer(user.email, user.id);

    let amount = price.unit_amount || 0;
    let setupFutureUsage: 'off_session' | undefined = undefined;

    // For subscriptions, we need to set up future usage
    if (price.recurring) {
      setupFutureUsage = 'off_session';
    }

    // Note: Promo codes are now handled separately in the subscription controller
    // This method only handles Stripe-based payments without local promo codes

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: price.currency,
      customer: customerId,
      setup_future_usage: setupFutureUsage,
      metadata: {
        userId,
        priceId,
        productName: product.name,
        interval: price.recurring?.interval || 'one-time',
        promoCode: promoCode || '',
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }

  private static async findOrCreateStripeCustomer(email: string, userId: string): Promise<string> {
    // First check if user already has a Stripe customer ID stored
    const existingSubscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (existingSubscription) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(existingSubscription.stripeSubscriptionId);
        return stripeSubscription.customer as string;
      } catch (error) {
        // If subscription doesn't exist in Stripe, create new customer
      }
    }

    // Search for existing customer by email
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (customers.data.length > 0) {
      return customers.data[0].id;
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email,
      metadata: { userId },
    });

    return customer.id;
  }

  static async validatePromoCode(
    code: string,
    userId: string
  ): Promise<PromoCodeValidationResult> {
    // This method is now only for Stripe discount codes, not local promo codes
    // Local promo codes are handled in the subscription controller
    return { isValid: false, discountAmount: 0, discountType: 'PERCENTAGE', error: 'Invalid promo code' };
  }

  private static async createOrGetCoupon(
    promoCode: string,
    validation: PromoCodeValidationResult
  ): Promise<string> {
    const couponId = `promo_${promoCode}`;
    
    try {
      // Try to retrieve existing coupon
      await stripe.coupons.retrieve(couponId);
      return couponId;
    } catch {
      // Create new coupon
      const coupon = await stripe.coupons.create({
        id: couponId,
        percent_off: validation.discountType === 'PERCENTAGE' ? validation.discountAmount : undefined,
        amount_off: validation.discountType === 'FIXED' ? validation.discountAmount * 100 : undefined,
        currency: validation.discountType === 'FIXED' ? 'usd' : undefined,
        duration: 'once',
      });
      return coupon.id;
    }
  }

  static async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
    }
  }

  private static async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const { userId, priceId, productName, interval } = paymentIntent.metadata;
    if (!userId || !priceId || !productName || !interval) return;

    // For subscription payments, create a Stripe subscription
    if (interval !== 'one-time') {
      try {
        // First, attach the payment method to the customer
        if (paymentIntent.payment_method) {
          await stripe.paymentMethods.attach(paymentIntent.payment_method as string, {
            customer: paymentIntent.customer as string,
          });

          // Set as default payment method
          await stripe.customers.update(paymentIntent.customer as string, {
            invoice_settings: {
              default_payment_method: paymentIntent.payment_method as string,
            },
          });
        }

        const subscription = await stripe.subscriptions.create({
          customer: paymentIntent.customer as string,
          items: [{ price: priceId }],
          default_payment_method: paymentIntent.payment_method as string,
          metadata: { userId, createdFromPaymentIntent: paymentIntent.id },
        });

        await prisma.subscription.create({
          data: {
            userId,
            stripeSubscriptionId: subscription.id,
            status: subscription.status,
            productName,
            priceId,
            interval,
            startDate: new Date(subscription.current_period_start * 1000),
            endDate: new Date(subscription.current_period_end * 1000),
            nextBillingDate: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          },
        });

        // Update user subscription status
        await prisma.user.update({
          where: { id: userId },
          data: { subscriptionStatus: productName },
        });
      } catch (error) {
        console.error('Error creating subscription from payment intent:', error);
      }
    }
  }

  private static async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    if (!userId) return;

    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );

    const price = subscription.items.data[0].price;
    const product = await stripe.products.retrieve(price.product as string);

    await prisma.subscription.create({
      data: {
        userId,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        productName: product.name,
        priceId: price.id,
        interval: price.recurring?.interval || 'one-time',
        startDate: new Date(subscription.current_period_start * 1000),
        endDate: new Date(subscription.current_period_end * 1000),
        nextBillingDate: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });

    // Update user subscription status to the product name
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: product.name,
      },
    });
  }

  private static async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    // Validate dates before creating Date objects
    const endDate = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null;
    const nextBillingDate = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null;
    
    // Only update if we have valid dates
    if (!endDate || isNaN(endDate.getTime()) || !nextBillingDate || isNaN(nextBillingDate.getTime())) {
      console.error('Invalid dates from Stripe subscription:', {
        current_period_end: subscription.current_period_end,
        subscription_id: subscription.id
      });
      return;
    }

    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: subscription.status,
        endDate,
        nextBillingDate,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        cancelledAt: subscription.cancel_at_period_end ? new Date() : null,
      },
    });
  }

  private static async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: 'canceled',
        endDate: new Date(),
      },
    });

    // Reset user to free tier
    const dbSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (dbSubscription) {
      await prisma.user.update({
        where: { id: dbSubscription.userId },
        data: { subscriptionStatus: 'FREE' },
      });
    }
  }

  static async getCurrentSubscription(userId: string) {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: ['active', 'trialing'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription) return null;

    // Get the Stripe subscription to get the latest billing info
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
    
    return {
      ...subscription,
      nextBillingDate: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    };
  }

  static async cancelSubscription(userId: string) {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: ['active', 'trialing'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription) {
      throw new Error('No active subscription found');
    }

    // Cancel immediately in Stripe (not at period end)
    const stripeSubscription = await stripe.subscriptions.cancel(
      subscription.stripeSubscriptionId
    );

    // Update in database - subscription is now cancelled immediately
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'canceled',
        cancelAtPeriodEnd: false,
        cancelledAt: new Date(),
        endDate: new Date(), // Ends immediately
      },
    });

    // Reset user to free tier immediately
    await prisma.user.update({
      where: { id: userId },
      data: { subscriptionStatus: 'FREE' },
    });

    return updatedSubscription;
  }

  static async reactivateSubscription(userId: string) {
    // Since we now cancel immediately, reactivation means creating a new subscription
    // This function is now primarily for UI compatibility - in practice, 
    // users would need to subscribe again through the normal flow
    throw new Error('Subscription was cancelled immediately. Please subscribe again to reactivate.');
  }

  // Removed mapStripePriceToTier - now using dynamic product names from Stripe
}