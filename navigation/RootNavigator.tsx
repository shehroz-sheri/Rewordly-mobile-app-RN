import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../screens/splash/SplashScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import MainTabNavigator from './MainTabNavigator';
import LanguageScreen from '../screens/language/LanguageScreen';
import HumanizerScreen from '../screens/humanizer/HumanizerScreen';
import PlagiarismRemoverScreen from '../screens/plagiarismRemover/PlagiarismRemoverScreen';
import ResultScreen from '../screens/result/ResultScreen';
import ParaphraseScreen from '../screens/paraphrase/ParaphraseScreen';
import HistoryResultScreen from '../screens/historyResult/HistoryResultScreen';
import PaywallScreen from '../screens/paywall/PaywallScreen';

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Language: undefined;
  Humanizer: undefined;
  PlagiarismRemover: undefined;
  Paraphrase: undefined;
  Result: {
    sourceScreen: 'Humanizer' | 'PlagiarismRemover' | 'Paraphrase';
    originalText: string;
    resultText: string;
    style?: 'Casual' | 'Business' | 'Academic';
  };
  HistoryResult: any;
  Paywall: undefined;
  MainTabs: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Language" component={LanguageScreen} />
      <Stack.Screen name="Humanizer" component={HumanizerScreen} />
      <Stack.Screen name="Paraphrase" component={ParaphraseScreen} />
      <Stack.Screen
        name="PlagiarismRemover"
        component={PlagiarismRemoverScreen}
      />
      <Stack.Screen name="Result" component={ResultScreen} />
      <Stack.Screen name="HistoryResult" component={HistoryResultScreen} />
      <Stack.Screen
        name="Paywall"
        component={PaywallScreen}
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
          gestureEnabled: false,
        }}
      />

      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
    </Stack.Navigator>
  );
};

export default RootNavigator;
