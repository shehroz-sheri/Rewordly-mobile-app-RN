import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ToastAndroid,
  Share,
  PermissionsAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import Clipboard from '@react-native-clipboard/clipboard';
import RNFS from 'react-native-fs';
import { COLORS, FONTS, SPACING } from '../../constants/styling';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { StorageService } from '../../utils/storage';
import { useApiConfig } from '../../context/ApiConfigContext';
import DownloadBottomSheet from '../../components/downloadBottomSheet/DownloadBottomSheet';

type ResultScreenRouteProp = RouteProp<RootStackParamList, 'Result'>;

const ResultScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<ResultScreenRouteProp>();
  const { generatePdfUrl, generateDocxUrl } = useApiConfig();

  // Get navigation params
  const { sourceScreen, originalText, resultText, style } = route.params;

  const [currentResultText, setCurrentResultText] = useState(resultText);
  const [isDownloadSheetVisible, setIsDownloadSheetVisible] = useState(false);

  const resultWordCount = currentResultText
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0).length;

  // Helper function to get screen-specific text
  const getScreenDisplayName = () => {
    switch (sourceScreen) {
      case 'Humanizer':
        return 'Humanizer';
      case 'PlagiarismRemover':
        return 'Plagiarism Remover';
      case 'Paraphrase':
        return 'Paraphrase';
      default:
        return 'Processor';
    }
  };

  const handleCopy = () => {
    if (currentResultText) {
      Clipboard.setString(currentResultText);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Result copied to clipboard!', ToastAndroid.SHORT);
      } else {
        Alert.alert('Copied!', 'Result copied to clipboard.');
      }
    }
  };

  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: currentResultText,
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // shared with activity type of result.activityType
        } else {
          // shared
        }
      } else if (result.action === Share.dismissedAction) {
        // dismissed
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDownload = () => {
    setIsDownloadSheetVisible(true);
  };

  const requestStoragePermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'App needs access to your storage to save files',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error('Permission error:', err);
        return false;
      }
    }
    return true; // iOS doesn't need this permission
  };

  const handleDownloadFile = async (format: 'PDF' | 'TXT' | 'DOCX', filename: string) => {
    setIsDownloadSheetVisible(false);

    try {
      console.log('🔽 Starting file download...');
      console.log('📄 Format:', format);
      console.log('📝 Filename:', filename);

      // Request storage permission for Android
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Storage permission is required to save files.');
        return;
      }

      // Determine file path based on platform
      let filePath: string;
      const fullFilename = `${filename}.${format.toLowerCase()}`;

      if (Platform.OS === 'android') {
        // Android: Save to Downloads folder
        filePath = `${RNFS.DownloadDirectoryPath}/${fullFilename}`;
      } else {
        // iOS: Save to Documents folder
        filePath = `${RNFS.DocumentDirectoryPath}/${fullFilename}`;
      }

      console.log('💾 File path:', filePath);

      // Handle different file formats
      if (format === 'TXT') {
        // Save as plain text
        await RNFS.writeFile(filePath, currentResultText, 'utf8');
        console.log('✅ TXT file saved successfully');
      } else if (format === 'PDF') {
        // Call backend to generate PDF
        console.log('📤 Sending text to backend for PDF generation...');

        if (!generatePdfUrl) {
          throw new Error('PDF generation service not configured');
        }

        const response = await fetch(generatePdfUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: currentResultText,
          }),
        });

        if (!response.ok) {
          throw new Error(`Backend returned error: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ PDF generated by backend');

        if (data.success && data.fileBase64) {
          // Save base64 PDF to file
          await RNFS.writeFile(filePath, data.fileBase64, 'base64');
          console.log('✅ PDF file saved successfully');
        } else {
          throw new Error('Backend did not return PDF file');
        }
      } else if (format === 'DOCX') {
        // Call backend to generate DOCX
        console.log('📤 Sending text to backend for DOCX generation...');

        if (!generateDocxUrl) {
          throw new Error('DOCX generation service not configured');
        }

        const response = await fetch(generateDocxUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: currentResultText,
          }),
        });

        if (!response.ok) {
          throw new Error(`Backend returned error: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ DOCX generated by backend');

        if (data.success && data.fileBase64) {
          // Save base64 DOCX to file
          await RNFS.writeFile(filePath, data.fileBase64, 'base64');
          console.log('✅ DOCX file saved successfully');
        } else {
          throw new Error('Backend did not return DOCX file');
        }
      }

      // Show success message
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          `File saved to Downloads/${fullFilename}`,
          ToastAndroid.LONG,
        );
      } else {
        Alert.alert(
          'Download Complete',
          `File saved to Documents/${fullFilename}`,
        );
      }

      console.log('✅ Download complete!');
    } catch (error: any) {
      console.error('❌ Download failed:', error);
      Alert.alert(
        'Download Failed',
        error.message || 'Failed to save file. Please try again.',
      );
    }
  };

  const handleNewProcess = () => {
    // Reset navigation stack and navigate to the source screen
    // This prevents navigation loops through previous result screens
    navigation.reset({
      index: 1,
      routes: [
        { name: 'MainTabs' },
        { name: sourceScreen }
      ],
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />

      {/* --- Header: Back Button (Left) and Centered Title (Absolute) --- */}
      <View style={styles.topHeaderBar}>
        <View style={styles.headerSegmentLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
        </View>
        <Text style={styles.screenHeadingAbsolute}>Result</Text>
      </View>

      <View style={styles.introContainer}>
        <Text style={styles.headerTitle}>
          Your content has been successfully processed by {getScreenDisplayName()}.
        </Text>
      </View>

      {/* --- Result Display Box with Scrollable Text --- */}
      <View style={styles.resultWrapper}>
        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle}>Final {getScreenDisplayName() === 'Plagiarism Remover' && ''} Output</Text>
          <Text style={styles.countText}>{resultWordCount} words</Text>
        </View>

        <ScrollView
          style={styles.resultTextScrollView}
          contentContainerStyle={styles.resultTextContent}
          showsVerticalScrollIndicator={true}
        >
          <Text selectable style={styles.resultText}>
            {currentResultText}
          </Text>
        </ScrollView>

        {/* --- Action Buttons: Copy, Download, Share (Fixed at Bottom) --- */}
        <View style={styles.utilityActionsRow}>
          <TouchableOpacity
            style={styles.utilityActionButton}
            onPress={handleCopy}
            activeOpacity={0.7}
          >
            <Ionicons name="copy-outline" size={20} color={COLORS.dark} />
            <Text style={styles.utilityActionText}>Copy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.utilityActionButton}
            onPress={handleDownload}
            activeOpacity={0.7}
          >
            <Ionicons
              name="cloud-download-outline"
              size={20}
              color={COLORS.dark}
            />
            <Text style={styles.utilityActionText}>Download</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.utilityActionButton}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Ionicons
              name="share-social-outline"
              size={20}
              color={COLORS.dark}
            />
            <Text style={styles.utilityActionText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* --- Fixed Footer: Primary Action Button --- */}
      <View style={styles.footerContainer}>
        <View style={styles.primaryActionRow}>
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={handleNewProcess}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryActionButtonText}>
              New {getScreenDisplayName()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* --- Download Bottom Sheet --- */}
      <DownloadBottomSheet
        isVisible={isDownloadSheetVisible}
        onClose={() => setIsDownloadSheetVisible(false)}
        onDownload={handleDownloadFile}
        defaultFilename={`${sourceScreen.toLowerCase()}_result_${Date.now()}`}
      />
    </SafeAreaView>
  );
};

export default ResultScreen;

const styles = StyleSheet.create({
  // --- General Layout ---
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  // --- Header ---
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.light,
    position: 'relative',
    justifyContent: 'flex-start',
  },
  headerSegmentLeft: {
    alignItems: 'flex-start',
    zIndex: 10,
  },
  screenHeadingAbsolute: {
    fontSize: 24,
    fontFamily: FONTS.sora.bold,
    color: COLORS.dark,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  introContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  backButton: {
    paddingVertical: SPACING.xs,
    paddingRight: SPACING.md,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: FONTS.dmSans.semiBold,
    color: COLORS.dark,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  // --- Result Display ---
  resultWrapper: {
    flex: 1,
    backgroundColor: COLORS.offWhite,
    borderRadius: SPACING.md,
    padding: SPACING.md,
    paddingBottom: 0,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.surface,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: SPACING.sm,
    marginBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  resultTitle: {
    fontSize: 18,
    fontFamily: FONTS.sora.bold,
    color: COLORS.dark,
  },
  resultTextScrollView: {
    flex: 1,
  },
  resultTextContent: {
    flexGrow: 1,
  },
  resultText: {
    fontSize: 16,
    fontFamily: FONTS.dmSans.regular,
    color: COLORS.dark,
    lineHeight: 24,
  },
  countText: {
    fontSize: 13,
    fontFamily: FONTS.dmSans.medium,
    color: COLORS.secondary,
  },
  // --- New Utility Actions Styling ---
  utilityActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.md,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface,
    marginHorizontal: -SPACING.md, // Use negative margin to span edge-to-edge of the wrapper content
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.light, // Slight background contrast
    borderRadius: SPACING.md, // Match wrapper radius for corners
    borderTopLeftRadius: 0, // Keep top corners flat
    borderTopRightRadius: 0,
  },
  utilityActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    padding: SPACING.xs,
  },
  utilityActionText: {
    fontSize: 14,
    fontFamily: FONTS.dmSans.medium,
    color: COLORS.dark,
  },
  // --- Original Input Preview ---
  originalInputContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.sm,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  originalInputHeader: {
    fontSize: 14,
    fontFamily: FONTS.dmSans.semiBold,
    color: COLORS.secondary,
    marginBottom: SPACING.xs,
  },
  originalInputText: {
    fontSize: 14,
    fontFamily: FONTS.dmSans.regular,
    color: COLORS.dark,
    lineHeight: 20,
  },
  // --- Footer/Primary Action Buttons ---
  footerContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm_md,
    backgroundColor: COLORS.light,
  },
  primaryActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  primaryActionButton: {
    flex: 1,
    backgroundColor: COLORS.dark,
    borderRadius: SPACING.xxl,
    paddingVertical: SPACING.sm_md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryActionButtonText: {
    fontSize: 20,
    fontFamily: FONTS.sora.semiBold,
    color: COLORS.light,
  },
});
