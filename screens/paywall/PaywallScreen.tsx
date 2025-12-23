import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { SubscriptionService } from '../../services/SubscriptionService';
import { COLORS, FONTS, SPACING } from '../../constants/styling';

const PaywallScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'monthly' | 'yearly'>('yearly');
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const handlePurchase = async (productId: string) => {
    setLoading(true);
    try {
      await SubscriptionService.purchaseSubscription(productId);
    } catch (error: any) {
      console.error('Purchase error:', error);
      if (error.code !== 'E_USER_CANCELLED') {
        Alert.alert('Purchase Failed', 'Please try again or contact support.');
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
      const subs = await SubscriptionService.getSubscriptionProducts();
      setProducts(subs);
      setLoadingProducts(false);
    };

    fetchProducts();
  }, []);

  // Helper function to get product by plan type
  const getProduct = (planType: 'weekly' | 'monthly' | 'yearly'): any => {
    const productId = planType === 'yearly'
      ? productIds.YEARLY
      : planType === 'monthly'
        ? productIds.MONTHLY
        : productIds.WEEKLY;

    return products.find(p => p.productId === productId);
  };

  // Get formatted price with currency
  const getFormattedPrice = (planType: 'weekly' | 'monthly' | 'yearly'): string => {
    const product = getProduct(planType);
    if (product?.localizedPrice) {
      return product.localizedPrice;
    }

    return planType === 'yearly' ? '$29.99'
      : planType === 'monthly' ? '$9.99'
        : '$4.99';
  };

  // Get strikethrough price based on discount percentage
  const getStrikethroughPrice = (planType: 'weekly' | 'monthly' | 'yearly'): string => {
    const product = getProduct(planType);
    const plan = plans.find(p => p.id === planType);
    const discountPercent = plan?.discountPercent || 30;

    if (product?.price) {
      const actualPrice = parseFloat(product.price);
      // Calculate strikethrough price: actual price / (1 - discount%)
      // Example: $29.99 / (1 - 0.30) = $29.99 / 0.70 = $42.84
      const strikePrice = (actualPrice / (1 - discountPercent / 100)).toFixed(2);
      return product.currency === 'USD' ? `$${strikePrice}` : `${strikePrice}`;
    }

    // Fallback prices
    return planType === 'yearly' ? '$38.99'
      : planType === 'monthly' ? '$12.99'
        : '$6.49';
  };

  // Get free trial period text
  const getTrialText = (planType: 'weekly' | 'monthly' | 'yearly'): string | null => {
    const product = getProduct(planType);

    if (product?.introductoryPrice && product.introductoryPrice === '0') {
      const days = product.introductoryPriceNumberOfPeriodsIOS || 0;
      if (days > 0) {
        return `${days}-day free trial`;
      }
    }

    if (planType === 'yearly') return '7-day free trial';
    if (planType === 'monthly') return '3-day free trial';
    return null;
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://yourapp.com/privacy');
  };

  const handleTerms = () => {
    Linking.openURL('https://yourapp.com/terms');
  };

  // 🎯 CONFIGURE DISCOUNT PERCENTAGES HERE
  // Change discountPercent to adjust both strikethrough price and "Save X%" text
  const plans = [
    {
      id: 'yearly',
      name: 'Yearly',
      period: '/year',
      badge: 'BEST VALUE',
      discountPercent: 50  // 30% discount → strikethrough price is 30% higher, shows "Save 30%"
    },
    {
      id: 'monthly',
      name: 'Monthly',
      period: '/month',
      badge: 'POPULAR',
      discountPercent: 0  // 30% discount → strikethrough price is 30% higher, shows "Save 30%"
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate('MainTabs')}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={24} color={COLORS.dark} />
        </TouchableOpacity>
      </View>

      {/* Content - Title at top, everything else at bottom */}
      <View style={styles.content}>
        {/* Title Section - Top */}
        <View style={styles.titleSection}>
          {/* Crown Image - Above Title */}
          <Image
            source={require('../../assets/images/crown.png')}
            style={styles.crownImage}
            resizeMode="contain"
          />
          <Text style={styles.title}>Unlock Premium</Text>
          <Text style={styles.subtitle}>Get unlimited access to all features</Text>
        </View>

        {/* Spacer - pushes content to bottom */}
        <View style={styles.spacer} />

        {/* Scrollable Section - Key Features & Plans */}
        <ScrollView
          style={styles.scrollSection}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Key Features - Compact */}
          <View style={styles.featuresSection}>
            <FeatureRow icon="infinite" text="Unlimited AI Requests Daily" />
            <FeatureRow icon="document-text" text="Unlimited Words Per Request" />
            <FeatureRow icon="flash" text="Priority Processing Speed" />
            <FeatureRow icon="shield-checkmark" text="Complete Ad-Free Experience" />
          </View>

          {/* Plans - Fixed Height */}
          <View style={styles.plansSection}>
            {plans.map((plan) => {
              const planType = plan.id as 'weekly' | 'monthly' | 'yearly';
              const isSelected = selectedPlan === planType;
              const trial = getTrialText(planType);

              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[styles.planCard, isSelected && styles.planCardSelected]}
                  onPress={() => setSelectedPlan(planType)}
                  activeOpacity={0.8}
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
                        {trial && <Text style={styles.trialText}>{trial}</Text>}
                      </View>
                    </View>

                    <View style={styles.planRight}>
                      <Text style={styles.strikePrice}>{getStrikethroughPrice(planType)}</Text>
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
            })}
          </View>
        </ScrollView>

        {/* Fixed Bottom Section - Subscribe Button & Links */}
        <View style={styles.fixedBottomSection}>
          {/* Subscribe Button */}
          <TouchableOpacity
            style={[styles.subscribeButton, loading && styles.buttonDisabled]}
            onPress={() =>
              handlePurchase(
                selectedPlan === 'yearly'
                  ? productIds.YEARLY
                  : selectedPlan === 'monthly'
                    ? productIds.MONTHLY
                    : productIds.WEEKLY
              )
            }
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.subscribeButtonText}>
                {selectedPlan === 'yearly' || selectedPlan === 'monthly'
                  ? 'Start Free Trial'
                  : 'Subscribe Now'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Cancel Anytime */}
          <Text style={styles.cancelText}>No commitment • Cancel anytime</Text>

          {/* Restore & Links */}
          <View style={styles.linksRow}>
            <TouchableOpacity onPress={handleRestore} disabled={loading}>
              <Text style={styles.linkText}>Restore</Text>
            </TouchableOpacity>
            <Text style={styles.linkDivider}>•</Text>
            <TouchableOpacity onPress={handlePrivacyPolicy}>
              <Text style={styles.linkText}>Privacy</Text>
            </TouchableOpacity>
            <Text style={styles.linkDivider}>•</Text>
            <TouchableOpacity onPress={handleTerms}>
              <Text style={styles.linkText}>Terms</Text>
            </TouchableOpacity>
          </View>

          {/* Terms Text */}
          <Text style={styles.termsText}>
            {selectedPlan === 'yearly'
              ? 'Free for 7 days, then $29.99/year. Auto-renews unless cancelled.'
              : selectedPlan === 'monthly'
                ? 'Free for 3 days, then $9.99/month. Auto-renews unless cancelled.'
                : 'Subscription renews at $4.99/week unless cancelled.'}
          </Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  titleSection: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: FONTS.sora.bold,
    color: COLORS.dark,
  },
  crownImage: {
    width: Dimensions.get('window').height < 700 ? 70 : 100,
    height: Dimensions.get('window').height < 700 ? 70 : 100,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: FONTS.sora.regular,
    color: COLORS.gray,
  },
  spacer: {
    flex: 1,
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
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
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
    fontSize: 14,
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
    fontSize: 17,
    fontFamily: FONTS.sora.bold,
    color: COLORS.dark,
  },
  trialText: {
    fontSize: 12,
    fontFamily: FONTS.sora.medium,
    color: COLORS.gray,
    marginTop: 2,
  },
  planRight: {
    alignItems: 'flex-end',
  },
  strikePrice: {
    fontSize: 14,
    marginBottom: -4,
    fontFamily: FONTS.sora.regular,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  actualPrice: {
    fontSize: 22,
    fontFamily: FONTS.sora.bold,
    color: COLORS.dark,
  },
  period: {
    fontSize: 14,
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
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  subscribeButtonText: {
    fontSize: 16,
    fontFamily: FONTS.sora.bold,
    color: COLORS.dark,
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
    fontSize: 14,
    fontFamily: FONTS.sora.medium,
    color: COLORS.dark,
  },
  linkDivider: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  termsText: {
    fontSize: 10,
    fontFamily: FONTS.sora.regular,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 14,
  },
});

export default PaywallScreen;
