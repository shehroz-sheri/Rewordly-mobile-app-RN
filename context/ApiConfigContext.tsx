import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { ApiConfig, ApiConfigService } from '../utils/storage';

// GitHub raw URL for the config file
const GITHUB_CONFIG_URL =
  'https://raw.githubusercontent.com/harborxtechnologies/app_configs/main/humanizer_app_config.json';

interface ApiConfigContextType {
  baseURL: string | null;
  backupApi: string | null;
  fileExtractUrl: string | null;
  generatePdfUrl: string | null;
  generateDocxUrl: string | null;
  aiDetectorAndroidUrl: string | null;
  aiDetectorIosUrl: string | null;
  plagiarismCheckerAndroidUrl: string | null;
  plagiarismCheckerIosUrl: string | null;
  isLoading: boolean;
  error: string | null;
  refetchConfig: () => Promise<void>;
}

const ApiConfigContext = createContext<ApiConfigContextType>({
  baseURL: null,
  backupApi: null,
  fileExtractUrl: null,
  generatePdfUrl: null,
  generateDocxUrl: null,
  aiDetectorAndroidUrl: null,
  aiDetectorIosUrl: null,
  plagiarismCheckerAndroidUrl: null,
  plagiarismCheckerIosUrl: null,
  isLoading: true,
  error: null,
  refetchConfig: async () => {},
});

interface ApiConfigProviderProps {
  children: ReactNode;
}

export const ApiConfigProvider: React.FC<ApiConfigProviderProps> = ({
  children,
}) => {
  const [baseURL, setBaseURL] = useState<string | null>(null);
  const [backupApi, setBackupApi] = useState<string | null>(null);
  const [fileExtractUrl, setFileExtractUrl] = useState<string | null>(null);
  const [generatePdfUrl, setGeneratePdfUrl] = useState<string | null>(null);
  const [generateDocxUrl, setGenerateDocxUrl] = useState<string | null>(null);
  const [aiDetectorAndroidUrl, setAiDetectorAndroidUrl] = useState<string | null>(null);
  const [aiDetectorIosUrl, setAiDetectorIosUrl] = useState<string | null>(null);
  const [plagiarismCheckerAndroidUrl, setPlagiarismCheckerAndroidUrl] = useState<string | null>(null);
  const [plagiarismCheckerIosUrl, setPlagiarismCheckerIosUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch API configuration from GitHub
   */
  const fetchConfigFromGitHub = async (): Promise<ApiConfig | null> => {
    try {
      const response = await fetch(GITHUB_CONFIG_URL);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const config: ApiConfig = await response.json();

      // Validate config structure
      if (!config.base_URL || !config.backupApi || !config.ttl) {
        throw new Error('Invalid config structure from GitHub');
      }

      return config;
    } catch (err) {
      console.error('Error fetching config from GitHub:', err);
      return null;
    }
  };

  /**
   * Load API configuration (from cache or GitHub)
   */
  const loadConfig = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Try to get from cache first
      const cachedConfig = ApiConfigService.getApiConfig();

      if (cachedConfig) {
        console.log('Using cached API config');
        setBaseURL(cachedConfig.base_URL);
        setBackupApi(cachedConfig.backupApi);
        setFileExtractUrl(cachedConfig.file_extract_URL || null);
        setGeneratePdfUrl(cachedConfig.generate_pdf_URL || null);
        setGenerateDocxUrl(cachedConfig.generate_docx_URL || null);
        setAiDetectorAndroidUrl(cachedConfig.ai_detector_android_url || null);
        setAiDetectorIosUrl(cachedConfig.ai_detector_ios_url || null);
        setPlagiarismCheckerAndroidUrl(cachedConfig.plagiarism_checker_android_url || null);
        setPlagiarismCheckerIosUrl(cachedConfig.plagiarism_checker_ios_url || null);
        setIsLoading(false);
        return;
      }

      // Cache miss or expired, fetch from GitHub
      console.log('Fetching API config from GitHub...');
      const freshConfig = await fetchConfigFromGitHub();

      if (freshConfig) {
        // Save to cache
        ApiConfigService.saveApiConfig(freshConfig);
        setBaseURL(freshConfig.base_URL);
        setBackupApi(freshConfig.backupApi);
        setFileExtractUrl(freshConfig.file_extract_URL || null);
        setGeneratePdfUrl(freshConfig.generate_pdf_URL || null);
        setGenerateDocxUrl(freshConfig.generate_docx_URL || null);
        setAiDetectorAndroidUrl(freshConfig.ai_detector_android_url || null);
        setAiDetectorIosUrl(freshConfig.ai_detector_ios_url || null);
        setPlagiarismCheckerAndroidUrl(freshConfig.plagiarism_checker_android_url || null);
        setPlagiarismCheckerIosUrl(freshConfig.plagiarism_checker_ios_url || null);
        console.log('API config fetched and cached successfully');
      } else {
        setError('Failed to fetch API configuration');
      }
    } catch (err) {
      console.error('Error loading API config:', err);
      setError('Failed to load API configuration');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Manually refetch configuration (useful for retry)
   */
  const refetchConfig = async () => {
    ApiConfigService.clearApiConfig();
    await loadConfig();
  };

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  return (
    <ApiConfigContext.Provider
      value={{
        baseURL,
        backupApi,
        fileExtractUrl,
        generatePdfUrl,
        generateDocxUrl,
        aiDetectorAndroidUrl,
        aiDetectorIosUrl,
        plagiarismCheckerAndroidUrl,
        plagiarismCheckerIosUrl,
        isLoading,
        error,
        refetchConfig,
      }}
    >
      {children}
    </ApiConfigContext.Provider>
  );
};

/**
 * Custom hook to access API configuration
 */
export const useApiConfig = (): ApiConfigContextType => {
  const context = useContext(ApiConfigContext);

  if (!context) {
    throw new Error('useApiConfig must be used within ApiConfigProvider');
  }

  return context;
};
