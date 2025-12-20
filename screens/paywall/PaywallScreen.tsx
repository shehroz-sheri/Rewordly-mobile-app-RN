import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
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
  const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'yearly'>('yearly');

  const handlePurchase = async (productId: string) => {
    setLoading(true);
    try {
      await SubscriptionService.purchaseSubscription(productId);
      // Success handled by purchase listener in SubscriptionService
      // Will show alert and update premium status automatically
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
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } else {
      Alert.alert(
        'No Purchases Found',
        'We couldn\'t find any previous purchases for this Apple ID.'
      );
    }
  };

  const productIds = SubscriptionService.getProductIds();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={28} color={COLORS.dark} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Unlock Premium</Text>
          <Text style={styles.subtitle}>
            Get unlimited access to all features
          </Text>
        </View>

        {/* Features List */}
        <View style={styles.featuresContainer}>
          <FeatureItem
            icon="checkmark-circle"
            text="Unlimited Humanizer"
            color={COLORS.primary}
          />
          <FeatureItem
            icon="checkmark-circle"
            text="Unlimited Paraphraser"
            color={COLORS.primary}
          />
          <FeatureItem
            icon="checkmark-circle"
            text="Unlimited Plagiarism Remover"
            color={COLORS.primary}
          />
          <FeatureItem
            icon="checkmark-circle"
            text="No Ads"
            color={COLORS.primary}
          />
          <FeatureItem
            icon="checkmark-circle"
            text="Priority Support"
            color={COLORS.primary}
          />
        </View>

        {/* Plans */}
        <View style={styles.plansContainer}>
          {/* Yearly Plan */}
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'yearly' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('yearly')}
            activeOpacity={0.7}
          >
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>BEST VALUE</Text>
            </View>
            
            <View style={styles.planHeader}>
              <View style={styles.radioButton}>
                {selectedPlan === 'yearly' && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>Yearly Plan</Text>
                <Text style={styles.planTrial}>7-day free trial</Text>
              </View>
            </View>

            <View style={styles.planPricing}>
              <Text style={styles.planPrice}>$29.99</Text>
              <Text style={styles.planPeriod}>/year</Text>
            </View>

            <Text style={styles.planSavings}>Save 50% vs Weekly</Text>
          </TouchableOpacity>

          {/* Weekly Plan */}
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'weekly' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('weekly')}
            activeOpacity={0.7}
          >
            <View style={styles.planHeader}>
              <View style={styles.radioButton}>
                {selectedPlan === 'weekly' && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>Weekly Plan</Text>
                <Text style={styles.planNoTrial}>No free trial</Text>
              </View>
            </View>

            <View style={styles.planPricing}>
              <Text style={styles.planPrice}>$4.99</Text>
              <Text style={styles.planPeriod}>/week</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Subscribe Button */}
        <TouchableOpacity
          style={[styles.subscribeButton, loading && styles.subscribeButtonDisabled]}
          onPress={() =>
            handlePurchase(
              selectedPlan === 'yearly' ? productIds.YEARLY : productIds.WEEKLY
            )
          }
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.light} />
          ) : (
            <Text style={styles.subscribeButtonText}>
              {selectedPlan === 'yearly' ? 'Start Free Trial' : 'Subscribe Now'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Restore Button */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={loading}
        >
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>

        {/* Terms */}
        <Text style={styles.termsText}>
          {selectedPlan === 'yearly'
            ? 'Start your 7-day free trial. After trial, subscription automatically renews at $29.99/year unless cancelled.'
            : 'Subscription automatically renews at $4.99/week unless cancelled.'}
        </Text>

        <Text style={styles.termsText}>
          Cancel anytime in your App Store account settings.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

// Feature Item Component
const FeatureItem: React.FC<{
  icon: string;
  text: string;
  color: string;
}> = ({ icon, text, color }) => (
  <View style={styles.featureItem}>
    <Ionicons name={icon as any} size={24} color={color} />
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
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  closeButton: {
    padding: SPACING.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  titleContainer: {
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 32,
    fontFamily: FONTS.sora.bold,
    color: COLORS.dark,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: FONTS.sora.regular,
    color: COLORS.gray,
    textAlign: 'center',
  },
  featuresContainer: {
    marginBottom: SPACING.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  featureText: {
    fontSize: 16,
    fontFamily: FONTS.sora.medium,
    color: COLORS.dark,
    marginLeft: SPACING.md,
  },
  plansContainer: {
    marginBottom: SPACING.xl,
  },
  planCard: {
    backgroundColor: COLORS.light,
    borderRadius: SPACING.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.gray,
    position: 'relative',
  },
  planCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F9FF',
  },
  planBadge: {
    position: 'absolute',
    top: -10,
    right: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: SPACING.md,
  },
  planBadgeText: {
    fontSize: 12,
    fontFamily: FONTS.sora.bold,
    color: COLORS.light,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontFamily: FONTS.sora.bold,
    color: COLORS.dark,
  },
  planTrial: {
    fontSize: 14,
    fontFamily: FONTS.sora.medium,
    color: COLORS.primary,
    marginTop: 2,
  },
  planNoTrial: {
    fontSize: 14,
    fontFamily: FONTS.sora.regular,
    color: COLORS.gray,
    marginTop: 2,
  },
  planPricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: SPACING.xs,
  },
  planPrice: {
    fontSize: 28,
    fontFamily: FONTS.sora.bold,
    color: COLORS.dark,
  },
  planPeriod: {
    fontSize: 16,
    fontFamily: FONTS.sora.regular,
    color: COLORS.gray,
    marginLeft: SPACING.xs,
  },
  planSavings: {
    fontSize: 14,
    fontFamily: FONTS.sora.medium,
    color: COLORS.primary,
  },
  subscribeButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SPACING.xl,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  subscribeButtonDisabled: {
    opacity: 0.6,
  },
  subscribeButtonText: {
    fontSize: 18,
    fontFamily: FONTS.sora.bold,
    color: COLORS.light,
  },
  restoreButton: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  restoreButtonText: {
    fontSize: 16,
    fontFamily: FONTS.sora.medium,
    color: COLORS.primary,
  },
  termsText: {
    fontSize: 12,
    fontFamily: FONTS.sora.regular,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    lineHeight: 18,
  },
});

export default PaywallScreen;
