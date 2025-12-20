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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { COLORS, FONTS, SPACING } from '../../constants/styling';
import DownloadBottomSheet from '../../components/downloadBottomSheet/DownloadBottomSheet';
import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';

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

  const handleDownload = (format: 'PDF' | 'TXT' | 'DOCX', filename: string) => {
    // 1. Logic to convert item.resultText to the selected format goes here.
    // 2. Logic to save the file to the user's device.
    // Placeholder implementation:
    console.log(
      `Attempting to download result as ${format} with filename: ${filename}...`,
    );
    Alert.alert(
      'Download Initiated',
      `Result is being exported as a ${format} file named "${filename}". (This is a mock action.)`,
    );
    setIsSheetVisible(false);
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
