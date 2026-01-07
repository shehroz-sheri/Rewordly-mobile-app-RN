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
     * Can optionally wait for API config to be loaded
     */
    static async initialize(waitForApiConfig: boolean = false, maxWaitTime: number = 5000) {
        try {
            console.log('🔄 Initializing IAP connection...');

            // Only initialize on iOS
            if (Platform.OS !== 'ios') {
                console.log('⚠️ IAP only available on iOS');
                return;
            }

            // Optionally wait for API config to be loaded
            if (waitForApiConfig) {
                const { ApiConfigService } = require('../utils/storage');
                const startTime = Date.now();
                let apiConfig = ApiConfigService.getApiConfig();
                
                while (!apiConfig && (Date.now() - startTime) < maxWaitTime) {
                    console.log('⏳ Waiting for API config to load...');
                    await new Promise(resolve => setTimeout(resolve, 500));
                    apiConfig = ApiConfigService.getApiConfig();
                }
                
                if (apiConfig) {
                    console.log('✅ API config loaded');
                } else {
                    console.warn('⚠️ API config not loaded after waiting, proceeding anyway');
                }
            }

            await RNIap.initConnection();
            console.log('✅ IAP Connection initialized');

            // ✅ CLEAR CACHE on app start to ensure fresh products
            console.log('🧹 Clearing product cache on initialization...');
            try {
                const currentCache = storage.getString(KEYS.CACHED_PRODUCTS);
                if (currentCache) {
                    // MMKV uses 'remove' method
                    (storage as any).remove(KEYS.CACHED_PRODUCTS);
                    console.log('✅ Cache cleared');
                } else {
                    console.log('ℹ️ No cache to clear');
                }
            } catch (error) {
                // Fallback: overwrite with empty string
                storage.set(KEYS.CACHED_PRODUCTS, '');
                console.log('✅ Cache cleared (fallback method)');
            }

            // Check current subscription status with validation
            await this.checkSubscriptionStatus();

            // ✅ NEW: Fetch subscription products early (fresh fetch after cache clear)
            console.log('📦 Pre-fetching subscription products (fresh)...');
            await this.getSubscriptionProducts();

            // Set up purchase listeners
            this.setupPurchaseListeners();

            console.log('✅ Subscription service ready');
        } catch (error) {
            console.error('❌ IAP initialization failed:', error);
        }
    }

    /**
     * Get full App Store receipt for iOS (required for server-side validation)
     */
    private static async getReceiptIOS(): Promise<string | null> {
        try {
            if (Platform.OS !== 'ios') {
                return null;
            }
            
            // Get the full App Store receipt (base64 encoded)
            // Using getReceiptDataIOS for react-native-iap v14+
            const receipt = await RNIap.getReceiptDataIOS();
            return receipt || null;
        } catch (error) {
            console.error('❌ Error getting iOS receipt:', error);
            return null;
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

                try {
                    let receipt: string | null = null;

                    // For iOS, get the full App Store receipt (required for server-side validation)
                    if (Platform.OS === 'ios') {
                        receipt = await this.getReceiptIOS();
                        if (!receipt) {
                            console.error('❌ Failed to retrieve iOS receipt');
                            Alert.alert('Error', 'Failed to retrieve purchase receipt. Please try again.');
                            return;
                        }
                    } else {
                        receipt = purchase.transactionId;
                    }

                    if (receipt) {
                        // Validate receipt
                        const isValid = await this.validateReceipt(receipt);

                        if (isValid) {
                            // Grant premium access
                            storage.set(KEYS.IS_PREMIUM, true);
                            storage.set(KEYS.LAST_RECEIPT, receipt);

                            // Extract and store expiration date if available
                            if (purchase.expirationTime && Platform.OS === 'ios') {
                                // expirationTime is in milliseconds since epoch
                                storage.set(KEYS.SUBSCRIPTION_EXPIRY, purchase.expirationTime);
                            }

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
                    } else {
                        console.error('❌ No receipt available for validation');
                        Alert.alert('Error', 'Failed to retrieve purchase receipt. Please try again.');
                    }
                } catch (error) {
                    console.error('❌ Error processing purchase:', error);
                    Alert.alert('Error', 'An error occurred processing your purchase. Please contact support.');
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
                
                // For iOS, get the full App Store receipt
                let receipt: string | null = null;
                if (Platform.OS === 'ios') {
                    receipt = await this.getReceiptIOS();
                } else {
                    receipt = latestPurchase.transactionId;
                }

                if (receipt) {
                    // Check if subscription has expired (if expiration date is stored)
                    const expiryDate = storage.getNumber(KEYS.SUBSCRIPTION_EXPIRY);
                    if (expiryDate && Date.now() > expiryDate) {
                        console.log('❌ Subscription has expired');
                        storage.set(KEYS.IS_PREMIUM, false);
                        return false;
                    }

                    // ✅ Only validate if needed (once per 12 hours)
                    if (this.shouldValidate()) {
                        console.log('🔄 Validating subscription with server...');
                        const isValid = await this.validateReceipt(receipt);

                        if (isValid) {
                            storage.set(KEYS.IS_PREMIUM, true);
                            storage.set(KEYS.LAST_RECEIPT, receipt);
                            storage.set(KEYS.LAST_VALIDATION, Date.now());

                            // Store expiration date if available
                            if (latestPurchase.expirationTime && Platform.OS === 'ios') {
                                storage.set(KEYS.SUBSCRIPTION_EXPIRY, latestPurchase.expirationTime);
                            }

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
                        // Trust existing status if validated recently, but still check expiration
                        const expiryDate = storage.getNumber(KEYS.SUBSCRIPTION_EXPIRY);
                        if (expiryDate && Date.now() > expiryDate) {
                            console.log('❌ Subscription has expired');
                            storage.set(KEYS.IS_PREMIUM, false);
                            return false;
                        }
                        
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
            console.log('═══════════════════════════════════════');
            console.log('🛒 PURCHASE REQUEST INITIATED');
            console.log('═══════════════════════════════════════');
            console.log('📋 Requested Product ID:', productId);
            console.log('📅 Timestamp:', new Date().toISOString());
            
            // ✅ STEP 1: Verify IAP connection
            console.log('\n[STEP 1] Checking IAP connection...');
            try {
                const connectionStatus = await RNIap.initConnection();
                console.log('✅ IAP Connection Status:', connectionStatus);
            } catch (connError: any) {
                const errorMsg = connError?.message || String(connError);
                if (errorMsg.includes('already')) {
                    console.log('ℹ️ Connection already initialized');
                } else {
                    console.warn('⚠️ Connection warning:', errorMsg);
                    // Still proceed - connection might be ready
                }
            }
            
            // ✅ STEP 2: Ensure products are loaded
            console.log('\n[STEP 2] Verifying products are loaded...');
            let cachedData = storage.getString(KEYS.CACHED_PRODUCTS);
            
            if (!cachedData) {
                console.log('⚠️ No cached products found. Fetching fresh products...');
                await this.getSubscriptionProducts();
                cachedData = storage.getString(KEYS.CACHED_PRODUCTS);
                
                if (!cachedData) {
                    throw new Error('Unable to load products. Please check your connection and try again.');
                }
            } else {
                console.log('✅ Found cached products');
            }
            
            const { products, timestamp } = JSON.parse(cachedData);
            console.log(`📦 Total products in cache: ${products.length}`);
            console.log(`⏰ Cache age: ${Math.floor((Date.now() - timestamp) / 1000 / 60)} minutes`);
            
            // ✅ STEP 3: Find the specific product
            console.log('\n[STEP 3] Finding product in cache...');
            const product = products.find((p: any) => {
                const pId = p.id || p.productId;
                return pId === productId;
            });
            
            if (!product) {
                console.error('❌ PRODUCT NOT FOUND IN CACHE!');
                console.error('   Requested ID:', productId);
                console.error('   Available products:');
                products.forEach((p: any, index: number) => {
                    console.error(`   [${index}] ID: ${p.id || 'undefined'}, productId: ${p.productId || 'undefined'}, Title: ${p.title || 'N/A'}`);
                });
                throw new Error(`Product ${productId} not found. Please refresh and try again.`);
            }
            
            // ✅ STEP 4: Extract product information
            console.log('\n[STEP 4] Product details:');
            const correctProductId = product.id || product.productId || productId;
            console.log('   ✅ Product Found: YES');
            console.log('   📝 Product ID (id field):', product.id);
            console.log('   📝 Product ID (productId field):', product.productId);
            console.log('   🎯 Using ID:', correctProductId);
            console.log('   📛 Title:', product.title);
            console.log('   💰 Price:', product.displayPrice || product.localizedPrice || 'N/A');
            console.log('   📄 Type:', product.type || 'N/A');
            console.log('   📱 Platform:', product.platform || 'N/A');
            
            // ✅ STEP 5: Verify product object structure
            console.log('\n[STEP 5] Product object structure:');
            console.log('   Keys:', Object.keys(product).join(', '));
            console.log('   Full product object:', JSON.stringify(product, null, 2).substring(0, 500));
            
            // ✅ STEP 6: Verify purchase listeners are set up
            console.log('\n[STEP 6] Checking purchase listeners...');
            if (!this.purchaseUpdateSubscription) {
                console.warn('⚠️ Purchase listeners not set up! Setting them up now...');
                this.setupPurchaseListeners();
            } else {
                console.log('✅ Purchase listeners are active');
            }
            
            // ✅ STEP 7: Fetch fresh products to ensure native side has them
            console.log('\n[STEP 7] Refreshing products on native side...');
            let freshProducts: any[] | null = null;
            try {
                freshProducts = await RNIap.fetchProducts({
                    skus: [correctProductId],
                    type: 'subs',
                });
                console.log(`✅ Fresh fetch result: ${freshProducts?.length || 0} product(s) returned`);
                if (freshProducts && freshProducts.length > 0) {
                    const freshProduct = freshProducts[0];
                    console.log('   Fresh product ID:', freshProduct.id || freshProduct.productId);
                    console.log('   Fresh product price:', freshProduct.displayPrice || freshProduct.localizedPrice);
                }
            } catch (fetchError: any) {
                console.warn('⚠️ Fresh fetch warning (continuing anyway):', fetchError?.message);
            }
            
            // ✅ STEP 8: Use fresh product if available
            let productToUse = product;
            if (freshProducts && freshProducts.length > 0) {
                productToUse = freshProducts[0];
                console.log('\n[STEP 8] Using fresh product from native fetch');
            } else {
                console.log('\n[STEP 8] Using cached product');
            }
            
            const finalProductId = productToUse.id || productToUse.productId || correctProductId;
            
            // ✅ STEP 9: Small delay to ensure native side is ready
            console.log('\n[STEP 9] Waiting 200ms for native side to be ready...');
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // ✅ STEP 10: Attempt purchase with multiple methods
            console.log('\n[STEP 10] Attempting purchase with multiple methods...');
            
            let lastError: any = null;
            
            // Method 1: Direct string (old API style)
            console.log('   [Method 1] requestPurchase(productIdString)');
            try {
                await (RNIap.requestPurchase as any)(finalProductId);
                console.log('✅ SUCCESS with Method 1 (string)');
                return;
            } catch (err1: any) {
                lastError = err1;
                console.error('   ❌ Method 1 failed:', err1?.message?.substring(0, 50));
            }
            
            // Method 2: Object with sku
            console.log('   [Method 2] requestPurchase({ sku: productId })');
            try {
                await RNIap.requestPurchase({ sku: finalProductId } as any);
                console.log('✅ SUCCESS with Method 2 ({ sku })');
                return;
            } catch (err2: any) {
                lastError = err2;
                console.error('   ❌ Method 2 failed:', err2?.message?.substring(0, 50));
            }
            
            // Method 3: Using product object directly
            console.log('   [Method 3] requestPurchase(productObject)');
            try {
                await (RNIap.requestPurchase as any)(productToUse);
                console.log('✅ SUCCESS with Method 3 (product object)');
                return;
            } catch (err3: any) {
                lastError = err3;
                console.error('   ❌ Method 3 failed:', err3?.message?.substring(0, 50));
            }
            
            // All methods failed - throw the last error
            throw lastError || new Error('All purchase methods failed');
            
        } catch (error: any) {
            console.error('\n═══════════════════════════════════════');
            console.error('❌ PURCHASE FAILED');
            console.error('═══════════════════════════════════════');
            console.error('Error name:', error?.name);
            console.error('Error code:', error?.code);
            console.error('Error message:', error?.message);
            console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
            console.error('═══════════════════════════════════════\n');

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
                // Get receipt for validation
                let receipt: string | null = null;
                if (Platform.OS === 'ios') {
                    receipt = await this.getReceiptIOS();
                } else if (purchases.length > 0) {
                    receipt = purchases[0].transactionId;
                }

                if (receipt) {
                    // Validate the restored purchase
                    const isValid = await this.validateReceipt(receipt);
                    
                    if (isValid) {
                        storage.set(KEYS.IS_PREMIUM, true);
                        storage.set(KEYS.LAST_RECEIPT, receipt);
                        storage.set(KEYS.LAST_VALIDATION, Date.now());

                        // Store expiration date if available
                        const latestPurchase = purchases[0];
                        if (latestPurchase.expirationTime && Platform.OS === 'ios') {
                            storage.set(KEYS.SUBSCRIPTION_EXPIRY, latestPurchase.expirationTime);
                        }

                        console.log('✅ Purchases restored and validated successfully');
                        return true;
                    } else {
                        console.log('❌ Restored purchase validation failed');
                        return false;
                    }
                } else {
                    // Fallback: if we can't get receipt, still restore based on available purchases
                    storage.set(KEYS.IS_PREMIUM, true);
                    console.log('✅ Purchases restored (receipt validation skipped)');
                    return true;
                }
            } else {
                console.log('ℹ️ No purchases to restore');
                storage.set(KEYS.IS_PREMIUM, false);
                return false;
            }
        } catch (error) {
            console.error('❌ Restore failed:', error);
            return false;
        }
    }

    /**
     * Check if user has premium access
     * Also checks if subscription has expired
     */
    static isPremium(): boolean {
        const isPremium = storage.getBoolean(KEYS.IS_PREMIUM) || false;
        
        if (!isPremium) {
            return false;
        }

        // Check if subscription has expired
        const expiryDate = storage.getNumber(KEYS.SUBSCRIPTION_EXPIRY);
        if (expiryDate && Date.now() > expiryDate) {
            console.log('❌ Premium access expired');
            storage.set(KEYS.IS_PREMIUM, false);
            return false;
        }

        return true;
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

        // Default: 2 tries per feature
        const defaultTries: FreeTries = {
            humanizer: 2,
            paraphrase: 2,
            plagiarism: 2,
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

            // ✅ Ensure connection is initialized before fetching
            try {
                const connectionResult = await RNIap.initConnection();
                console.log('✅ IAP connection confirmed ready:', connectionResult);
            } catch (connError: any) {
                // Connection might already be initialized, or there's an error
                if (connError.message?.includes('already')) {
                    console.log('ℹ️ IAP connection already initialized');
                } else {
                    console.warn('⚠️ Connection check warning:', connError.message);
                    // Still try to proceed - connection might be ready
                }
            }

            // ✅ NEW: Check cache first
            const cachedData = storage.getString(KEYS.CACHED_PRODUCTS);
            if (cachedData) {
                try {
                    const { products, timestamp } = JSON.parse(cachedData);
                    const age = Date.now() - timestamp;
                    const cacheValidMs = 24 * 60 * 60 * 1000; // 24 hours

                    if (age < cacheValidMs && products && products.length > 0) {
                        console.log('✅ Using cached products (age:', Math.floor(age / 1000 / 60), 'minutes)');
                        return products;
                    } else {
                        console.log('⏰ Cache expired or empty, fetching fresh products...');
                    }
                } catch (parseError) {
                    console.error('❌ Error parsing cached products:', parseError);
                }
            }

            // ✅ Add small delay to ensure connection is fully ready
            await new Promise(resolve => setTimeout(resolve, 500));

            // ✅ FIX: Use fetchProducts with type: 'subs' for subscription products
            console.log('🔍 Fetching products with SKUs:', [
                PRODUCT_IDS.WEEKLY,
                PRODUCT_IDS.MONTHLY,
                PRODUCT_IDS.YEARLY,
            ]);
            
            const products = await RNIap.fetchProducts({
                skus: [
                    PRODUCT_IDS.WEEKLY,
                    PRODUCT_IDS.MONTHLY,
                    PRODUCT_IDS.YEARLY,
                ],
                type: 'subs', // ✅ IMPORTANT: Specify 'subs' type for subscriptions
            });

            console.log('📦 Raw products response:', products);

            if (!products || products.length === 0) {
                console.warn('⚠️ No products fetched. Possible reasons:');
                console.warn('  1. Products not configured in App Store Connect');
                console.warn('  2. Products not approved yet');
                console.warn('  3. Testing in simulator (products only work on real device or TestFlight)');
                console.warn('  4. Wrong product IDs');
                console.warn('  5. Network/connection issue');
                return [];
            }

            console.log('✅ Fetched products:', products.length);
            products.forEach((product: any) => {
                console.log(`  ✅ ${product.productId}: ${product.localizedPrice || 'N/A'}`);
                console.log(`     Title: ${product.title || 'N/A'}`);
                console.log(`     Description: ${product.description || 'N/A'}`);
            });

            // ✅ NEW: Cache the products
            storage.set(KEYS.CACHED_PRODUCTS, JSON.stringify({
                products: products,
                timestamp: Date.now(),
            }));
            console.log('💾 Products cached for 24 hours');

            return products as any[];
        } catch (error: any) {
            console.error('❌ Error fetching subscription products:', error);
            console.error('❌ Error code:', error.code);
            console.error('❌ Error message:', error.message);
            console.error('❌ Full error:', JSON.stringify(error, null, 2));

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
