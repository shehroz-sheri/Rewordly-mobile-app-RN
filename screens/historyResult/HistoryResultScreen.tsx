import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
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
import { COLORS, FONTS, SPACING } from '../../constants/styling';
import DownloadBottomSheet from '../../components/downloadBottomSheet/DownloadBottomSheet';
import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import RNFS from 'react-native-fs';
import RNShare from 'react-native-share';
import { useApiConfig } from '../../context/ApiConfigContext';

interface HistoryItem {
  id: string;
  type: 'humanizer' | 'remover' | 'paraphraser';
  originalText: string;
  resultText: string;
  date: Date;
  wordCount: number;
}

type HistoryNavProp = NativeStackNavigationProp<
  RootStackParamList,
  'HistoryResult'
>;

type HistoryResultRouteProp = RouteProp<RootStackParamList, 'HistoryResult'>;

// --- History Result Screen Component ---

const HistoryResultScreen: React.FC = () => {
  const navigation = useNavigation<HistoryNavProp>();
  const route = useRoute<HistoryResultRouteProp>();
  const { generatePdfUrl, generateDocxUrl } = useApiConfig();

  // Get the actual history item from route params
  const item = route.params?.item;

  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [showOriginalText, setShowOriginalText] = useState(false);

  // If no item is passed, show error and go back
  if (!item) {
    Alert.alert('Error', 'No history item found', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
    return null;
  }
  // --- Utility Functions ---

  const handleGoBack = () => {
    navigation.goBack();
  };

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    }
  };

  const getTypeLabel = (type: HistoryItem['type']) => {
    switch (type) {
      case 'humanizer':
        return 'AI Humanizer';
      case 'remover':
        return 'Plagiarism Remover';
      case 'paraphraser':
        return 'Text Paraphraser';
      default:
        return 'Result';
    }
  }; // --- Handlers ---

  const handleCopyResult = () => {
    Clipboard.setString(item.resultText);
    showToast('Result text copied to clipboard!');
  }; // NEW: Share function

  const handleShareResult = async () => {
    try {
      const result = await Share.share({
        message: item.resultText,
        title: `Shared Result from ${getTypeLabel(item.type)}`,
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // Shared with activity type of result.activityType
          showToast(`Shared via ${result.activityType}`);
        } else {
          // Shared
        }
      } else if (result.action === Share.dismissedAction) {
        // Dismissed
      }
    } catch (error: any) {
      Alert.alert(error.message);
    }
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

  const handleDownload = async (format: 'PDF' | 'TXT' | 'DOCX', filename: string) => {
    setIsSheetVisible(false);

    try {
      console.log('🔽 Starting file download...');
      console.log('📄 Format:', format);
      console.log('📝 Filename:', filename);

      const fullFilename = `${filename}.${format.toLowerCase()}`;

      // Always save to app's document directory first (works for both platforms)
      const filePath = `${RNFS.DocumentDirectoryPath}/${fullFilename}`;
      console.log('💾 File path:', filePath);

      // Generate file based on format
      if (format === 'TXT') {
        // Save as plain text
        await RNFS.writeFile(filePath, item.resultText, 'utf8');
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
            text: item.resultText,
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
            text: item.resultText,
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

      // Platform-specific handling after file is created
      if (Platform.OS === 'ios') {
        // iOS: Open Share Sheet to let user save/share the file
        console.log('📱 Opening iOS Share Sheet...');

        await RNShare.open({
          url: `file://${filePath}`,
          title: 'Save File',
          subject: fullFilename,
          failOnCancel: false,
        });

        console.log('✅ Share Sheet opened successfully');
      } else {
        // Android: Copy file to Downloads folder for direct access
        const hasPermission = await requestStoragePermission();
        if (!hasPermission) {
          Alert.alert('Permission Denied', 'Storage permission is required to save files.');
          return;
        }

        const downloadPath = `${RNFS.DownloadDirectoryPath}/${fullFilename}`;
        await RNFS.copyFile(filePath, downloadPath);

        ToastAndroid.show(
          `File saved to Downloads/${fullFilename}`,
          ToastAndroid.LONG,
        );
        console.log('✅ File saved to Downloads folder');
      }

      console.log('✅ Download complete!');
    } catch (error: any) {
      console.error('❌ Download failed:', error);

      // Don't show error if user just cancelled the share sheet
      if (error.message && error.message.includes('User did not share')) {
        console.log('ℹ️ User cancelled share sheet');
        return;
      }

      Alert.alert(
        'Download Failed',
        error.message || 'Failed to save file. Please try again.',
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} activeOpacity={0.8} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {getTypeLabel(item.type)} Details
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* --- Scrollable Content Area (Original Text, Result Text, Metadata) --- */}

      <ScrollView
        style={styles.contentScrollArea}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. --- Original Text Toggle Button Section --- */}

        <TouchableOpacity
          style={styles.sectionToggle}
          onPress={() => setShowOriginalText(prev => !prev)}
          activeOpacity={0.75}
        >
          <Text style={styles.sectionTitle}>Original Input</Text>

          <View style={styles.sectionToggleIcon}>
            <Text style={styles.sectionToggleText}>View</Text>
            <Ionicons
              name={
                showOriginalText ? 'chevron-up-outline' : 'chevron-down-outline'
              }
              size={18}
              color={COLORS.primary}
            />
          </View>
        </TouchableOpacity>
        {/* --- Original Text Content (Conditional & Scrollable) --- */}

        {showOriginalText && (
          <View style={[styles.card, styles.originalCardScrollWrapper]}>
            <ScrollView
              style={styles.originalCardScroll}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.cardText} selectable>
                {item.originalText}
              </Text>
            </ScrollView>
          </View>
        )}

        {/* Divider Line */}
        <View style={styles.dividerLine} />

        {/* 2. --- Result Text Section Header --- */}
        <Text style={styles.sectionTitle}>
          Result Output{' '}
          <Text style={styles.sectionSubtitle}>
            &nbsp;(Word Count: {item.wordCount})
          </Text>
        </Text>
        <View
          style={[styles.card, styles.resultCard, styles.resultCardMaxHeight]}
        >
          <ScrollView
            contentContainerStyle={styles.resultScrollContent}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.cardText} selectable>
              {item.resultText}
            </Text>
          </ScrollView>
        </View>
        {/* 4. --- Metadata --- */}
        <View style={styles.metadataContainer}>
          <Text style={styles.metadataText}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={COLORS.secondary}
            />
            Date: {item.date.toLocaleDateString()}
          </Text>
        </View>
      </ScrollView>
      {/* --- Fixed Bottom Area (Actions Row) --- */}
      {/* --- Actions Row (FIXED) --- */}
      <View style={styles.fixedActionsRow}>
        {/* Copy Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleCopyResult}
          activeOpacity={0.85}
        >
          <Ionicons name="copy-outline" size={20} color={COLORS.primary} />
          <Text style={styles.actionText}>Copy</Text>
        </TouchableOpacity>
        {/* NEW: Share Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleShareResult}
          activeOpacity={0.85}
        >
          <Ionicons
            name="share-social-outline"
            size={20}
            color={COLORS.primary}
          />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
        {/* Download Button (Opens Bottom Sheet) */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setIsSheetVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="download-outline" size={22} color={COLORS.primary} />
          <Text style={styles.actionText}>Download</Text>
        </TouchableOpacity>
      </View>
      {/* --- Download Bottom Sheet Component --- */}
      <DownloadBottomSheet
        isVisible={isSheetVisible}
        onClose={() => setIsSheetVisible(false)}
        onDownload={handleDownload}
        defaultFilename={`${item.type}-result-${item.id}`}
      />
    </SafeAreaView>
  );
};

export default HistoryResultScreen;

// --- Styles (No major changes, just ensuring the fixedActionsRow is wide enough for 3 buttons) ---

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.light,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.sora.semiBold,
    color: COLORS.dark,
  },
  iconButton: {
    padding: SPACING.xs,
  },
  contentScrollArea: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  scrollContent: {
    paddingBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.sora.medium,
    color: COLORS.dark,
    marginVertical: SPACING.sm,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: FONTS.dmSans.regular,
    color: COLORS.gray,
  },
  sectionToggleIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.dark,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: SPACING.xs_sm,
  },
  sectionToggleText: {
    fontSize: 14,
    fontFamily: FONTS.dmSans.semiBold,
    color: COLORS.primary,
  },
  sectionToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.offWhite,
    borderRadius: SPACING.sm,
    padding: 0,
    borderWidth: 1,
    borderColor: COLORS.secondary + '10',
    marginBottom: SPACING.md,
  },
  resultCard: {
    backgroundColor: COLORS.primary + '10',
    borderColor: COLORS.primary + '50',
  },
  resultCardMaxHeight: {
    flex: 1,
  },
  resultScrollContent: {
    padding: SPACING.md,
    flexGrow: 1,
  },
  originalCardScrollWrapper: {
    padding: 0,
    marginBottom: SPACING.md,
  },
  originalCardScroll: {
    maxHeight: 200,
    padding: SPACING.md,
  },
  dividerLine: {
    height: 1,
    backgroundColor: COLORS.offWhite,
  },
  cardText: {
    fontSize: 16,
    fontFamily: FONTS.dmSans.regular,
    color: COLORS.dark,
    lineHeight: 23,
  },
  fixedActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm_md,
    backgroundColor: COLORS.light,
    gap: SPACING.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dark,
    borderRadius: SPACING.sm_md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  actionText: {
    fontSize: 16,
    fontFamily: FONTS.sora.medium,
    color: COLORS.primary,
  },
  metadataContainer: {
    marginTop: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  metadataText: {
    fontSize: 13,
    fontFamily: FONTS.dmSans.regular,
    color: COLORS.secondary,
  },
});
