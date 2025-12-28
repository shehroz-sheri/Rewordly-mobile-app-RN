import { Platform, StatusBar, StyleSheet, Text, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import AppLogo from '../../assets/logo.svg';
import { COLORS, FONTS, SPACING } from '../../constants/styling';
import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { StorageService } from '../../utils/storage';

type SplashNavProp = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

const SplashScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<SplashNavProp>();

  useEffect(() => {
    const timer = setTimeout(() => {
      // Check if user has completed onboarding
      const hasCompletedOnboarding = StorageService.hasCompletedOnboarding();

      if (hasCompletedOnboarding) {
        // Returning user - check premium status
        console.log('🔄 Returning user - checking premium status');

        // Import SubscriptionService dynamically to avoid circular dependencies
        const { SubscriptionService } = require('../../services/SubscriptionService');
        const isPremium = SubscriptionService.isPremium();

        // Navigate to home first for all users (replace to prevent back navigation)
        navigation.replace('MainTabs');

        if (!isPremium) {
          // Non-premium user - show paywall after a brief glimpse of home
          console.log('💎 Non-premium user - showing paywall after home glimpse');
          setTimeout(() => {
            navigation.navigate('Paywall');
          }, 600); // 600ms delay to show home screen briefly
        } else {
          console.log('✅ Premium user - staying on home');
        }
      } else {
        // New user - show onboarding (replace to prevent back navigation)
        console.log('🆕 New user - showing onboarding');
        navigation.replace('Onboarding');
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle='dark-content' backgroundColor={COLORS.primary} />

      <View
        style={[
          styles.content,
          {
            paddingBottom:
              Platform.OS === 'android'
                ? StatusBar.currentHeight || 0
                : insets.bottom,
          },
        ]}
      >
        <AppLogo />
        <Text style={styles.heading}>AI Humanizer</Text>
        <Text style={styles.text}>Technology that speaks like you</Text>
      </View>
    </SafeAreaView>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  heading: {
    fontSize: 42.9,
    fontFamily: FONTS.sora.bold,
    color: COLORS.dark,
  },
  text: {
    fontSize: 18,
    color: COLORS.dark,
    fontFamily: FONTS.dmSans.medium,
  },
});
