import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
  Dimensions,
  Linking,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {SvgFromXml} from 'react-native-svg';
import {
  useIAP,
  validateReceiptIos,
  requestSubscription,
  finishTransaction,
  initConnection,
} from 'react-native-iap';
import Toast from 'react-native-toast-message';
import {useMMKVStorage} from 'react-native-mmkv-storage';
import {useNavigation} from '@react-navigation/native';

// Utils imports
import Svgs from '../utils/Svgs';
import COLORS from '../utils/COLORS';
import {strings} from '../utils/Strings';
import {Storage} from '../utils/Storage';

// Component imports
import CustomButton from './CustomButton';
import UpgradeDetails from './UpgradeDetails';

const {width} = Dimensions.get('window');

// Configuration - Replace with your actual values
const SUBSCRIPTION_CONFIG = {
  skus: [
    'com.yourapp.weekly',
    'com.yourapp.yearly',
  ],
  appSecret: 'YOUR_APP_SHARED_SECRET_HERE', // iOS App-Specific Shared Secret
  isTestEnvironment: __DEV__, // true for sandbox, false for production
};

const FEATURES = [
  strings.feaature1,
  strings.feaature2,
  strings.feaature3,
  strings.feaature4,
  strings.feaature5,
];

const SubscriptionPlans = () => {
  const navigation = useNavigation();
  
  // State management
  const [selectedOption, setSelectedOption] = useState(null);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useMMKVStorage('subscriptionPlans', Storage, []);
  const [isPremium, setIsPremium] = useMMKVStorage('isPremium', Storage, false);

  // IAP Hooks
  const {
    subscriptions,
    getSubscriptions,
    currentPurchase,
    currentPurchaseError,
    finishTransaction,
    getAvailablePurchases,
  } = useIAP();

  // Initialize IAP connection
  useEffect(() => {
    const initIAP = async () => {
      try {
        const connection = await initConnection();
        console.log('IAP Connection Status:', connection);
      } catch (error) {
        console.error('IAP Initialization Error:', error);
      }
    };
    initIAP();
  }, []);

  // Fetch available subscriptions
  useEffect(() => {
    getSubscriptions({skus: SUBSCRIPTION_CONFIG.skus});
  }, [getSubscriptions]);

  // Process and sort subscriptions
  useEffect(() => {
    if (subscriptions.length) {
      const sortedSubscriptions = subscriptions.sort((a, b) => {
        const order = ['weekly', 'yearly'];
        const aPeriod = a.productId.split('.').pop();
        const bPeriod = b.productId.split('.').pop();
        
        const orderComparison = order.indexOf(aPeriod) - order.indexOf(bPeriod);
        
        if (orderComparison !== 0) {
          return orderComparison;
        }
        
        return parseFloat(a.price) - parseFloat(b.price);
      });

      console.log('Fetched Subscriptions:', sortedSubscriptions);
      setPlans(sortedSubscriptions);
      
      // Auto-select yearly plan (or first available)
      const yearlyPlan = sortedSubscriptions.find(plan =>
        plan.productId.includes('yearly')
      );
      setSelectedOption(yearlyPlan?.productId || sortedSubscriptions[0]?.productId);
    }
  }, [subscriptions]);

  // Check subscription status on mount
  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  // Handle current purchase
  useEffect(() => {
    if (currentPurchase) {
      handlePurchaseValidation(currentPurchase);
    }
  }, [currentPurchase]);

  // Handle purchase errors
  useEffect(() => {
    if (currentPurchaseError) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Something went wrong with the purchase.',
      });
      setLoading(false);
    }
  }, [currentPurchaseError]);

  // Check stored subscription status
  const checkSubscriptionStatus = () => {
    const storedData = Storage.getString('subscriptionDetails');
    if (!storedData) {
      console.log('No subscription data found.');
      setIsPremium(false);
      return;
    }

    const {expiresDate} = JSON.parse(storedData);
    const currentDate = new Date();
    const isActive = new Date(expiresDate) > currentDate;

    setIsPremium(isActive);
    Storage.setBool('isPremium', isActive);

    console.log('Subscription Status:', {
      expiresDate,
      currentDate: currentDate.toISOString(),
      isActive,
    });
  };

  // Handle purchase initiation
  const handlePurchase = async sku => {
    if (!sku) return;
    
    try {
      setLoading(true);
      console.log('Initiating purchase for SKU:', sku);
      await requestSubscription({sku});
    } catch (error) {
      console.error('Purchase Error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Purchase failed',
      });
      setLoading(false);
    }
  };

  // Validate purchase receipt
  const handlePurchaseValidation = async purchase => {
    if (!purchase?.transactionReceipt) return;

    const receipt = purchase.transactionReceipt;

    try {
      await finishTransaction({purchase});

      if (Platform.OS === 'ios') {
        await validateIOSReceipt(receipt);
      } else {
        await handleAndroidPurchase();
      }
    } catch (error) {
      console.error('Purchase validation error:', error);
      setLoading(false);
    }
  };

  // iOS receipt validation
  const validateIOSReceipt = async receipt => {
    try {
      const response = await validateReceiptIos({
        receiptBody: {
          'receipt-data': receipt,
          password: SUBSCRIPTION_CONFIG.appSecret,
        },
        isTest: SUBSCRIPTION_CONFIG.isTestEnvironment,
      });

      if (response.status === 0) {
        const latestReceipt = response.latest_receipt_info[0];
        
        if (latestReceipt?.expires_date_ms) {
          const expiresDate = new Date(parseInt(latestReceipt.expires_date_ms));
          const isActive = expiresDate > new Date();

          Storage.setString(
            'subscriptionDetails',
            JSON.stringify({expiresDate: expiresDate.toISOString()})
          );
          Storage.setBool('isPremium', isActive);
          setIsPremium(isActive);

          if (isActive) {
            showSuccessMessage();
          }
        }
      } else {
        setIsPremium(false);
      }
    } catch (error) {
      console.error('iOS validation error:', error);
      setIsPremium(false);
    } finally {
      setLoading(false);
    }
  };

  // Android purchase handling
  const handleAndroidPurchase = async () => {
    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + 30); // Default 30 days

    Storage.setString(
      'subscriptionDetails',
      JSON.stringify({expiresDate: expiresDate.toISOString()})
    );
    Storage.setBool('isPremium', true);
    setIsPremium(true);
    
    showSuccessMessage();
    setLoading(false);
  };

  // Restore purchases
  const restorePurchases = async () => {
    try {
      setLoading(true);
      const purchases = await getAvailablePurchases();
      console.log('Restored Purchases:', purchases);

      if (purchases?.length > 0) {
        for (const purchase of purchases) {
          await handlePurchaseValidation(purchase);
        }
      } else {
        Toast.show({
          type: 'info',
          text1: 'No purchases to restore',
          text2: 'You have no previous purchases to restore.',
        });
      }
    } catch (error) {
      console.error('Restore Purchases Error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to restore purchases',
      });
    } finally {
      setLoading(false);
    }
  };

  // Show success message and navigate back
  const showSuccessMessage = () => {
    Toast.show({
      type: 'success',
      text1: strings.success,
      text2: strings.purchaseSuccess,
    });
    navigation.goBack();
  };

  // Open external links
  const openLink = url => {
    Linking.openURL(url).catch(err =>
      console.error('Failed to open URL:', err)
    );
  };

  // Get billing cycle text
  const getBillingCycle = productId => {
    if (productId.includes('weekly')) return strings.perweak;
    if (productId.includes('yearly')) return strings.peryear;
    return strings.peryear;
  };

  // Render subscription plan item
  const renderPlanItem = ({item}) => {
    const isSelected = item.productId === selectedOption;
    const billingCycle = getBillingCycle(item.productId);

    return (
      <TouchableOpacity
        style={[styles.optionCard, isSelected && styles.optionSelected]}
        onPress={() => setSelectedOption(item.productId)}>
        <View style={styles.row}>
          <View style={styles.textContainer}>
            <Text style={styles.title}>{item.title}</Text>
          </View>
        </View>
        
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{item.localizedPrice}</Text>
          <Text style={styles.perWeek}>{billingCycle}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Check if selected plan has free trial
  const selectedPlan = plans.find(plan => plan.productId === selectedOption);
  const hasFreeTrial =
    selectedPlan?.introductoryPricePaymentModeIOS === 'FREETRIAL' &&
    selectedPlan?.productId.includes('yearly');

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        {/* Features Section */}
        <ScrollView style={styles.featuresContainer}>
          <View style={styles.featureHeader}>
            <SvgFromXml xml={Svgs.bulletLight} />
            <Text style={styles.featureHeaderText}>{strings.unlock}</Text>
          </View>

          {FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <SvgFromXml xml={Svgs.tick} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Divider */}
        <View style={styles.lineContainer}>
          <View style={styles.singleLine} />
        </View>

        {/* Plans Header */}
        <View style={styles.headerSection}>
          <Text style={styles.headerText}>{strings.choose}</Text>
        </View>

        {/* Plans List */}
        <FlatList
          data={plans}
          numColumns={2}
          keyExtractor={item => item.productId}
          renderItem={renderPlanItem}
          extraData={selectedOption}
          columnWrapperStyle={styles.columnWrapper}
        />

        {/* Action Button */}
        <View style={styles.buttonContainer}>
          <CustomButton
            text={hasFreeTrial ? strings.startForFree : strings.upgrade}
            buttonColor={COLORS.primary}
            onPress={() => handlePurchase(selectedOption)}
            disabled={!selectedOption || loading}
          />
        </View>
      </View>

      {/* Free Trial Banner */}
      {hasFreeTrial && selectedPlan && (
        <View style={styles.header}>
          <Text style={styles.headerText2}>
            {strings.daysFree} {selectedPlan.localizedPrice}/{strings.yearly}
          </Text>
          <Text style={styles.subText}>{strings.noCommitment}</Text>
        </View>
      )}

      {/* Loading Modal */}
      <Modal
        transparent
        animationType="fade"
        visible={loading}
        onRequestClose={() => setLoading(false)}>
        <View style={styles.modalBackground}>
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>{strings.loading}</Text>
          </View>
        </View>
      </Modal>

      {/* Upgrade Details */}
      <UpgradeDetails />

      {/* Footer Links */}
      <View style={styles.footer1}>
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={styles.footer}
            onPress={() => openLink('https://www.yourapp.com/terms')}>
            <Text style={styles.footerText}>{strings.terms}</Text>
          </TouchableOpacity>
          
          <Text style={styles.separator}>|</Text>
          
          <TouchableOpacity
            style={styles.footer}
            onPress={() => openLink('https://www.yourapp.com/privacy')}>
            <Text style={styles.footerText}>{strings.privacyPolicy}</Text>
          </TouchableOpacity>
          
          <Text style={styles.separator}>|</Text>
          
          <TouchableOpacity style={styles.footer} onPress={restorePurchases}>
            <Text style={styles.footerText}>{strings.restore}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  contentContainer: {
    paddingHorizontal: 16,
  },
  featuresContainer: {
    marginTop: 20,
    paddingHorizontal: 17,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureHeaderText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.black,
    marginLeft: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.black,
    marginLeft: 8,
  },
  lineContainer: {
    marginTop: 10,
  },
  singleLine: {
    backgroundColor: 'rgba(0, 0, 0, 0.09)',
    height: 1,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  headerText: {
    fontWeight: '700',
    fontSize: 18,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  optionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    paddingVertical: 25,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.lightGrey,
    width: '49%',
  },
  optionSelected: {
    backgroundColor: 'rgba(255, 124, 22, 0.07)',
    borderWidth: 1.5,
    borderColor: '#FF7C16',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 4,
  },
  priceContainer: {
    marginLeft: 12,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.black,
    marginTop: 5,
  },
  perWeek: {
    color: 'rgba(25, 22, 21, 1)',
    marginTop: 10,
    marginLeft: 4,
  },
  buttonContainer: {
    marginBottom: 15,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  headerText2: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.black,
  },
  subText: {
    fontSize: 14,
    color: COLORS.gray,
    marginVertical: 5,
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loaderContainer: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.black,
  },
  footer1: {
    backgroundColor: COLORS.white,
    padding: 20,
    alignItems: 'center',
  },
  footerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderColor: '#E5E5E5',
    maxWidth: width * 0.9,
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  footerText: {
    fontSize: 13,
    color: COLORS.black,
    fontWeight: '500',
    textAlign: 'center',
  },
  separator: {
    fontSize: 18,
    color: COLORS.black,
    marginHorizontal: 10,
  },
});

export default SubscriptionPlans;