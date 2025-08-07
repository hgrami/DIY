export * from './checklists';

// User types
export interface User {
  id: string;
  email: string;
  clerkId: string;
  subscriptionStatus: SubscriptionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum SubscriptionStatus {
  FREE = 'FREE',
  BASIC = 'BASIC',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE'
}

// Subscription types
export interface Subscription {
  id: string;
  userId: string;
  stripeSubscriptionId: string;
  status: string;
  tier: SubscriptionStatus;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Promo code types
export interface PromoCode {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  expiresAt: Date;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED'
}

// Stripe types
export interface StripeProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
}

// Auth types
export interface AuthToken {
  token: string;
  refreshToken?: string;
  expiresAt: number;
}

export interface AuthUser {
  id: string;
  email: string;
  subscriptionStatus: SubscriptionStatus;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Navigation types
export type RootStackParamList = {
  Authenticated: undefined;
  Unauthenticated: undefined;
};

export type AuthenticatedStackParamList = {
  Home: undefined;
  Settings: undefined;
  Subscription: undefined;
};

export type UnauthenticatedStackParamList = {
  Login: undefined;
  SignUp: undefined;
};