import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Linking,
  ScrollView,
  Dimensions,
  Image,
  BackHandler,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { COLORS, FONTS, SPACING } from '../../constants/styling';
import { SubscriptionService } from '../../services/SubscriptionService';

const PaywallScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'monthly' | 'yearly'>('yearly');
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const handleClose = () => {
    // Get the navigation state to check previous screen
    const state = navigation.getState();
    const routes = state.routes;
    const currentIndex = state.index;

    // Check if we came from Splash or Onboarding
    if (currentIndex > 0) {
      const previousRoute = routes[currentIndex - 1];
      if (previousRoute.name === 'Splash' || previousRoute.name === 'Onboarding') {
        // If coming from Splash or Onboarding, go to MainTabs
        navigation.navigate('MainTabs');
        return;
      }
    }

    // Otherwise, go back to previous screen
    navigation.goBack();
  };

  const handlePurchase = async (productId: string) => {
    setLoading(true);
    try {
      await SubscriptionService.purchaseSubscription(productId);
    } catch (error: any) {
      console.error('Purchase error:', error);

      // ✅ IMPROVED: Specific error messages based on error codes
      if (error.code === 'E_USER_CANCELLED') {
        // User cancelled - no alert needed
        return;
      } else if (error.code === 'E_NETWORK_ERROR') {
        Alert.alert(
          'Connection Error',
          'Please check your internet connection and try again.'
        );
      } else if (error.code === 'E_ITEM_UNAVAILABLE') {
        Alert.alert(
          'Product Unavailable',
          'This subscription is temporarily unavailable. Please try again later.'
        );
      } else if (error.code === 'E_RECEIPT_FAILED' || error.code === 'E_RECEIPT_FINISHED_FAILED') {
        Alert.alert(
          'Verification Error',
          'There was an issue verifying your purchase. Please contact support if this persists.'
        );
      } else if (error.code === 'E_DEVELOPER_ERROR') {
        Alert.alert(
          'Configuration Error',
          'There is a configuration issue. Please contact support.'
        );
      } else {
        // Generic error for unknown issues
        Alert.alert(
          'Purchase Failed',
          'An unexpected error occurred. Please try again or contact support.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    const restored = await SubscriptionService.restorePurchases();
    setLoading(false);

    if (restored) {
      Alert.alert(
        'Success!',
        'Your purchases have been restored. You now have premium access!',
        [{ text: 'OK', onPress: () => navigation.navigate('MainTabs') }]
      );
    } else {
      Alert.alert(
        'No Purchases Found',
        "We couldn't find any previous purchases for this Apple ID."
      );
    }
  };

  const productIds = SubscriptionService.getProductIds();

  // Fetch subscription products from App Store
  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const subs = await SubscriptionService.getSubscriptionProducts();
        console.log('📱 PaywallScreen received products:', subs);

        if (subs && subs.length > 0) {
          setProducts(subs);
          console.log('✅ Products set successfully');
        } else {
          console.warn('⚠️ No products received, showing error state');
          setProducts([]);
        }
      } catch (error) {
        console.error('❌ Error in PaywallScreen fetchProducts:', error);
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  // Handle Android hardware back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleClose();
        return true; // Prevent default back behavior
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => backHandler.remove();
    }, [])
  );

  // Helper function to get product by plan type
  const getProduct = (planType: 'weekly' | 'monthly' | 'yearly'): any => {
    const productId = planType === 'yearly'
      ? productIds.YEARLY
      : planType === 'monthly'
        ? productIds.MONTHLY
        : productIds.WEEKLY;

    // ✅ FIX: Products use 'id' field (from react-native-iap v9+), check both for compatibility
    const product = products.find(p => (p.id === productId) || (p.productId === productId));

    if (!product) {
      console.warn(`⚠️ Product not found for ${planType} (${productId}). Available products:`, products.map(p => p.id || p.productId));
    }

    return product;
  };

  // Get formatted price with currency - MUST be from App Store, no fallback
  const getFormattedPrice = (planType: 'weekly' | 'monthly' | 'yearly'): string => {
    const product = getProduct(planType);
    // ✅ FIX: Products use 'displayPrice' or 'localizedPrice'
    if (product?.localizedPrice) {
      return product.localizedPrice;
    }
    if (product?.displayPrice) {
      return product.displayPrice;
    }

    // No dummy fallback - return loading state
    return 'Loading...';
  };


  // Get trial days number - MUST be from App Store, no fallback
  const getTrialDays = (planType: 'weekly' | 'monthly' | 'yearly'): number => {
    const product = getProduct(planType);

    // Only get from actual product data from App Store
    if (product?.introductoryPrice && product.introductoryPrice === '0') {
      const days = product.introductoryPriceNumberOfPeriodsIOS || 0;
      if (days > 0) {
        return days;
      }
    }

    // No dummy fallback - return 0 if not available
    return 0;
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://appsflowstudio.blogspot.com/2025/12/privacy-policy.html');
  };

  const handleTerms = () => {
    Linking.openURL('https://appsflowstudio.blogspot.com/2025/12/terms-conditions.html');
  };

  // 🎯 CONFIGURE DISCOUNT PERCENTAGES HERE
  // Change discountPercent to adjust both strikethrough price and "Save X%" text
  const plans = [
    {
      id: 'yearly',
      name: 'Yearly',
      period: '/year',
      badge: 'BEST VALUE',
      discountPercent: 50  // 50% discount → shows "Save 50%"
    },
    {
      id: 'monthly',
      name: 'Monthly',
      period: '/month',
      badge: 'POPULAR',
      discountPercent: 0  // No discount
    },
    {
      id: 'weekly',
      name: 'Weekly',
      period: '/week',
      badge: null,
      discountPercent: 0  // No discount for weekly
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#E8F5E9" />

      {/* Gradient Background - Professional Smooth Gradient */}
      <LinearGradient
        colors={['#E8F5E9', '#F1F8E9', '#FAFAFA', '#FFFFFF']}
        locations={[0, 0.3, 0.6, 1]}
        style={styles.gradientBackground}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleClose}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={24} color={COLORS.dark} />
        </TouchableOpacity>
      </View>

      {/* Content - Title at top, everything else at bottom */}
      <View style={styles.contentWrapper}>
        <View style={styles.content}>
          <View style={styles.crownContainer}>
            <Image
              source={require('../../assets/images/crown.png')}
              style={styles.crownImage}
              resizeMode="contain"
            />
          </View>
          <ScrollView
            style={styles.scrollSection}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.titleSection}>
              <Text style={styles.title}>Unlock Premium</Text>
              <Text style={styles.subtitle}>Get unlimited access to all features</Text>
            </View>
            {/* Key Features - Compact */}
            <View style={styles.featuresSection}>
              <FeatureRow icon="infinite" text="Unlimited AI Requests Daily" />
              <FeatureRow icon="document-text" text="Unlimited Words Per Request" />
              <FeatureRow icon="flash" text="Priority Processing Speed" />
              <FeatureRow icon="shield-checkmark" text="Complete Ad-Free Experience" />
            </View>

            {/* Plans - Fixed Height */}
            <View style={styles.plansSection}>
              {loadingProducts && products.length === 0 ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.loadingText}>Loading subscription plans...</Text>
                </View>
              ) : products.length === 0 ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>Unable to load subscription plans. Please check your connection and try again.</Text>
                </View>
              ) : (
                plans.map((plan) => {
                  const planType = plan.id as 'weekly' | 'monthly' | 'yearly';
                  const isSelected = selectedPlan === planType;
                  const product = getProduct(planType);
                  // ✅ FIX: Check both localizedPrice and displayPrice
                  const hasProduct = !!(product?.localizedPrice || product?.displayPrice);

                  return (
                    <TouchableOpacity
                      key={plan.id}
                      style={[styles.planCard, isSelected && styles.planCardSelected, !hasProduct && styles.planCardDisabled]}
                      onPress={() => hasProduct && setSelectedPlan(planType)}
                      activeOpacity={hasProduct ? 0.8 : 1}
                      disabled={!hasProduct}
                    >
                      {plan.badge && plan.id === 'yearly' && (
                        <View style={[styles.badge, styles.badgeBest]}>
                          <Text style={styles.badgeText}>{plan.badge}</Text>
                        </View>
                      )}

                      <View style={styles.planContent}>
                        <View style={styles.planLeft}>
                          <View style={styles.radioOuter}>
                            {isSelected && <View style={styles.radioInner} />}
                          </View>
                          <View>
                            <Text style={styles.planName}>{plan.name}</Text>
                          </View>
                        </View>

                        <View style={styles.planRight}>
                          <View style={styles.priceRow}>
                            <Text style={styles.actualPrice}>{getFormattedPrice(planType)}</Text>
                            <Text style={styles.period}>{plan.period}</Text>
                          </View>
                          {plan.discountPercent > 0 && (
                            <Text style={styles.savings}>Save {plan.discountPercent}%</Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </ScrollView>

          {/* Fixed Bottom Section - Subscribe Button & Links */}
          <View style={styles.fixedBottomSection}>
            {/* Subscribe Button */}
            <TouchableOpacity
              style={[styles.subscribeButton, (loading || loadingProducts || products.length === 0) && styles.buttonDisabled]}
              activeOpacity={0.8}
              onPress={() =>
                handlePurchase(
                  selectedPlan === 'yearly'
                    ? productIds.YEARLY
                    : selectedPlan === 'monthly'
                      ? productIds.MONTHLY
                      : productIds.WEEKLY
                )
              }
              disabled={loading || loadingProducts || products.length === 0}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <View style={styles.buttonTextContainer}>
                  <Text style={styles.subscribeButtonText}>
                    {selectedPlan === 'yearly'
                      ? 'Start For Free'
                      : 'Continue'}
                  </Text>
                  {selectedPlan === 'yearly' && getTrialDays('yearly') > 0 && (
                    <Text style={styles.buttonSubText}>
                      ({getTrialDays('yearly')} days free trial)
                    </Text>
                  )}
                </View>
              )}
            </TouchableOpacity>

            {/* Cancel Anytime */}
            <Text style={styles.cancelText}>No commitment • Cancel anytime</Text>

            {/* Restore & Links */}
            <View style={styles.linksRow}>
              <TouchableOpacity onPress={handleRestore} disabled={loading}>
                <Text style={styles.linkText}>Restore Purchase</Text>
              </TouchableOpacity>
              <Text style={styles.linkDivider}>•</Text>
              <TouchableOpacity onPress={handlePrivacyPolicy}>
                <Text style={styles.linkText}>Privacy Policy</Text>
              </TouchableOpacity>
              <Text style={styles.linkDivider}>•</Text>
              <TouchableOpacity onPress={handleTerms}>
                <Text style={styles.linkText}>Terms of Use</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

// Feature Row Component
const FeatureRow: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <View style={styles.featureRow}>
    <Ionicons name={icon as any} size={18} color={COLORS.primary} />
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    zIndex: 10,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    paddingHorizontal: SPACING.lg,
  },
  crownContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    minHeight: Dimensions.get('window').height < 700 ? 0 : Dimensions.get('window').height < 800 ? 70 : 90,
    maxHeight: Dimensions.get('window').height < 700 ? 0 : Dimensions.get('window').height < 800 ? 110 : 140,
  },
  crownImage: {
    width: '100%',
    height: '100%',
  },
  titleSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xxl,
  },
  title: {
    fontSize: Dimensions.get('window').height < 700 ? 28 : 32,
    fontFamily: FONTS.sora.bold,
    color: COLORS.dark,
    marginTop: SPACING.xs,
  },
  subtitle: {
    fontSize: Dimensions.get('window').height < 700 ? 12 : 14,
    fontFamily: FONTS.dmSans.regular,
    color: COLORS.gray,
  },
  scrollSection: {
    flexShrink: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingBottom: SPACING.xs,
  },
  fixedBottomSection: {
    paddingVertical: SPACING.sm,
  },
  featuresSection: {
    marginBottom: SPACING.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs_sm,
  },
  featureText: {
    fontSize: Dimensions.get('window').height < 700 ? 12 : 14,
    fontFamily: FONTS.sora.medium,
    color: COLORS.dark,
    marginLeft: SPACING.sm,
  },
  plansSection: {
    gap: SPACING.sm,
  },
  planCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm_md,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F8FDF2',
  },
  planCardDisabled: {
    opacity: 0.5,
  },
  badge: {
    position: 'absolute',
    top: -12,
    right: 14,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeBest: {
    backgroundColor: COLORS.primary,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: FONTS.sora.bold,
    letterSpacing: 0.5,
    color: COLORS.dark
  },
  planContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  planName: {
    fontSize: Dimensions.get('window').height < 700 ? 15 : 17,
    fontFamily: FONTS.sora.bold,
    color: COLORS.dark,
  },
  planRight: {
    alignItems: 'flex-end',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  actualPrice: {
    fontSize: Dimensions.get('window').height < 700 ? 18 : 22,
    fontFamily: FONTS.sora.bold,
    color: COLORS.dark,
  },
  period: {
    fontSize: Dimensions.get('window').height < 700 ? 11 : 13,
    fontFamily: FONTS.sora.regular,
    color: '#6B7280',
    marginLeft: 2,
  },
  savings: {
    fontSize: 11,
    fontFamily: FONTS.sora.medium,
    color: '#10B981',
    marginTop: 2,
  },
  subscribeButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SPACING.sm_md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: SPACING.sm,
    // Shadow for iOS
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    // Shadow for Android
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  subscribeButtonText: {
    fontSize: 16,
    fontFamily: FONTS.sora.bold,
    color: COLORS.dark,
  },
  buttonSubText: {
    fontSize: 11,
    fontFamily: FONTS.sora.regular,
    color: COLORS.dark,
    marginTop: 2,
    opacity: 0.8,
  },
  cancelText: {
    fontSize: 12,
    fontFamily: FONTS.sora.regular,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs_sm,
    gap: SPACING.sm,
  },
  linkText: {
    fontSize: 12,
    fontFamily: FONTS.sora.medium,
    color: COLORS.dark,
  },
  linkDivider: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  loadingContainer: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: FONTS.dmSans.medium,
    color: COLORS.gray,
    marginTop: SPACING.sm,
  },
  errorContainer: {
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 13,
    fontFamily: FONTS.dmSans.medium,
    color: '#DC2626',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default PaywallScreen;
