import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  StatusBar,
  FlatList,
  TouchableOpacity,
  ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { COLORS, FONTS, SPACING } from '../../constants/styling';
// import CountryFlag from 'react-native-country-flag';
import CustomButton from '../../components/customButton/CustomButton';

interface Language {
  code: string;
  language: string;
  nativeName: string;
}

const languagesData: Language[] = [
  { code: 'us', language: 'English', nativeName: 'English' },
  { code: 'es', language: 'Spanish', nativeName: 'Español' },
  { code: 'fr', language: 'French', nativeName: 'Français' },
  { code: 'de', language: 'German', nativeName: 'Deutsch' },
  { code: 'it', language: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', language: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', language: 'Russian', nativeName: 'Русский' },
  { code: 'jp', language: 'Japanese', nativeName: '日本語' },
  { code: 'cn', language: 'Chinese (Mandarin)', nativeName: '中文' },
  { code: 'kr', language: 'Korean', nativeName: '한국어' },
  { code: 'sa', language: 'Arabic', nativeName: 'العربية' },
  { code: 'in', language: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'tr', language: 'Turkish', nativeName: 'Türkçe' },
  { code: 'se', language: 'Swedish', nativeName: 'Svenska' },
];

const initialLanguageCode = 'us';

const LanguageScreen: React.FC = () => {
  const [selectedLanguageCode, setSelectedLanguageCode] =
    useState<string>(initialLanguageCode);

  const isApplyButtonEnabled = selectedLanguageCode !== initialLanguageCode;

  const handleSelectLanguage = (code: string) => {
    setSelectedLanguageCode(code);
  };

  const handleApply = () => {
    console.log(`Applying new language: ${selectedLanguageCode}`);

    // 2. You would typically navigate back or re-render the app here
    // e.g., navigation.goBack();
  };

  const renderLanguageItem = ({ item }: ListRenderItemInfo<Language>) => {
    const isSelected = item.code === selectedLanguageCode;

    return (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={() => handleSelectLanguage(item.code)}
        activeOpacity={0.7}
      >
        <View style={styles.languageTextWrapper}>
          {/* <CountryFlag isoCode={item.code} size={24} style={styles.flagIcon} /> */}
          <View>
            <Text style={styles.languageText}>{item.language}</Text>
            <Text style={styles.nativeText}>{item.nativeName}</Text>
          </View>
        </View>

        <View style={[styles.radioOuter]}>
          {isSelected && (
            <Ionicons
              name="checkmark-circle-sharp"
              size={24}
              color={COLORS.dark}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />

      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Select Language</Text>
      </View>

      <View style={styles.contentWrapper}>
        <FlatList
          data={languagesData}
          renderItem={renderLanguageItem}
          keyExtractor={item => item.code}
          contentContainerStyle={styles.listContentContainer}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <View style={styles.footerContainer}>
        <CustomButton
          text="Apply"
          onPress={handleApply}
          disabled={!isApplyButtonEnabled}
          fontSize={18}
          style={styles.applyBtn}
        />
      </View>
    </SafeAreaView>
  );
};

export default LanguageScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  headerContainer: {
    paddingVertical: SPACING.sm_md,
    alignItems: 'center',
    backgroundColor: COLORS.light,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: FONTS.sora.bold,
    color: COLORS.dark,
  },
  contentWrapper: {
    flex: 1,
  },
  listContentContainer: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxl,
  },
  footerContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.light,
  },
  applyBtn: {
    paddingVertical: SPACING.s_md,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.light,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 0.6,
    borderBottomColor: COLORS.surface,
  },
  languageTextWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flagIcon: {
    marginRight: SPACING.md,
    borderRadius: 4,
    overflow: 'hidden',
  },
  languageText: {
    fontSize: 17,
    fontFamily: FONTS.dmSans.medium,
    color: COLORS.dark,
  },
  nativeText: {
    fontSize: 13,
    fontFamily: FONTS.dmSans.regular,
    color: COLORS.secondary,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
