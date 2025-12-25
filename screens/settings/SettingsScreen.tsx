import {
  StyleSheet,
  View,
  Text,
  StatusBar,
  ScrollView,
  Share,
  Platform,
  ToastAndroid,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SettingsItem from '../../components/settingsItem/SettingsItem';
import { COLORS, FONTS, SPACING } from '../../constants/styling';
import RateUsModal from '../../components/rateUsModal/RateUsModal';
import { useNavigation } from '@react-navigation/native';
import { SubscriptionService } from '../../services/SubscriptionService';
import { useState } from 'react';
import JoinDiscordModal from '../../components/joinDiscordModal/JoinDiscordModal';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';

type IconSet = 'MaterialDesignIcons' | 'Ionicons';

interface SettingsOption {
  id: string;
  iconSet: IconSet;
  iconName: string;
  label: string;
  onPress: () => void;
}

type SettingsNavProp = NativeStackNavigationProp<
  RootStackParamList,
  'MainTabs'
>;

const SettingsScreen: React.FC = () => {
  // const navigation = useNavigation<SettingsNavProp>();
  const [showRateModal, setShowRateModal] = useState<boolean>(false);
  const [showDiscordModal, setShowDiscordModal] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const isPremium = SubscriptionService.isPremium();

  const handleRestorePurchases = async () => {
    setIsRestoring(true);
    try {
      const restored = await SubscriptionService.restorePurchases();

      if (restored) {
        Alert.alert(
          'Success!',
          'Your purchases have been restored. You now have premium access!'
        );
      } else {
        Alert.alert(
          'No Purchases Found',
          "We couldn't find any previous purchases for this Apple ID."
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to restore purchases. Please try again.'
      );
    } finally {
      setIsRestoring(false);
    }
  };

  const accountGroup: SettingsOption[] = [
    {
      id: '1',
      iconSet: 'Ionicons',
      iconName: 'refresh',
      label: 'Restore Purchase',
      onPress: handleRestorePurchases,
    },
  ];

  const interactionGroup: SettingsOption[] = [
    // {
    //   id: '3',
    //   iconSet: 'Ionicons',
    //   iconName: 'language-outline',
    //   label: 'Language',
    //   onPress: () => navigation.navigate('Language'),
    // },
    {
      id: '4',
      iconSet: 'Ionicons',
      iconName: 'share-social-outline',
      label: 'Share with Others',
      onPress: () => handleShare(),
    },
    {
      id: '5',
      iconSet: 'MaterialDesignIcons',
      iconName: 'message-question-outline',
      label: 'Contact Us',
      onPress: () => console.log('Contact Us'),
    },
    {
      id: '6',
      iconSet: 'Ionicons',
      iconName: 'logo-discord',
      label: 'Join Our Discord',
      onPress: () => setShowDiscordModal(true),
    },
    {
      id: '7',
      iconSet: 'Ionicons',
      iconName: 'star-half-outline',
      label: 'Rate Us',
      onPress: () => setShowRateModal(true),
    },
  ];

  const legalGroup: SettingsOption[] = [
    {
      id: '8',
      iconSet: 'Ionicons',
      iconName: 'shield-checkmark-outline',
      label: 'Privacy Policy',
      onPress: () => console.log('Privacy Policy'),
    },
    {
      id: '9',
      iconSet: 'MaterialDesignIcons',
      iconName: 'file-document-outline',
      label: 'Terms & Conditions',
      onPress: () => console.log('Terms & Conditions'),
    },
  ];

  const handleShare = async () => {
    try {
      const result = await Share.share({
        message:
          'Try AI Humanizer & Detector — the smartest tool to make AI text sound 100% human and instantly detect AI-written content.\n\nAlso includes advanced Plagiarism & Text Converters.\n\nCheck it out now: https://yourapp.link.\n\nDownload now: https://yourapp.link',
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log('Shared via:', result.activityType);
        } else {
          console.log('Shared successfully');
        }
      } else if (result.action === Share.dismissedAction) {
        console.log('Share dismissed');
      }
    } catch (error) {
      if (Platform.OS === 'android') {
        ToastAndroid.show('Unable to share right now.', ToastAndroid.SHORT);
      } else {
        Alert.alert('Error', 'Unable to share right now.');
      }
      console.log(error);
    }
  };

  const renderGroup = (groupData: SettingsOption[]) => (
    <View style={styles.groupContainer}>
      {groupData.map((item, index) => (
        <SettingsItem
          key={item.id}
          iconSet={item.iconSet}
          iconName={item.iconName}
          label={item.label}
          onPress={item.onPress}
          isLastInGroup={index === groupData.length - 1}
        />
      ))}
    </View>
  );



  const handleRateSubmit = async (rating: number) => {
    console.log('Rating submitted:', rating);
    setShowRateModal(false);

    if (rating >= 4) {
      // High rating (4-5 stars) - Direct to store for public review
      try {
        if (Platform.OS === 'ios') {
          // iOS App Store rating URL - Replace with your actual App Store ID
          const appStoreId = 'YOUR_APP_STORE_ID'; // e.g., '123456789'
          const url = `https://apps.apple.com/app/id${appStoreId}?action=write-review`;
          const canOpen = await Linking.canOpenURL(url);
          if (canOpen) {
            await Linking.openURL(url);
          } else {
            Alert.alert(
              'Thank You!',
              'We appreciate your positive feedback! Please rate us on the App Store.'
            );
          }
        } else if (Platform.OS === 'android') {
          // Android Play Store rating URL
          const packageName = 'com.rewordly';
          const url = `market://details?id=${packageName}`;
          const canOpen = await Linking.canOpenURL(url);
          if (canOpen) {
            await Linking.openURL(url);
          } else {
            // Fallback to browser if Play Store app is not available
            const webUrl = `https://play.google.com/store/apps/details?id=${packageName}`;
            await Linking.openURL(webUrl);
          }
        }
      } catch (error) {
        console.error('Error opening store for rating:', error);
        Alert.alert(
          'Thank You!',
          'We appreciate your positive feedback!'
        );
      }
    } else {
      // Low rating (1-3 stars) - Show feedback message
      Alert.alert(
        'Thank You for Your Feedback',
        'We appreciate your rating. If you\'re facing any issues, please contact us so we can help improve your experience.',
        [
          {
            text: 'OK',
            style: 'cancel',
          },
          {
            text: 'Contact Us',
            onPress: () => {
              // You can implement contact functionality here
              console.log('Contact Us pressed');
            },
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />

      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {!isPremium && renderGroup(accountGroup)}
        {renderGroup(interactionGroup)}
        {renderGroup(legalGroup)}
      </ScrollView>
      <RateUsModal
        visible={showRateModal}
        onClose={() => setShowRateModal(false)}
        onSubmit={handleRateSubmit}
      />
      <JoinDiscordModal
        visible={showDiscordModal}
        onClose={() => setShowDiscordModal(false)}
      />
      <View style={{ height: 60 }} />
    </SafeAreaView>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  headerContainer: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    backgroundColor: COLORS.light,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: FONTS.sora.bold,
    color: COLORS.dark,
  },
  scrollContentContainer: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  groupContainer: {
    backgroundColor: COLORS.light,
    overflow: 'hidden',
    borderRadius: SPACING.md,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.surface,
  },
});
