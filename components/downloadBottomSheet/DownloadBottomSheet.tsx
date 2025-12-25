import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  Dimensions,
  Platform,
  ToastAndroid,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { COLORS, FONTS, SPACING } from '../../constants/styling';

// Get screen height for animation/positioning
const { height: screenHeight } = Dimensions.get('window');

// --- Interface Definitions ---

interface DownloadBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onDownload: (format: 'PDF' | 'TXT' | 'DOCX', filename: string) => void;
  defaultFilename: string;
}

const DownloadBottomSheet: React.FC<DownloadBottomSheetProps> = ({
  isVisible,
  onClose,
  onDownload,
  defaultFilename,
}) => {
  const [filename, setFilename] = useState(defaultFilename);
  const [selectedFormat, setSelectedFormat] = useState<'PDF' | 'TXT' | 'DOCX'>(
    'PDF',
  );

  const handleDownloadPress = () => {
    if (!filename.trim()) {
      // Simple validation
      Platform.OS === 'android'
        ? ToastAndroid.show('Filename cannot be empty.', ToastAndroid.SHORT)
        : Alert.alert('Error', 'Filename cannot be empty.');
      return;
    }
    onDownload(selectedFormat, filename.trim());
  };

  const formats: {
    format: 'PDF' | 'TXT' | 'DOCX';
    icon: string;
    label: string;
  }[] = [
      { format: 'PDF', icon: 'file-pdf-box', label: 'PDF' },
      { format: 'DOCX', icon: 'file-word-box', label: 'DOCX' },
      { format: 'TXT', icon: 'card-text', label: 'TXT' },
    ];

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <View style={[styles.clrOverlay, !isVisible && { display: 'none' }]}></View>
      <Modal
        transparent={true}
        visible={isVisible}
        onRequestClose={onClose}
        animationType="slide"
      >
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%' }}
          >
            <View style={styles.bottomSheetContainer}>
              <View style={styles.header}>
                <Text style={styles.title}>📥 &nbsp; Download Result</Text>

                <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.8}>
                  <Ionicons name="close" size={22} color={COLORS.dark} />
                </TouchableOpacity>
              </View>
              {/* File Name Input */}
              <Text style={styles.label}>File Name:</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter file name"
                value={filename}
                onChangeText={setFilename}
                placeholderTextColor={COLORS.secondary}
              />
              {/* Format Options */}
              <Text style={[styles.label, { marginTop: SPACING.md }]}>
                Select Format:
              </Text>

              <View style={styles.formatContainer}>
                {formats.map(item => (
                  <TouchableOpacity
                    key={item.format}
                    activeOpacity={0.7}
                    style={[
                      styles.formatOption,
                      selectedFormat === item.format && styles.formatOptionSelected,
                    ]}
                    onPress={() => setSelectedFormat(item.format)}
                  >
                    <MaterialDesignIcons
                      name={item.icon as any}
                      size={20}
                      color={COLORS.dark}
                    />

                    <Text
                      style={[
                        styles.formatText,
                        selectedFormat === item.format && styles.formatTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {/* Download Button */}
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={handleDownloadPress}
                activeOpacity={0.8}
              >
                <Text style={styles.downloadButtonText}>
                  Download as {selectedFormat}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
};

// --- Bottom Sheet Styles ---

const styles = StyleSheet.create({
  clrOverlay: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    backgroundColor: COLORS.light,
    borderTopLeftRadius: SPACING.lg,
    borderTopRightRadius: SPACING.lg,
    padding: SPACING.lg,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm_md,
  },
  title: {
    fontSize: 18,
    fontFamily: FONTS.sora.semiBold,
    color: COLORS.dark,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  label: {
    fontSize: 14,
    fontFamily: FONTS.sora.medium,
    color: COLORS.dark,
    marginBottom: SPACING.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.offWhite,
    borderRadius: SPACING.sm,
    paddingHorizontal: SPACING.md,
    fontSize: 16,
    fontFamily: FONTS.dmSans.regular,
    color: COLORS.dark,
    backgroundColor: COLORS.offWhite + '50',
  },
  formatContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  formatOption: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xs_sm,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.offWhite,
    borderRadius: SPACING.sm,
    backgroundColor: COLORS.offWhite + '50',
  },
  formatOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#E6F9C6',
  },
  formatText: {
    fontSize: 14,
    fontFamily: FONTS.sora.medium,
    color: COLORS.dark,
  },
  formatTextSelected: {
    color: COLORS.dark,
    fontFamily: FONTS.sora.semiBold,
  },
  downloadButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.sm_md,
    borderRadius: SPACING.sm,
    alignItems: 'center',
  },
  downloadButtonText: {
    fontSize: 16,
    fontFamily: FONTS.sora.semiBold,
    color: COLORS.dark,
  },
});

export default DownloadBottomSheet;
