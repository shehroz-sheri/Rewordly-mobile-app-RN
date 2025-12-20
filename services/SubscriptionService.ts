import * as RNIap from 'react-native-iap';
import { createMMKV } from 'react-native-mmkv';
import { Platform, Alert } from 'react-native';

const storage = createMMKV({
    id: 'subscription-storage',
});

// Product IDs from App Store Connect
const PRODUCT_IDS = {
    WEEKLY: 'com.detector.humanizer.weekly.plan',
    YEARLY: 'com.detector.humanizer.yearly.plan',
};

// Storage Keys
const KEYS = {
    IS_PREMIUM: 'is_premium',
    TRIAL_USED: 'trial_used',
    FREE_TRIES: 'free_tries',
    LAST_RECEIPT: 'last_receipt',
    SUBSCRIPTION_EXPIRY: 'subscription_expiry',
};

export type FeatureType = 'humanizer' | 'paraphrase' | 'plagiarism';

interface FreeTries {
    humanizer: number;
    paraphrase: number;
    plagiarism: number;
}

export class SubscriptionService {
    private static purchaseUpdateSubscription: any = null;
    private static purchaseErrorSubscription: any = null;

    /**
     * Initialize IAP connection and check subscription status
     */
    static async initialize() {
        try {
            console.log('🔄 Initializing IAP connection...');

            // Only initialize on iOS
            if (Platform.OS !== 'ios') {
                console.log('⚠️ IAP only available on iOS');
                return;
            }

            await RNIap.initConnection();
            console.log('✅ IAP Connection initialized');

            // Check current subscription status
            await this.checkSubscriptionStatus();

            // Set up purchase listeners
            this.setupPurchaseListeners();

            console.log('✅ Subscription service ready');
        } catch (error) {
            console.error('❌ IAP initialization failed:', error);
        }
    }

    /**
     * Setup purchase update and error listeners
     */
    private static setupPurchaseListeners() {
        // Purchase update listener
        this.purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(
            async (purchase) => {
                console.log('📦 Purchase update received:', purchase.productId);

                // For iOS, get the receipt from the purchase object
                // transactionReceipt is deprecated, use transactionId and validate with Apple
                const receipt = Platform.OS === 'ios'
                    ? (purchase as any).transactionReceipt || purchase.transactionId
                    : purchase.transactionId;

                if (receipt) {
                    try {
                        // Validate receipt
                        const isValid = await this.validateReceipt(receipt);

                        if (isValid) {
                            // Grant premium access
                            storage.set(KEYS.IS_PREMIUM, true);
                            storage.set(KEYS.LAST_RECEIPT, receipt);

                            // Mark trial as used if it was yearly plan
                            if (purchase.productId === PRODUCT_IDS.YEARLY) {
                                storage.set(KEYS.TRIAL_USED, true);
                            }

                            // Finish transaction
                            await RNIap.finishTransaction({ purchase, isConsumable: false });
                            console.log('✅ Purchase successful and finished');

                            Alert.alert(
                                'Success!',
                                'You now have premium access to all features!',
                            );
                        } else {
                            console.error('❌ Receipt validation failed');
                            Alert.alert('Error', 'Purchase validation failed. Please try again.');
                        }
                    } catch (error) {
                        console.error('❌ Error processing purchase:', error);
                    }
                }
            }
        );

        // Purchase error listener
        this.purchaseErrorSubscription = RNIap.purchaseErrorListener((error) => {
            console.error('❌ Purchase error:', error);

            // Don't show alert if user cancelled
            if (error.code !== 'E_USER_CANCELLED' as any) {
                Alert.alert('Purchase Failed', 'Please try again or contact support.');
            }
        });
    }

    /**
     * Check current subscription status with Apple
     */
    static async checkSubscriptionStatus(): Promise<boolean> {
        try {
            console.log('🔍 Checking subscription status...');

            // Get available purchases (active subscriptions)
            const purchases = await RNIap.getAvailablePurchases();

            if (purchases && purchases.length > 0) {
                console.log(`✅ Found ${purchases.length} active purchase(s)`);

                // Get the latest purchase
                const latestPurchase = purchases[0];
                // For iOS, get the receipt from the purchase object
                const receipt = Platform.OS === 'ios'
                    ? (latestPurchase as any).transactionReceipt || latestPurchase.transactionId
                    : latestPurchase.transactionId;

                if (receipt) {
                    // Validate receipt
                    const isValid = await this.validateReceipt(receipt);

                    if (isValid) {
                        storage.set(KEYS.IS_PREMIUM, true);
                        storage.set(KEYS.LAST_RECEIPT, receipt);

                        // Mark trial as used if yearly plan
                        if (latestPurchase.productId === PRODUCT_IDS.YEARLY) {
                            storage.set(KEYS.TRIAL_USED, true);
                        }

                        console.log('✅ User has active premium subscription');
                        return true;
                    }
                }
            }

            // No active subscription
            storage.set(KEYS.IS_PREMIUM, false);
            console.log('ℹ️ No active subscription found');
            return false;
        } catch (error) {
            console.error('❌ Error checking subscription:', error);
            return false;
        }
    }

    /**
     * Validate receipt with backend server (server-side validation)
     */
    private static async validateReceipt(receipt: string): Promise<boolean> {
        try {
            console.log('🔐 Validating receipt with backend server...');

            // Call backend API for server-side validation
            const response = await fetch('http://192.168.10.8/api/humanizer3in1/validate-receipt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    receipt: receipt,
                    platform: Platform.OS,
                }),
            });

            if (!response.ok) {
                console.error('❌ Backend validation request failed:', response.status);
                return false;
            }

            const data = await response.json();

            if (data.success && data.valid) {
                console.log('✅ Receipt is valid (verified by backend)');

                // Optionally store additional subscription info from backend
                if (data.expiresDate) {
                    storage.set(KEYS.SUBSCRIPTION_EXPIRY, data.expiresDate);
                }

                return true;
            } else {
                console.error('❌ Receipt validation failed:', data.message || 'Unknown error');
                return false;
            }
        } catch (error) {
            console.error('❌ Receipt validation error:', error);
            return false;
        }
    }

    /**
     * Purchase a subscription
     */
    static async purchaseSubscription(productId: string) {
        try {
            console.log('🛒 Initiating purchase for:', productId);
            // New v14+ syntax: use object with sku (iOS) and skus (Android)
            // Type assertion needed due to TypeScript definition mismatch in v14.6.2
            await (RNIap.requestPurchase as any)({
                sku: productId,        // Required for iOS
                skus: [productId],     // Required for Android (array)
            });
        } catch (error: any) {
            console.error('❌ Purchase failed:', error);

            if (error.code !== 'E_USER_CANCELLED' as any) {
                throw error;
            }
        }
    }

    /**
     * Restore previous purchases
     */
    static async restorePurchases(): Promise<boolean> {
        try {
            console.log('🔄 Restoring purchases...');

            const purchases = await RNIap.getAvailablePurchases();

            if (purchases && purchases.length > 0) {
                storage.set(KEYS.IS_PREMIUM, true);
                console.log('✅ Purchases restored successfully');
                return true;
            } else {
                console.log('ℹ️ No purchases to restore');
                return false;
            }
        } catch (error) {
            console.error('❌ Restore failed:', error);
            return false;
        }
    }

    /**
     * Check if user has premium access
     */
    static isPremium(): boolean {
        return storage.getBoolean(KEYS.IS_PREMIUM) || false;
    }

    /**
     * Get free tries for all features
     */
    static getFreeTries(): FreeTries {
        const triesString = storage.getString(KEYS.FREE_TRIES);

        if (triesString) {
            try {
                return JSON.parse(triesString);
            } catch (error) {
                console.error('Error parsing free tries:', error);
            }
        }

        // Default: 1 try per feature
        const defaultTries: FreeTries = {
            humanizer: 1,
            paraphrase: 1,
            plagiarism: 1,
        };

        // Save default tries
        storage.set(KEYS.FREE_TRIES, JSON.stringify(defaultTries));
        return defaultTries;
    }

    /**
     * Check if user has free tries for a specific feature
     */
    static hasFreeTries(feature: FeatureType): boolean {
        const tries = this.getFreeTries();
        return tries[feature] > 0;
    }

    /**
     * Use a free try for a specific feature
     */
    static useFreeTry(feature: FeatureType): boolean {
        const tries = this.getFreeTries();

        if (tries[feature] > 0) {
            tries[feature] -= 1;
            storage.set(KEYS.FREE_TRIES, JSON.stringify(tries));
            console.log(`✅ Used free try for ${feature}. Remaining: ${tries[feature]}`);
            return true;
        }

        console.log(`❌ No free tries left for ${feature}`);
        return false;
    }

    /**
     * Get remaining free tries for a specific feature
     */
    static getRemainingTries(feature: FeatureType): number {
        const tries = this.getFreeTries();
        return tries[feature];
    }

    /**
     * Check if trial was used (for yearly plan)
     */
    static wasTrialUsed(): boolean {
        return storage.getBoolean(KEYS.TRIAL_USED) || false;
    }

    /**
     * Get product IDs
     */
    static getProductIds() {
        return PRODUCT_IDS;
    }

    /**
     * Cleanup listeners when app closes
     */
    static cleanup() {
        if (this.purchaseUpdateSubscription) {
            this.purchaseUpdateSubscription.remove();
            this.purchaseUpdateSubscription = null;
        }

        if (this.purchaseErrorSubscription) {
            this.purchaseErrorSubscription.remove();
            this.purchaseErrorSubscription = null;
        }

        RNIap.endConnection();
        console.log('🔌 IAP connection closed');
    }
}
