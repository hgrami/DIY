import 'react-native-url-polyfill/auto';
import './src/utils/crypto-polyfill';
import React from 'react';
import { ClerkProvider } from '@clerk/clerk-expo';
import { StripeProvider } from '@stripe/stripe-react-native';
import { AuthProvider } from './src/context/AuthContext';
import { Navigation } from './src/navigation';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { paymentConfig } from './src/config/payments';

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in environment variables');
}

export default function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <StripeProvider 
        publishableKey={paymentConfig.stripe.publishableKey}
        merchantIdentifier={paymentConfig.stripe.merchantIdentifier}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <BottomSheetModalProvider>
            <AuthProvider>
              <Navigation />
            </AuthProvider>
          </BottomSheetModalProvider>
        </GestureHandlerRootView>
      </StripeProvider>
    </ClerkProvider>
  );
}
