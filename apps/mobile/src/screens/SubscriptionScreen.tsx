import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Keyboard,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuthContext } from '../context/AuthContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { ScreenWithHeader } from '../components/ScreenWithHeader';
import { NativePaymentSheet } from '../components/NativePaymentSheet';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { apiService } from '../services/api';
import { StripeProduct, Subscription, PromoCodeRedemptionResponse } from '../@types';
import { PromoCodeModal, PromoCodeModalRef } from '../components/Subscriptions/PromoCodeModal';

type BillingPeriod = 'month' | 'year';

type GroupedProduct = {
  name: string;
  description: string;
  features: string[];
  monthlyPrice: StripeProduct | null;
  yearlyPrice: StripeProduct | null;
};

export const SubscriptionScreen: React.FC = () => {
  const { user, refreshUser } = useAuthContext();
  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('month');
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [redeemingPromo, setRedeemingPromo] = useState(false);
  const promoModalRef = useRef<PromoCodeModalRef>(null);

  useEffect(() => {
    fetchProducts();
    fetchCurrentSubscription();
  }, []);



  const fetchCurrentSubscription = async () => {
    if (!user || user.subscriptionStatus === 'FREE') return;

    try {
      const response = await apiService.get<Subscription>('/subscriptions/current');

      if (response.success && response.data) {
        setCurrentSubscription(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch current subscription:', error);
    }
  };

  const pollForSubscriptionUpdate = async (attempts = 0): Promise<boolean> => {
    if (attempts >= 10) return false; // Max 10 attempts over 20 seconds

    try {
      const response = await apiService.get<Subscription>('/subscriptions/current');

      if (response.success && response.data) {
        setCurrentSubscription(response.data);
        return true;
      }

      // Wait 2 seconds before next attempt
      await new Promise(resolve => setTimeout(resolve, 2000));
      return await pollForSubscriptionUpdate(attempts + 1);
    } catch (error) {
      console.error('Polling error:', error);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return await pollForSubscriptionUpdate(attempts + 1);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<StripeProduct[]>('/subscriptions/products');

      if (response.success && response.data) {
        console.log('response.data', response.data);
        setProducts(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      Alert.alert('Error', 'Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const groupProductsByPlan = (): GroupedProduct[] => {
    const grouped: { [key: string]: GroupedProduct } = {};

    products.forEach((product) => {
      const planName = product.name.replace(/\s+(Monthly|Yearly|Annual)$/i, '');

      if (!grouped[planName]) {
        grouped[planName] = {
          name: planName,
          description: product.description,
          features: product.features,
          monthlyPrice: null,
          yearlyPrice: null,
        };
      }

      if (product.interval === 'month') {
        grouped[planName].monthlyPrice = product;
      } else if (product.interval === 'year') {
        grouped[planName].yearlyPrice = product;
      }
    });

    return Object.values(grouped);
  };


  const getDiscountPercentage = (monthly: number, yearly: number): number => {
    const yearlyMonthly = yearly / 12;
    return Math.round(((monthly - yearlyMonthly) / monthly) * 100);
  };

  const handleCancelSubscription = async () => {
    if (!currentSubscription) return;

    Alert.alert(
      'Cancel Subscription',
      `Are you sure you want to cancel your ${currentSubscription.productName} subscription? Your access will end immediately and billing will stop.`,
      [
        {
          text: 'Keep Subscription',
          style: 'cancel',
        },
        {
          text: 'Cancel Now',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

              const response = await apiService.post('/subscriptions/cancel', {});

              if (response.success) {
                Alert.alert(
                  'Subscription Cancelled',
                  'Your subscription has been cancelled immediately. You can subscribe again anytime.'
                );
                // Refresh both subscription data and user context
                await Promise.all([
                  fetchCurrentSubscription(),
                  refreshUser()
                ]);
              } else {
                Alert.alert('Error', 'Failed to cancel subscription');
              }
            } catch (error) {
              console.error('Cancellation error:', error);
              Alert.alert('Error', 'Failed to cancel subscription');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };


  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Check if user has lifetime access
  const hasLifetimeAccess = () => {
    if (!currentSubscription) return false;

    // Check for lifetime indicators
    // 1. No next billing date (lifetime doesn't need billing)
    // 2. Interval is "lifetime" 
    // 3. Very far future end date (more than 50 years from now)
    const now = new Date();
    const fiftyYearsFromNow = new Date(now.getFullYear() + 50, now.getMonth(), now.getDate());

    return !currentSubscription.nextBillingDate ||
      currentSubscription.interval?.toLowerCase() === 'lifetime' ||
      (currentSubscription.endDate && new Date(currentSubscription.endDate) > fiftyYearsFromNow);
  };

  const handleRedeemCode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPromoModal(true);
    // Small delay to allow bottom sheet to animate before focusing
    setTimeout(() => {
      promoModalRef.current?.focus();
    }, 600);
  }, []);

  const handlePromoCodeSubmit = async (code: string) => {
    try {
      setRedeemingPromo(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const response = await apiService.post<PromoCodeRedemptionResponse>('/subscriptions/redeem-promo',
        { code: code.trim() }
      );

      if (response.success && response.data) {
        const { subscriptionType, isLifetime, expiresAt } = response.data;

        setShowPromoModal(false);

        const message = isLifetime
          ? `Congratulations! You now have ${subscriptionType} access forever!`
          : `Congratulations! You now have ${subscriptionType} access until ${expiresAt ? formatDate(new Date(expiresAt)) : 'unknown date'}`;

        Alert.alert('Code Redeemed Successfully!', message);

        // Refresh both subscription data and user context
        await Promise.all([
          fetchCurrentSubscription(),
          refreshUser()
        ]);
      } else {
        Alert.alert('Error', response.error || 'Failed to redeem promo code');
      }
    } catch (error: any) {
      console.error('Redeem promo code error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to redeem promo code');
    } finally {
      setRedeemingPromo(false);
    }
  };

  if (loading && products.length === 0) {
    return (
      <ScreenWithHeader title="Subscription">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading subscription plans...</Text>
        </View>
      </ScreenWithHeader>
    );
  }

  return (
    <ScreenWithHeader
      title="Subscription"
      rightComponent={
        !hasLifetimeAccess() ? (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleRedeemCode}
            disabled={loading}
          >
            <Text style={styles.headerButtonIcon}>🎟️</Text>
          </TouchableOpacity>
        ) : undefined
      }
    >
      <View style={styles.container}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Current Plan */}
          <Card variant="elevated" style={styles.currentPlanCard}>
            <View style={styles.currentPlanHeader}>
              <Text style={styles.sectionTitle}>Current Plan</Text>
              <View style={[
                styles.planBadge,
                currentSubscription?.cancelAtPeriodEnd && styles.planBadgeCancelled
              ]}>
                <Text style={[
                  styles.planBadgeText,
                  currentSubscription?.cancelAtPeriodEnd && styles.planBadgeTextCancelled
                ]}>
                  {currentSubscription?.cancelAtPeriodEnd ? 'CANCELLED' : (user?.subscriptionStatus || 'FREE')}
                </Text>
              </View>
            </View>

            {currentSubscription ? (
              <View>
                <Text style={styles.planDescription}>
                  {hasLifetimeAccess()
                    ? 'Lifetime Access - No billing required'
                    : currentSubscription.cancelAtPeriodEnd
                      ? `Access until ${formatDate(currentSubscription.nextBillingDate || currentSubscription.endDate)}`
                      : `Next billing: ${formatDate(currentSubscription.nextBillingDate || currentSubscription.endDate)}`
                  }
                </Text>

                {!hasLifetimeAccess() && (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancelSubscription}
                    disabled={loading}
                  >
                    <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View>
                <Text style={styles.planDescription}>
                  {user?.subscriptionStatus === 'FREE'
                    ? 'Basic features included'
                    : 'Premium features unlocked'
                  }
                </Text>
              </View>
            )}

            {/* Promo Code Link - Hide for lifetime users */}
            {!hasLifetimeAccess() && (
              <TouchableOpacity
                style={styles.promoCodeLink}
                onPress={handleRedeemCode}
                disabled={loading}
              >
                <Text style={styles.promoCodeLinkText}>Have a promo code? Redeem it here</Text>
              </TouchableOpacity>
            )}
          </Card>

          {/* Available Plans - Hide for lifetime users since they have the best access */}
          {!hasLifetimeAccess() && (
            <>
              {/* Billing Period Toggle */}
              <View style={styles.billingToggle}>
                <Text style={styles.sectionTitle}>Available Plans</Text>
                <View style={styles.toggleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      billingPeriod === 'month' && styles.toggleButtonActive,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setBillingPeriod('month');
                    }}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        billingPeriod === 'month' && styles.toggleTextActive,
                      ]}
                    >
                      Monthly
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      billingPeriod === 'year' && styles.toggleButtonActive,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setBillingPeriod('year');
                    }}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        billingPeriod === 'year' && styles.toggleTextActive,
                      ]}
                    >
                      Yearly
                    </Text>
                    {billingPeriod === 'year' && (
                      <View style={styles.savingsBadge}>
                        <Text style={styles.savingsText}>Save 33%</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {groupProductsByPlan().map((groupedProduct) => {
                const selectedProduct = billingPeriod === 'month'
                  ? groupedProduct.monthlyPrice
                  : groupedProduct.yearlyPrice;

                if (!selectedProduct) return null;

                const hasYearlyDiscount = groupedProduct.monthlyPrice && groupedProduct.yearlyPrice
                  && billingPeriod === 'year';

                const discountPercentage = hasYearlyDiscount
                  ? getDiscountPercentage(groupedProduct.monthlyPrice!.price, groupedProduct.yearlyPrice!.price)
                  : 0;

                const isPopular = groupedProduct.name.toLowerCase() === 'premium';

                return (
                  <View key={groupedProduct.name} style={[isPopular ? styles.popularContainer : null]}>
                    <Card style={styles.productCard}>
                      {isPopular && (
                        <View style={styles.popularHeader}>
                          <View style={styles.popularBadge}>
                            <Text style={styles.popularText}>Most Popular</Text>
                          </View>
                        </View>
                      )}
                      <View style={styles.productHeader}>
                        <View>
                          <Text style={styles.productName}>{groupedProduct.name}</Text>
                          {hasYearlyDiscount && (
                            <View style={styles.discountBadge}>
                              <Text style={styles.discountText}>
                                Save {discountPercentage}%
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.priceContainer}>
                          <Text style={styles.productPrice}>
                            ${selectedProduct.price}/{billingPeriod}
                          </Text>
                          {billingPeriod === 'year' && groupedProduct.monthlyPrice && (
                            <Text style={styles.monthlyEquivalent}>
                              ${(selectedProduct.price / 12).toFixed(2)}/month
                            </Text>
                          )}
                        </View>
                      </View>

                      <Text style={styles.productDescription}>
                        {groupedProduct.description}
                      </Text>

                      <View style={styles.features}>
                        {groupedProduct.features.length > 0
                          ? groupedProduct.features.map((feature: string, index: number) => (
                            <Text key={index} style={styles.feature}>
                              ✓ {feature}
                            </Text>
                          ))
                          : [
                            'Access to all premium features',
                            'Priority customer support',
                            'Advanced analytics',
                            'Custom integrations'
                          ].map((feature, index) => (
                            <Text key={index} style={styles.feature}>
                              ✓ {feature}
                            </Text>
                          ))
                        }
                      </View>

                      {user?.subscriptionStatus === groupedProduct.name.toUpperCase() ? (
                        <Button
                          title="Current Plan"
                          onPress={() => { }}
                          variant="outline"
                          disabled={true}
                          style={styles.subscribeButton}
                        />
                      ) : (
                        <>
                          <NativePaymentSheet
                            priceId={selectedProduct.id}
                            planName={groupedProduct.name}
                            price={selectedProduct.price.toString()}
                            interval={billingPeriod}
                            onSuccess={async () => {
                              Alert.alert('Payment Successful!', 'Activating your subscription...');

                              // Poll for subscription update
                              const subscriptionUpdated = await pollForSubscriptionUpdate();

                              if (subscriptionUpdated) {
                                Alert.alert('Success!', 'Your subscription has been activated!');
                              } else {
                                Alert.alert(
                                  'Payment Processed',
                                  'Your payment was successful. Your subscription will be activated within a few minutes.'
                                );
                              }

                              // Refresh both subscription data and user context
                              await Promise.all([
                                fetchCurrentSubscription(),
                                fetchProducts(),
                                refreshUser()
                              ]);
                            }}
                            onCancel={() => {
                              console.log('Payment cancelled by user');
                            }}
                            disabled={loading}
                            loading={loading}
                          />

                          <View style={styles.trustIndicators}>
                            <Text style={styles.trustText}>🔒 Secure payment • 30-day money back guarantee</Text>
                          </View>
                        </>
                      )}
                    </Card>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      </View>

      {/* Promo Code Modal */}
      <PromoCodeModal
        ref={promoModalRef}
        isVisible={showPromoModal}
        onClose={() => setShowPromoModal(false)}
        onRedeem={handlePromoCodeSubmit}
        redeemingPromo={redeemingPromo}
      />
    </ScreenWithHeader>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  scrollContent: {
    paddingBottom: 20, // Normal bottom padding
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  currentPlan: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  planDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  productCard: {
    marginBottom: 16,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  productName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  productDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
  },
  features: {
    marginBottom: 16,
  },
  feature: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  subscribeButton: {
    marginTop: 8,
  },
  billingToggle: {
    marginBottom: 20,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 4,
    marginTop: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  toggleTextActive: {
    color: '#6366F1',
    fontWeight: '700',
  },
  discountBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  discountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  monthlyEquivalent: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  currentPlanCard: {
    marginBottom: 24,
  },
  currentPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 0,
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 16,
  },
  popularHeader: {
    alignItems: 'flex-end',
    marginBottom: 8,
    minHeight: 24,
  },
  popularBadge: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  popularText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  popularCard: {
    marginTop: 16,
  },
  popularContainer: {
    marginBottom: 16,
  },
  savingsBadge: {
    position: 'absolute',
    top: -6,
    right: -4,
    backgroundColor: '#10B981',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    minWidth: 50,
    alignItems: 'center',
  },
  savingsText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  trustIndicators: {
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  trustText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 16,
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  planBadgeCancelled: {
    backgroundColor: '#EF4444',
    borderWidth: 0,
  },
  planBadgeTextCancelled: {
    color: '#FFFFFF',
  },
  reactivateButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    alignItems: 'center',
  },
  reactivateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22C55E',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  headerButtonIcon: {
    fontSize: 20,
  },
  promoCodeLink: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  promoCodeLinkText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },

});