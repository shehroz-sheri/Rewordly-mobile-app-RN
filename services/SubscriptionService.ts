import * as RNIap from 'react-native-iap';
import { createMMKV } from 'react-native-mmkv';
import { Platform, Alert } from 'react-native';

const storage = createMMKV({
    id: 'subscription-storage',
});

// Product IDs from App Store Connect
const PRODUCT_IDS = {
    WEEKLY: 'com.detector.humanizer.weekly.plan',
    MONTHLY: 'com.detector.humanizer.monthly.plan',
    YEARLY: 'com.detector.humanizer.yearly.plan',
};

// Free user limits
const FREE_USER_WORD_LIMIT = 300;

// Storage Keys
const KEYS = {
    IS_PREMIUM: 'is_premium',
    TRIAL_USED: 'trial_used',
    FREE_TRIES: 'free_tries',
    LAST_RECEIPT: 'last_receipt',
    SUBSCRIPTION_EXPIRY: 'subscription_expiry',
    CACHED_PRODUCTS: 'cached_products',
    LAST_VALIDATION: 'last_validation',
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

            // Check current subscription status with validation
            await this.checkSubscriptionStatus();

            // ✅ NEW: Fetch subscription products early
            console.log('📦 Pre-fetching subscription products...');
            await this.getSubscriptionProducts();

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
     * Check if subscription should be validated (once per 12 hours)
     */
    private static shouldValidate(): boolean {
        const lastValidation = storage.getNumber(KEYS.LAST_VALIDATION) || 0;
        const now = Date.now();
        const twelveHoursMs = 12 * 60 * 60 * 1000; // Reduced from 24h to 12h for tighter control

        return (now - lastValidation) > twelveHoursMs;
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
                    // ✅ NEW: Only validate if needed (once per day)
                    if (this.shouldValidate()) {
                        console.log('🔄 Validating subscription with server...');
                        const isValid = await this.validateReceipt(receipt);

                        if (isValid) {
                            storage.set(KEYS.IS_PREMIUM, true);
                            storage.set(KEYS.LAST_RECEIPT, receipt);
                            storage.set(KEYS.LAST_VALIDATION, Date.now());

                            // Mark trial as used if yearly plan
                            if (latestPurchase.productId === PRODUCT_IDS.YEARLY) {
                                storage.set(KEYS.TRIAL_USED, true);
                            }

                            console.log('✅ Subscription validated and active');
                            return true;
                        } else {
                            storage.set(KEYS.IS_PREMIUM, false);
                            console.log('❌ Subscription validation failed');
                            return false;
                        }
                    } else {
                        // Trust existing status if validated recently
                        storage.set(KEYS.IS_PREMIUM, true);
                        storage.set(KEYS.LAST_RECEIPT, receipt);
                        console.log('✅ Subscription active (recently validated)');
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
     * Falls back to client-side validation if backend is unavailable
     */
    private static async validateReceipt(receipt: string): Promise<boolean> {
        try {
            console.log('🔐 Validating receipt with backend server...');

            // Get validate receipt URL from API config
            const { ApiConfigService } = require('../utils/storage');
            const apiConfig = ApiConfigService.getApiConfig();

            // ✅ IMPROVED: Fallback to client-side validation if backend URL not configured
            if (!apiConfig || !apiConfig.validate_receipt_URL) {
                console.warn('⚠️ Backend validation URL not configured, using client-side validation as fallback');
                return this.validateReceiptClientSide();
            }

            // Call backend API for server-side validation
            const response = await fetch(apiConfig.validate_receipt_URL, {
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
                // ✅ IMPROVED: Fallback to client-side validation on backend error
                console.warn('⚠️ Falling back to client-side validation');
                return this.validateReceiptClientSide();
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
            // ✅ IMPROVED: Fallback to client-side validation on network error
            console.warn('⚠️ Network error, falling back to client-side validation');
            return this.validateReceiptClientSide();
        }
    }

    /**
     * Client-side receipt validation (fallback when backend is unavailable)
     * Uses react-native-iap's getAvailablePurchases to verify active subscriptions
     */
    private static async validateReceiptClientSide(): Promise<boolean> {
        try {
            console.log('🔍 Performing client-side validation...');
            
            // Check if there are any active purchases
            const purchases = await RNIap.getAvailablePurchases();
            
            if (purchases && purchases.length > 0) {
                console.log('✅ Client-side validation: Active subscription found');
                return true;
            }
            
            console.log('❌ Client-side validation: No active subscription');
            return false;
        } catch (error) {
            console.error('❌ Client-side validation error:', error);
            // If even client-side validation fails, deny access
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
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);

            // ✅ IMPROVED: Better error logging for debugging
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
     * Fetch subscription products from App Store
     * Returns product details including pricing, currency, and free trial info
     */
    static async getSubscriptionProducts(): Promise<any[]> {
        try {
            console.log('📦 Fetching subscription products from App Store...');

            // Only works on iOS
            if (Platform.OS !== 'ios') {
                console.log('⚠️ Product fetching only available on iOS');
                return [];
            }

            // ✅ NEW: Check cache first
            const cachedData = storage.getString(KEYS.CACHED_PRODUCTS);
            if (cachedData) {
                try {
                    const { products, timestamp } = JSON.parse(cachedData);
                    const age = Date.now() - timestamp;
                    const cacheValidMs = 24 * 60 * 60 * 1000; // 24 hours

                    if (age < cacheValidMs) {
                        console.log('✅ Using cached products (age:', Math.floor(age / 1000 / 60), 'minutes)');
                        return products;
                    } else {
                        console.log('⏰ Cache expired, fetching fresh products...');
                    }
                } catch (parseError) {
                    console.error('❌ Error parsing cached products:', parseError);
                }
            }

            // Fetch fresh products from App Store
            const products = await RNIap.fetchProducts({
                skus: [
                    PRODUCT_IDS.WEEKLY,
                    PRODUCT_IDS.MONTHLY,
                    PRODUCT_IDS.YEARLY,
                ],
            });

            if (!products || products.length === 0) {
                console.log('⚠️ No products fetched');
                return [];
            }

            console.log('✅ Fetched products:', products.length);
            products.forEach((product: any) => {
                console.log(`  - ${product.productId}: ${product.localizedPrice}`);
            });

            // ✅ NEW: Cache the products
            storage.set(KEYS.CACHED_PRODUCTS, JSON.stringify({
                products: products,
                timestamp: Date.now(),
            }));
            console.log('💾 Products cached for 24 hours');

            return products as any[];
        } catch (error) {
            console.error('❌ Error fetching subscription products:', error);

            // ✅ NEW: Return cached products as fallback
            const cachedData = storage.getString(KEYS.CACHED_PRODUCTS);
            if (cachedData) {
                try {
                    const { products } = JSON.parse(cachedData);
                    console.log('⚠️ Using stale cache as fallback');
                    return products;
                } catch {
                    return [];
                }
            }

            return [];
        }
    }

    /**
     * Count words in text
     */
    private static countWords(text: string): number {
        if (!text || text.trim().length === 0) return 0;

        // Remove extra whitespace and split by spaces
        return text.trim().split(/\s+/).length;
    }

    /**
     * Check if text exceeds word limit for free users
     * Returns { allowed: boolean, wordCount: number, limit: number }
     */
    static checkWordLimit(text: string): {
        allowed: boolean;
        wordCount: number;
        limit: number;
    } {
        // Premium users have no limit
        if (this.isPremium()) {
            return { allowed: true, wordCount: 0, limit: -1 };
        }

        // Count words in text
        const wordCount = this.countWords(text);

        return {
            allowed: wordCount <= FREE_USER_WORD_LIMIT,
            wordCount,
            limit: FREE_USER_WORD_LIMIT,
        };
    }

    /**
     * Get word limit for current user
     * Returns -1 for premium users (unlimited), or the limit for free users
     */
    static getWordLimit(): number {
        return this.isPremium() ? -1 : FREE_USER_WORD_LIMIT;
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
