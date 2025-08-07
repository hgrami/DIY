export * from './checklists';

// User types
export interface User {
    id: string;
    email: string;
    clerkId: string;
    subscriptionStatus: string; // Dynamic product name (e.g., "Premium", "FREE")
    createdAt: Date;
    updatedAt: Date;
}

// Subscription types
export interface Subscription {
    id: string;
    userId: string;
    stripeSubscriptionId: string;
    status: string;
    productName: string; // Dynamic product name (e.g., "Premium")
    priceId: string; // Stripe price ID
    interval: string; // "month" or "year"
    startDate: Date;
    endDate: Date;
    nextBillingDate?: Date;
    cancelledAt?: Date;
    cancelAtPeriodEnd?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// Promo code types
export interface PromoCode {
    id: string;
    code: string;
    subscriptionType: string;
    durationDays: number | null;
    expiresAt: Date;
    usageLimit: number;
    usedCount: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface PromoCodeRedemptionResponse {
    subscriptionType: string;
    expiresAt: Date | null;
    isLifetime: boolean;
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

export type AuthUser = {
    id: string;
    email: string;
    subscriptionStatus?: string;
    subscription?: Subscription;
};

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