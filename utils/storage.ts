import { createMMKV } from 'react-native-mmkv';

// Initialize MMKV storage using v4 API
// Using simple configuration to avoid initialization errors
export const storage = createMMKV({
    id: 'rewordly-storage',
});

// TypeScript interfaces
export interface HistoryItem {
    id: string;
    type: 'humanizer' | 'remover' | 'paraphraser';
    originalText: string;
    resultText: string;
    date: Date;
    wordCount: number;
    style?: 'Casual' | 'Business' | 'Academic';
}

const HISTORY_KEY = 'history_items';

// Storage Service
export const StorageService = {
    /**
     * Save a new operation to history
     */
    saveOperation: (operation: Omit<HistoryItem, 'id' | 'date' | 'wordCount'>) => {
        try {
            const newItem: HistoryItem = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                date: new Date(),
                wordCount: operation.resultText
                    .trim()
                    .split(/\s+/)
                    .filter(w => w.length > 0).length,
                ...operation,
            };

            const existingData = StorageService.getAllOperations();
            const updatedData = [newItem, ...existingData];

            storage.set(HISTORY_KEY, JSON.stringify(updatedData));
            return newItem;
        } catch (error) {
            console.error('Error saving operation:', error);
            return null;
        }
    },

    /**
     * Get all operations from history
     */
    getAllOperations: (): HistoryItem[] => {
        try {
            const data = storage.getString(HISTORY_KEY);
            if (!data) return [];

            const parsed = JSON.parse(data);
            // Convert date strings back to Date objects
            return parsed.map((item: any) => ({
                ...item,
                date: new Date(item.date),
            }));
        } catch (error) {
            console.error('Error getting operations:', error);
            return [];
        }
    },

    /**
     * Delete a specific operation by ID
     */
    deleteOperation: (id: string): boolean => {
        try {
            const existingData = StorageService.getAllOperations();
            const updatedData = existingData.filter(item => item.id !== id);

            storage.set(HISTORY_KEY, JSON.stringify(updatedData));
            return true;
        } catch (error) {
            console.error('Error deleting operation:', error);
            return false;
        }
    },

    /**
     * Clear all operations from history
     */
    clearAllOperations: (): boolean => {
        try {
            storage.remove(HISTORY_KEY);
            return true;
        } catch (error) {
            console.error('Error clearing operations:', error);
            return false;
        }
    },

    /**
     * Get operations by type
     */
    getOperationsByType: (
        type: 'humanizer' | 'remover' | 'paraphraser',
    ): HistoryItem[] => {
        try {
            const allOperations = StorageService.getAllOperations();
            return allOperations.filter(item => item.type === type);
        } catch (error) {
            console.error('Error getting operations by type:', error);
            return [];
        }
    },

    /**
     * Get total count of operations
     */
    getOperationsCount: (): number => {
        try {
            const allOperations = StorageService.getAllOperations();
            return allOperations.length;
        } catch (error) {
            console.error('Error getting operations count:', error);
            return 0;
        }
    },

    /**
     * Mark onboarding as completed
     */
    setOnboardingCompleted: (): void => {
        try {
            storage.set('onboarding_completed', true);
        } catch (error) {
            console.error('Error setting onboarding completed:', error);
        }
    },

    /**
     * Check if onboarding has been completed
     */
    hasCompletedOnboarding: (): boolean => {
        try {
            return storage.getBoolean('onboarding_completed') || false;
        } catch (error) {
            console.error('Error checking onboarding status:', error);
            return false;
        }
    },
};

// API Configuration interfaces
export interface ApiConfig {
    base_URL: string;
    backupApi: string;
    ttl: number;
    file_extract_URL?: string;
    generate_pdf_URL?: string;
    generate_docx_URL?: string;
    ai_detector_android_url?: string;
    ai_detector_ios_url?: string;
    plagiarism_checker_android_url?: string;
    plagiarism_checker_ios_url?: string;
    validate_receipt_URL?: string;
}

interface CachedApiConfig {
    config: ApiConfig;
    timestamp: number;
}

const API_CONFIG_KEY = 'api_config';

// API Configuration Service
export const ApiConfigService = {
    /**
     * Save API configuration with current timestamp
     */
    saveApiConfig: (config: ApiConfig): boolean => {
        try {
            const cachedData: CachedApiConfig = {
                config,
                timestamp: Date.now(),
            };
            storage.set(API_CONFIG_KEY, JSON.stringify(cachedData));
            return true;
        } catch (error) {
            console.error('Error saving API config:', error);
            return false;
        }
    },

    /**
     * Get API configuration if valid (not expired based on TTL)
     * Returns null if expired or not found
     */
    getApiConfig: (): ApiConfig | null => {
        try {
            const data = storage.getString(API_CONFIG_KEY);
            if (!data) return null;

            const cachedData: CachedApiConfig = JSON.parse(data);
            const currentTime = Date.now();
            const elapsedSeconds = (currentTime - cachedData.timestamp) / 1000;

            // Check if cache has expired based on TTL
            if (elapsedSeconds > cachedData.config.ttl) {
                console.log('API config cache expired, TTL exceeded');
                return null;
            }

            return cachedData.config;
        } catch (error) {
            console.error('Error getting API config:', error);
            return null;
        }
    },

    /**
     * Clear API configuration from storage
     */
    clearApiConfig: (): boolean => {
        try {
            storage.remove(API_CONFIG_KEY);
            return true;
        } catch (error) {
            console.error('Error clearing API config:', error);
            return false;
        }
    },

    /**
     * Check if API config exists and is valid
     */
    isApiConfigValid: (): boolean => {
        const config = ApiConfigService.getApiConfig();
        return config !== null;
    },
};
