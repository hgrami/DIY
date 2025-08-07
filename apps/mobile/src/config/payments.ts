/**
 * Payment Configuration
 * 
 * This file contains payment-related configuration for the app.
 * Update these values when setting up your own Stripe integration.
 */

export interface PaymentConfig {
  stripe: {
    publishableKey: string;
    merchantIdentifier: string;
    applePay: {
      merchantId: string;
      merchantCountryCode: string;
    };
    googlePay: {
      merchantId: string;
      merchantCountryCode: string;
      currencyCode: string;
      countryCode: string;
    };
  };
  app: {
    displayName: string;
    returnUrlScheme: string;
  };
}

// Default configuration - update these for your app
export const paymentConfig: PaymentConfig = {
  stripe: {
    publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_stripe_key_here',
    // This is a test merchant identifier - replace with your own for production
    merchantIdentifier: process.env.EXPO_PUBLIC_STRIPE_MERCHANT_IDENTIFIER || 'merchant.com.example.silverspoon',
    applePay: {
      // Replace with your Apple Pay merchant ID from Apple Developer Console
      merchantId: process.env.EXPO_PUBLIC_APPLE_PAY_MERCHANT_ID || 'merchant.com.example.silverspoon',
      merchantCountryCode: process.env.EXPO_PUBLIC_MERCHANT_COUNTRY_CODE || 'US',
    },
    googlePay: {
      // Replace with your Google Pay merchant ID from Google Pay Console  
      merchantId: process.env.EXPO_PUBLIC_GOOGLE_PAY_MERCHANT_ID || 'merchant.com.example.silverspoon',
      merchantCountryCode: process.env.EXPO_PUBLIC_MERCHANT_COUNTRY_CODE || 'US',
      currencyCode: process.env.EXPO_PUBLIC_CURRENCY_CODE || 'USD',
      countryCode: process.env.EXPO_PUBLIC_MERCHANT_COUNTRY_CODE || 'US',
    },
  },
  app: {
    displayName: process.env.EXPO_PUBLIC_APP_DISPLAY_NAME || 'Silver Spoon',
    returnUrlScheme: process.env.EXPO_PUBLIC_URL_SCHEME || 'silverspoonapp',
  },
};

/**
 * Instructions for setup:
 * 
 * 1. STRIPE_MERCHANT_IDENTIFIER:
 *    - This can be any unique identifier for development/testing
 *    - For production with Apple Pay, you need a real Apple Pay merchant ID
 * 
 * 2. APPLE_PAY_MERCHANT_ID:
 *    - Get this from Apple Developer Console > Certificates, Identifiers & Profiles > Merchant IDs
 *    - Only needed if you want to enable Apple Pay
 * 
 * 3. GOOGLE_PAY_MERCHANT_ID:
 *    - Get this from Google Pay Console
 *    - Only needed if you want to enable Google Pay
 * 
 * 4. For testing, you can use the default values provided
 */