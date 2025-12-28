import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  ToastAndroid,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DocumentPickerResponse } from '@react-native-documents/picker';
import { COLORS, FONTS, SPACING } from '../../constants/styling';
import Ionicons from '@react-native-vector-icons/ionicons';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import UploadFileBottomSheet from '../../components/uploadFileBottomSheet/UploadFileBottomSheet';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { StorageService } from '../../utils/storage';
import { FileReader } from '../../utils/fileReader';
import { useApiConfig } from '../../context/ApiConfigContext';
import { SubscriptionService } from '../../services/SubscriptionService';
import Clipboard from '@react-native-clipboard/clipboard';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useScreen } from '../../hooks/useScreen';

type StyleOption = 'Casual' | 'Business' | 'Academic';

const styleOptions: { value: StyleOption; label: string }[] = [
  { value: 'Casual', label: 'Casual' },
  { value: 'Business', label: 'Business' },
  { value: 'Academic', label: 'Academic' },
];

const HumanizerScreen: React.FC = () => {
  const { screen_width } = useScreen();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { baseURL, fileExtractUrl } = useApiConfig();
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<StyleOption>('Casual');
  const [isUploadModalVisible, setIsUploadModalVisible] =
    useState<boolean>(false);


  const wordCount = inputText
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0).length;

  const handleHumanize = async () => {
    if (wordCount === 0) {
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          'Please paste or type text to humanize.',
          ToastAndroid.LONG,
        );
      } else {
        Alert.alert('No Input', 'Please paste or type text to humanize.');
      }
      return;
    }

    // ✅ WORD LIMIT CHECK FOR FREE USERS
    const wordCheck = SubscriptionService.checkWordLimit(inputText);
    if (!wordCheck.allowed) {
      Alert.alert(
        'Word Limit Exceeded',
        `Free users can process up to ${wordCheck.limit} words per request. Your text contains ${wordCheck.wordCount} words.\n\nUpgrade to Premium for unlimited words!`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Upgrade to Premium',
            onPress: () => navigation.navigate('Paywall')
          }
        ]
      );
      return;
    }

    // ✅ SUBSCRIPTION CHECK
    const isPremium = SubscriptionService.isPremium();

    // if (!isPremium) {
    //   // Check free tries
    //   const hasFreeTries = SubscriptionService.hasFreeTries('humanizer');

    //   if (!hasFreeTries) {
    //     // No free tries left - navigate directly to paywall
    //     navigation.navigate('Paywall');
    //     return;
    //   }

    //   // Has free try → Use it
    //   SubscriptionService.useFreeTry('humanizer');
    //   console.log('✅ Used free try for Humanizer');
    // }

    if (!baseURL) {
      Alert.alert('Error', 'Please try again later.');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🚀 Starting humanization process...');
      console.log('📝 Input text length:', inputText.length);
      console.log('📊 Word count:', wordCount);
      console.log('🎨 Selected style:', selectedStyle);

      // Call backend API for humanization
      const response = await fetch(baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: inputText,
          type: 'humanize'
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend returned error: ${response.status}`);
      }

      const data = await response.json();

      console.log('✅ Humanization response received:', {
        success: data.success,
        dataLength: data.data?.length || 0,
      });

      if (data.success && data.data) {
        const processedText = data.data;

        console.log('📊 Processed text preview:', processedText.substring(0, 200));
        console.log('📏 Processed text length:', processedText.length);

        // Save to storage
        StorageService.saveOperation({
          type: 'humanizer',
          originalText: inputText,
          resultText: processedText,
          style: selectedStyle,
        });

        // Navigate to result screen
        navigation.navigate('Result', {
          sourceScreen: 'Humanizer',
          originalText: inputText,
          resultText: processedText,
          style: selectedStyle,
        });

        if (Platform.OS === 'android') {
          ToastAndroid.show(
            `Processing complete with ${selectedStyle} style.`,
            ToastAndroid.SHORT,
          );
        } else {
          Alert.alert('Processing Complete', 'The humanized result is ready.');
        }
      } else {
        throw new Error('Backend did not return processed text');
      }
    } catch (error: any) {
      console.error('❌ Humanization failed:', error);
      Alert.alert(
        'Processing Failed',
        error.message || 'Failed to process text. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadOrPaste = () => {
    // Check if user is premium
    const isPremium = SubscriptionService.isPremium();

    if (!isPremium) {
      navigation.navigate('Paywall')
      return;
    }

    // Premium user - show upload modal
    setIsUploadModalVisible(true);
  };

  const handleClearInput = () => {
    setInputText('');
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardContent = await Clipboard.getString();
      if (clipboardContent && clipboardContent.trim().length > 0) {
        setInputText(clipboardContent);
      } else {
        if (Platform.OS === 'android') {
          ToastAndroid.show('Clipboard is empty', ToastAndroid.SHORT);
        } else {
          Alert.alert('Clipboard Empty', 'No text found in clipboard');
        }
      }
    } catch (error) {
      console.error('Error reading clipboard:', error);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Failed to paste', ToastAndroid.SHORT);
      } else {
        Alert.alert('Error', 'Failed to paste from clipboard');
      }
    }
  };

  const handleFileSelected = async (file: DocumentPickerResponse) => {
    console.log('📁 File selected:', {
      name: file.name,
      type: file.type,
      size: file.size,
      uri: file.uri,
    });

    // Show loading state
    setIsLoading(true);

    // Extract text from file
    const result = await FileReader.extractTextFromFile(file);

    // Handle different result statuses
    if (result.status === FileReader.ExtractionResult.SUCCESS && result.text) {
      console.log('✅ Text extracted successfully');
      console.log('📊 Extracted text preview:', result.text.substring(0, 200));
      console.log('📏 Text length:', result.text.length);

      // Validate extracted text
      const validation = FileReader.validateExtractedText(result.text);

      if (!validation.isValid) {
        Alert.alert('Invalid File', validation.error || 'No text found in file');
        setIsLoading(false);
        return;
      }

      console.log('📈 Validation:', {
        wordCount: validation.wordCount,
        charCount: validation.charCount,
      });

      // Set the extracted text to input
      setInputText(result.text);

      // Show success message
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          `File loaded: ${validation.wordCount} words`,
          ToastAndroid.SHORT,
        );
      } else {
        Alert.alert(
          'File Loaded',
          `Successfully extracted ${validation.wordCount} words from ${file.name}`,
        );
      }

      setIsLoading(false);
      return;
    }

    // Handle PDF files - send to backend
    if (result.status === FileReader.ExtractionResult.REQUIRES_BACKEND_PDF ||
      result.status === FileReader.ExtractionResult.REQUIRES_BACKEND_DOCX) {

      if (!fileExtractUrl) {
        Alert.alert('Error', 'File extraction service not configured. Please try again later.');
        setIsLoading(false);
        return;
      }

      try {
        // Convert file to base64
        const fileBase64 = await FileReader.getFileAsBase64(file);

        console.log('📦 File converted to base64, sending to backend...');

        // Call backend API
        const response = await fetch(fileExtractUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileBase64: fileBase64,
          }),
        });

        if (!response.ok) {
          throw new Error(`Backend returned error: ${response.status}`);
        }

        const data = await response.json();

        console.log('✅ Backend response received:', {
          success: data.success,
          wordCount: data.wordCount,
          charCount: data.charCount,
          processingTime: data.processingTime,
        });

        if (data.success && data.text) {
          // Set extracted text to input field
          setInputText(data.text);

          console.log('📊 Text extracted from backend:');
          console.log('📏 Length:', data.charCount);
          console.log('📝 Words:', data.wordCount);
          console.log('⏱️ Processing time:', data.processingTime, 'seconds');

          // Show success message
          if (Platform.OS === 'android') {
            ToastAndroid.show(
              `File loaded: ${data.wordCount} words`,
              ToastAndroid.SHORT,
            );
          } else {
            Alert.alert(
              'File Loaded',
              `Successfully extracted ${data.wordCount} words from ${file.name}`,
            );
          }
        } else {
          throw new Error('Backend did not return text');
        }
      } catch (backendError: any) {
        console.error('❌ Backend extraction failed:', backendError);

        // Check if it's a file size error
        if (backendError.message?.includes('FILE_TOO_LARGE')) {
          const actualMessage = backendError.message.split(':')[1] || 'File is too large. Maximum size is 8MB.';
          Alert.alert('File Too Large', actualMessage);
        } else {
          Alert.alert(
            'Extraction Failed',
            'Failed to extract text from file. Please try again or use a different format.',
          );
        }
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Handle errors
    if (result.status === FileReader.ExtractionResult.ERROR) {
      Alert.alert(
        'Error Reading File',
        result.error || 'Failed to extract text from file. Please try a .txt file or paste text directly.',
      );
      setIsLoading(false);
      return;
    }
  };

  const renderStyleSelector = () => (
    <View style={styles.styleSelectorContainer}>
      {styleOptions.map(option => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.styleButton,
            selectedStyle === option.value && styles.styleButtonSelected,
          ]}
          onPress={() => setSelectedStyle(option.value)}
          disabled={isLoading}
        >
          <Text
            style={[
              styles.styleButtonText,
              selectedStyle === option.value && styles.styleButtonTextSelected,
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />

      <View style={styles.topHeaderBar}>
        <View style={styles.headerSegmentLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
        </View>

        <View style={styles.headerSegmentCenter}>
          <Text style={styles.screenHeading}>Humanizer</Text>
        </View>

        <View style={styles.headerSegmentRight} />
      </View>

      <View style={styles.introContainer}>
        <Text style={styles.headerTitle}>
          Make your AI-written words flow like genuine human expression.
        </Text>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={20}
        showsVerticalScrollIndicator={false}
      >
        {renderStyleSelector()}

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            selectTextOnFocus
            placeholder="Paste Your AI text here or upload a file..."
            placeholderTextColor={COLORS.secondary}
            value={inputText}
            onChangeText={setInputText}
            multiline={true}
            numberOfLines={10}
            editable={!isLoading}
          />

          {/* Centered Paste Button - Only show when input is empty */}
          {inputText.length === 0 && !isLoading && (
            <TouchableOpacity
              style={styles.pasteButtonCenter}
              onPress={handlePasteFromClipboard}
              activeOpacity={0.7}
            >
              <Ionicons name="clipboard-outline" size={screen_width * 0.09} color={COLORS.dark} />
              <Text style={styles.pasteButtonText}>Tap to Paste</Text>
            </TouchableOpacity>
          )}

          <View style={styles.inputControls}>
            <Text style={styles.countText}>
              {wordCount} words
            </Text>
            {wordCount > 0 && (
              <TouchableOpacity onPress={handleClearInput} disabled={isLoading}>
                <MaterialDesignIcons name='delete-outline' size={22} color={COLORS.tertiary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAwareScrollView>

      <View style={styles.footerContainer}>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleUploadOrPaste}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Ionicons
              name="cloud-upload-outline"
              size={28}
              color={COLORS.light}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.humanizeButton}
            onPress={handleHumanize}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.humanizeButtonText}>Humanize</Text>
          </TouchableOpacity>
        </View>
      </View>

      <UploadFileBottomSheet
        isVisible={isUploadModalVisible}
        onClose={() => setIsUploadModalVisible(false)}
        onFileSelect={handleFileSelected}
      />

      {/* Full-Screen Loader Overlay */}
      {isLoading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loaderText}>Processing...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default HumanizerScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.light,
  },
  headerSegmentLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerSegmentCenter: {
    flex: 2,
    alignItems: 'center',
  },
  headerSegmentRight: {
    flex: 1,
  },
  screenHeading: {
    fontSize: 24,
    fontFamily: FONTS.sora.bold,
    color: COLORS.dark,
  },
  introContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  backButton: {
    paddingVertical: SPACING.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.sora.semiBold,
    color: COLORS.dark,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    flexGrow: 1,
    paddingBottom: SPACING.lg,
  },
  styleSelectorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.xl,
    padding: SPACING.xs_sm,
  },
  styleButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: SPACING.lg,
  },
  styleButtonSelected: {
    backgroundColor: COLORS.primary,
  },
  styleButtonText: {
    fontSize: 15,
    fontFamily: FONTS.dmSans.medium,
    color: COLORS.secondary,
  },
  styleButtonTextSelected: {
    color: COLORS.dark,
    fontFamily: FONTS.dmSans.semiBold,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: COLORS.offWhite,
    borderRadius: SPACING.md,
    padding: SPACING.md,
    minHeight: 250,
    paddingBottom: 0,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.dmSans.regular,
    color: COLORS.dark,
    textAlignVertical: 'top',
    height: '100%',
    paddingBottom: SPACING.sm,
  },
  inputControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface,
    backgroundColor: COLORS.offWhite,
  },
  countText: {
    fontSize: 12,
    fontFamily: FONTS.dmSans.regular,
    color: COLORS.secondary,
  },
  pasteButtonCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -40 }, { translateY: -50 }],
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm_md,
    backgroundColor: '#dfe0db81', // Light version of primary color
    borderRadius: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  pasteButtonText: {
    fontSize: 12,
    fontFamily: FONTS.sora.medium,
    color: COLORS.dark,
    marginTop: SPACING.xs,
  },
  footerContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm_md,
    backgroundColor: COLORS.light,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm_md,
    marginBottom: SPACING.sm,
  },
  uploadButton: {
    backgroundColor: COLORS.dark,
    borderRadius: SPACING.xxl,
    padding: SPACING.sm_md,
  },
  humanizeButton: {
    flex: 1,
    backgroundColor: COLORS.dark,
    borderRadius: SPACING.xxl,
    paddingVertical: SPACING.sm_md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  humanizeButtonText: {
    fontSize: 20,
    fontFamily: FONTS.sora.semiBold,
    color: COLORS.light,
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loaderText: {
    marginTop: SPACING.md,
    fontSize: 17,
    fontFamily: FONTS.sora.semiBold,
    color: COLORS.light,
  },
});
