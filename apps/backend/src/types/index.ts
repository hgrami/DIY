import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    clerkId: string;
    subscriptionStatus: string; // Dynamic product name (e.g., "Premium", "FREE")
  };
}

export interface StripeCheckoutSession {
  id: string;
  url: string;
  amount_total: number;
  currency: string;
}

export interface StripeProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
}

export interface PromoCodeValidationResult {
  isValid: boolean;
  discountAmount: number;
  discountType: 'PERCENTAGE' | 'FIXED';
  error?: string;
}