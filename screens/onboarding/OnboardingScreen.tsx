import { useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  StatusBar,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomButton from '../../components/customButton/CustomButton';
import PaginationDots from '../../components/paginationDots/PaginationDots';
import { OnboardingStepsData } from '../../constants/constants';
import { COLORS, FONTS, SPACING } from '../../constants/styling';
import TriVector from '../../assets/vectors/tri_vector.svg';
import SettingsVector from '../../assets/vectors/settings_vector.svg';
import TickVector from '../../assets/vectors/tick_vector.svg';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SubscriptionService } from '../../services/SubscriptionService';
import { StorageService } from '../../utils/storage';

const height = Dimensions.get('window').height;
type OnboardingNavProp = NativeStackNavigationProp<
  RootStackParamList,
  'Onboarding'
>;

const OnboardingScreen: React.FC = () => {
  const totalSteps = OnboardingStepsData.length;
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const navigation = useNavigation<OnboardingNavProp>();

  const animateIn = () => {
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.9);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    animateIn();
  }, [currentStep]);

  const onNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      console.log('Finished Onboarding!');

      // Mark onboarding as completed
      StorageService.setOnboardingCompleted();

      // Check if user is premium
      const isPremium = SubscriptionService.isPremium();

      // Navigate to home first for all users (replace to prevent back navigation)
      navigation.replace('MainTabs');

      if (!isPremium) {
        // Non-premium user - show paywall after a brief glimpse of home
        console.log('💰 Non-premium user - showing paywall after home glimpse');
        setTimeout(() => {
          navigation.navigate('Paywall');
        }, 1500); // 1500ms delay to show home screen briefly
      } else {
        console.log('✅ Premium user - staying on home');
      }
    }
  };

  const { title, subtitle, Illustration } = OnboardingStepsData[currentStep];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />
      <TriVector style={styles.triVector} />
      <SettingsVector style={styles.settingsVectorRight} />
      <SettingsVector style={styles.settingsVectorLeft} />
      <TickVector style={styles.tickVector} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <View style={styles.illustrationContainer}>
          <Illustration height={height * 0.4} />
        </View>
        <View style={styles.footer}>
          <CustomButton
            text={currentStep === totalSteps - 1 ? 'Get Started' : 'Next'}
            onPress={onNext}
          />
        </View>
      </Animated.View>

      <View style={styles.pagination}>
        <PaginationDots activeIndex={currentStep + 1} totalSteps={totalSteps} />
      </View>
    </SafeAreaView>
  );
};

export default OnboardingScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  triVector: {
    position: 'absolute',
    top: SPACING.lg,
    left: -1,
  },
  settingsVectorRight: {
    position: 'absolute',
    right: -32,
    top: height * 0.25,
  },
  settingsVectorLeft: {
    position: 'absolute',
    bottom: height * 0.25,
    left: -32,
  },
  tickVector: {
    position: 'absolute',
    bottom: height * 0.08,
    right: -1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  header: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: FONTS.sora.bold,
    color: COLORS.dark,
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    fontFamily: FONTS.dmSans.regular,
    color: COLORS.secondary,
    textAlign: 'center',
  },
  illustrationContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  pagination: {
    position: 'absolute',
    bottom: SPACING.lg,
    alignSelf: 'center',
  },
});
