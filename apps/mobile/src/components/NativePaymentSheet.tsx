import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { apiService } from '../services/api';
import { paymentConfig } from '../config/payments';

interface NativePaymentSheetProps {
  priceId: string;
  planName: string;
  price: string;
  interval: string;
  onSuccess: () => void;
  onCancel: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export const NativePaymentSheet: React.FC<NativePaymentSheetProps> = ({
  priceId,
  planName,
  price,
  interval,
  onSuccess,
  onCancel,
  disabled = false,
  loading: externalLoading = false,
}) => {
  const { initPaymentSheet, presentPaymentSheet, handleURLCallback } = useStripe();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Handle deep links for 3D Secure and other redirects
  useEffect(() => {
    const handleDeepLink = async (url: string | null) => {
      if (url && url.includes(`${paymentConfig.app.returnUrlScheme}://payment-return`)) {
        await handleURLCallback(url);
      }
    };

    const getUrlAsync = async () => {
      const initialUrl = await Linking.getInitialURL();
      handleDeepLink(initialUrl);
    };

    getUrlAsync();

    const deepLinkListener = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => deepLinkListener.remove();
  }, [handleURLCallback]);

  const initializePaymentSheet = useCallback(async () => {
    try {
      setIsLoading(true);

      // Create Payment Intent on backend
      const response = await apiService.post<{ clientSecret: string }>('/subscriptions/create-payment-intent', {
        priceId,
      });

      if (!response.success || !response.data?.clientSecret) {
        throw new Error('Failed to get client secret');
      }

      const { clientSecret } = response.data;

      // Initialize the payment sheet
      const { error } = await initPaymentSheet({
        merchantDisplayName: paymentConfig.app.displayName,
        paymentIntentClientSecret: clientSecret,
        allowsDelayedPaymentMethods: false,
        defaultBillingDetails: {
          // Will be auto-filled if customer has saved details
        },
        applePay: {
          merchantCountryCode: paymentConfig.stripe.applePay.merchantCountryCode,
        },
        googlePay: {
          merchantCountryCode: paymentConfig.stripe.googlePay.merchantCountryCode,
          testEnv: __DEV__, // Use test environment in development
          currencyCode: paymentConfig.stripe.googlePay.currencyCode,
        },
        returnURL: `${paymentConfig.app.returnUrlScheme}://payment-return`,
        style: 'automatic', // Adapts to device theme
      });

      if (error) {
        console.error('Error initializing PaymentSheet:', error);
        Alert.alert('Error', 'Failed to initialize payment. Please try again.');
        return;
      }

      setIsInitialized(true);

    } catch (error) {
      console.error('Error initializing payment:', error);
      Alert.alert('Error', 'Failed to initialize payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [priceId, initPaymentSheet]);

  const handlePayment = useCallback(async () => {
    if (!isInitialized) {
      await initializePaymentSheet();
      return;
    }

    try {
      setIsLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const { error } = await presentPaymentSheet();

      if (error) {
        if (error.code === 'Canceled') {
          onCancel();
          return;
        }

        console.error('Error presenting PaymentSheet:', error);
        Alert.alert('Payment Failed', error.message || 'An error occurred during payment.');
        return;
      }

      // Payment succeeded
      Alert.alert(
        'Success!',
        `Your ${planName} subscription is now active! Welcome to premium.`,
        [
          {
            text: 'OK',
            onPress: onSuccess,
          },
        ]
      );

    } catch (error) {
      console.error('Error during payment:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, presentPaymentSheet, onSuccess, onCancel, initializePaymentSheet, planName]);

  // Initialize payment sheet when component mounts
  useEffect(() => {
    if (priceId) {
      initializePaymentSheet();
    }
  }, [initializePaymentSheet, priceId]);

  const isButtonLoading = isLoading || externalLoading;
  const isButtonDisabled = disabled || isButtonLoading;

  return (
    <TouchableOpacity
      style={[styles.paymentButton, isButtonDisabled && styles.disabledButton]}
      onPress={handlePayment}
      disabled={isButtonDisabled}
      activeOpacity={0.8}
    >
      {isButtonLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={styles.loadingText}>
            {isInitialized ? 'Processing...' : 'Preparing...'}
          </Text>
        </View>
      ) : (
        <View style={styles.buttonContent}>
          <Text style={styles.buttonText}>
            Subscribe Now • ${price}/{interval}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  paymentButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
});