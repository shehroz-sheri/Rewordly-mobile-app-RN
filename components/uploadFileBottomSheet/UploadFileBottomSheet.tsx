import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import {
  pick,
  types,
  isErrorWithCode,
  DocumentPickerResponse,
} from '@react-native-documents/picker';
import { COLORS, FONTS, SPACING } from '../../constants/styling';
import Ionicons from '@react-native-vector-icons/ionicons';

interface UploadFileBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onFileSelect: (file: DocumentPickerResponse) => void;
}

const DOCUMENT_TYPES = {
  TXT: types.plainText,
  PDF: types.pdf,
  WORD: Platform.select({
    ios: [
      'org.openxmlformats.wordprocessingml.document',
      'com.microsoft.word.doc',
    ],
    android: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    default: [],
  }),
};

const UploadFileBottomSheet: React.FC<UploadFileBottomSheetProps> = ({
  isVisible,
  onClose,
  onFileSelect,
}) => {
  const handlePickDocument = async (selectedType: string | string[]) => {
    try {
      const result = await pick({
        type: Array.isArray(selectedType) ? selectedType : [selectedType],
        allowMultiSelection: false,
      });

      if (result && result.length > 0) {
        onFileSelect(result[0]);
        onClose();
      }
    } catch (err) {
      // 2. Updated Cancellation Check
      // The new library throws an error with code 'OPERATION_CANCELED' on user cancel.
      if (isErrorWithCode(err) && err.code === 'OPERATION_CANCELED') {
        console.log('User cancelled file selection');
      } else {
        console.error('Document Picker Error:', err);
        Alert.alert('Error', 'Failed to select file. Please try again.');
      }
    }
  };

  const QuickUploadOption = ({
    title,
    icon,
    mimeType,
  }: {
    title: string;
    icon: string;
    mimeType: string | string[];
  }) => (
    <TouchableOpacity
      style={styles.quickOptionButton}
      onPress={() => handlePickDocument(mimeType)}
    >
      <View style={styles.quickOptionIconContainer}>
        <Ionicons name={icon as any} size={32} color={COLORS.light} />
      </View>
      <Text style={styles.quickOptionText} numberOfLines={1}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <>
      <View style={[styles.clrOverlay, !isVisible && { display: 'none' }]}></View>
      <Modal
        visible={isVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={onClose}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <View
            style={styles.bottomSheetContainer}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.handle} />

            <Text style={styles.title}>Upload Document</Text>

            <View style={styles.optionsRow}>
              <QuickUploadOption
                title="Text"
                icon="document-text-outline"
                mimeType={DOCUMENT_TYPES.TXT}
              />
              <QuickUploadOption
                title="PDF"
                icon="document-attach-outline"
                mimeType={DOCUMENT_TYPES.PDF}
              />
              <QuickUploadOption
                title="Word"
                icon="document-outline"
                mimeType={DOCUMENT_TYPES.WORD || []}
              />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

export default UploadFileBottomSheet;

const styles = StyleSheet.create({
  clrOverlay: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  }, modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    backgroundColor: COLORS.light,
    width: '100%',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs_sm,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.lg,
    borderTopLeftRadius: SPACING.xl,
    borderTopRightRadius: SPACING.xl,
  },
  handle: {
    width: 60,
    height: 5,
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.sm,
    alignSelf: 'center',
    marginVertical: SPACING.sm,
  },
  title: {
    fontSize: 20,
    fontFamily: FONTS.sora.bold,
    color: COLORS.dark,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickOptionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: SPACING.xs,
  },
  quickOptionIconContainer: {
    padding: SPACING.sm_md,
    borderRadius: 40,
    backgroundColor: COLORS.dark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    shadowColor: COLORS.dark,
  },
  quickOptionText: {
    fontSize: 14,
    fontFamily: FONTS.dmSans.medium,
    color: COLORS.dark,
    marginTop: SPACING.xs,
  },
});
