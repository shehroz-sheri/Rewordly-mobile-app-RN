import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
  Platform,
  Alert,
  ToastAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { COLORS, FONTS, SPACING } from '../../constants/styling';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useApiConfig } from '../../context/ApiConfigContext';
import AppLogo from '../../assets/logo.svg';
import { SubscriptionService } from '../../services/SubscriptionService';

// --- TYPES ---
type ToolItem = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  bgColor: string;
  textColor: string;
  route?: keyof RootStackParamList;
  deepLinkScheme?: string;
  isExternal?: boolean;
};

const HomeScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { aiDetectorAndroidUrl, aiDetectorIosUrl, plagiarismCheckerAndroidUrl, plagiarismCheckerIosUrl } = useApiConfig();
  const [isPremiumUser, setIsPremiumUser] = useState(false);

  // Check premium status when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const checkPremium = () => {
        const premium = SubscriptionService.isPremium();
        setIsPremiumUser(premium);
      };
      checkPremium();
    }, [])
  );

  const handleGoPro = () => {
    navigation.navigate('Paywall');
  };

  const toolWidgets: ToolItem[] = [
    {
      id: 'humanizer',
      icon: 'star-four-points-outline',
      title: 'AI Text Humanizer',
      subtitle: 'Turn AI-style text into smooth, natural human language.',
      bgColor: COLORS.primary,
      textColor: COLORS.dark,
      route: 'Humanizer',
    },
    {
      id: 'paraphraser',
      icon: 'fountain-pen-tip',
      title: 'Paraphraser Tool',
      subtitle: 'Rewrite sentences with clear and original wording.',
      bgColor: '#FFD6C3',
      textColor: COLORS.dark,
      route: 'Paraphrase',
    },
    {
      id: 'plag-remove',
      icon: 'file-document-edit-outline',
      title: 'Plagiarism Remover',
      subtitle: 'Detect and rewrite duplicated text to make it unique.',
      bgColor: '#D2EEFF',
      textColor: '#0D47A1',
      route: 'PlagiarismRemover',
    },
  ];

  const verifyTools: ToolItem[] = [
    {
      id: 'detector-ai',
      icon: 'robot-excited-outline',
      title: 'AI Detector',
      subtitle: 'Check Score',
      bgColor: '#FFFFFF',
      textColor: COLORS.dark,
      deepLinkScheme: 'ai-detector-app://',
      isExternal: true,
    },
    {
      id: 'detector-plag',
      icon: 'file-search-outline',
      title: 'Check Plagiarism',
      subtitle: 'Scan Originality',
      bgColor: '#FFFFFF',
      textColor: COLORS.dark,
      deepLinkScheme: 'plag-detector-app://',
      isExternal: true,
    },
  ];

  // --- HANDLERS ---
  const handleNavigation = (item: ToolItem) => {
    // Check if it's an external tool (AI Detector or Check Plagiarism)
    if (item.isExternal) {
      let targetUrl: string | null = null;
      
      // Determine which URL to use based on platform and tool type
      if (item.id === 'detector-ai') {
        targetUrl = Platform.OS === 'android' ? aiDetectorAndroidUrl : aiDetectorIosUrl;
      } else if (item.id === 'detector-plag') {
        targetUrl = Platform.OS === 'android' ? plagiarismCheckerAndroidUrl : plagiarismCheckerIosUrl;
      }
      
      // Check if URL exists and is not empty
      if (targetUrl && targetUrl.trim().length > 0) {
        console.log(`🔗 Opening external URL for ${item.title}:`, targetUrl);
        Linking.openURL(targetUrl).catch((err) => {
          console.error('❌ Failed to open URL:', err);
          Alert.alert(
            'Error',
            'Failed to open the link. Please try again later.',
          );
        });
        return;
      }
      
      // Show "Coming Soon" if URL is not available
      console.log(`ℹ️ No URL configured for ${item.title} on ${Platform.OS}`);
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          `${item.title} - Coming Soon!`,
          ToastAndroid.LONG,
        );
      } else {
        Alert.alert(
          'Coming Soon!',
          `${item.title} feature will be available soon.`,
          [{ text: 'OK', style: 'default' }],
        );
      }
      return;
    }
    
    // Navigate to internal screens
    if (item.route) navigation.navigate(item.route as any);
  };

  // --- RENDERERS ---

  const renderSquareWidget = (item: ToolItem) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.squareWidget, { backgroundColor: item.bgColor }]}
      activeOpacity={0.9}
      onPress={() => handleNavigation(item)}
    >
      <View style={styles.widgetHeader}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: 'rgba(255,255,255,0.3)' },
          ]}
        >
          <MaterialDesignIcons
            name={item.icon as any}
            size={24}
            color={item.textColor}
          />
        </View>
        <MaterialDesignIcons
          name="arrow-top-right"
          size={20}
          color={item.textColor}
          style={{ opacity: 0.6 }}
        />
      </View>
      <View style={{ marginTop: 'auto' }}>
        <Text
          style={[styles.widgetTitle, { color: item.textColor, marginTop: 4 }]}
        >
          {item.title}
        </Text>
        <Text
          style={[
            styles.widgetSubtitle,
            { color: item.textColor, opacity: 0.8 },
          ]}
        >
          {item.subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderWideWidget = (item: ToolItem) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.wideWidget, { backgroundColor: item.bgColor }]}
      activeOpacity={0.9}
      onPress={() => handleNavigation(item)}
    >
      <View style={styles.wideContent}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: 'rgba(255,255,255,0.3)' },
          ]}
        >
          <MaterialDesignIcons
            name={item.icon as any}
            size={24}
            color={item.textColor}
          />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.widgetTitle, { color: item.textColor }]}>
            {item.title}
          </Text>
          <Text
            style={[
              styles.widgetSubtitle,
              { color: item.textColor, opacity: 0.8 },
            ]}
          >
            {item.subtitle}
          </Text>
        </View>
      </View>
      <MaterialDesignIcons
        name="arrow-right-circle"
        size={32}
        color={item.textColor}
        style={{ opacity: 0.5, marginLeft: 4 }}
      />
    </TouchableOpacity>
  );

  const renderExternalCard = (item: ToolItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.externalCard}
      activeOpacity={0.8}
      onPress={() => handleNavigation(item)}
    >
      <View style={styles.adBadge}>
        <Text style={styles.adText}>AD</Text>
      </View>
      <View style={styles.externalIconBox}>
        <MaterialDesignIcons
          name={item.icon as any}
          size={26}
          color={COLORS.dark}
        />
      </View>
      <Text style={styles.externalTitle}>{item.title}</Text>
      <Text style={styles.externalSubtitle}>{item.subtitle}</Text>
      {/* <View style={styles.externalLinkRow}>
        <Text style={styles.externalLinkText}>Open App</Text>
        <MaterialDesignIcons
          name="open-in-new"
          size={12}
          color={COLORS.primary}
        />
      </View> */}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />

      {/* HEADER */}
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <AppLogo
            width={35}
            height={35}
            stroke={COLORS.light}
            strokeWidth={2}
          />
          <View>
            <Text style={styles.appName}>Text Tools</Text>
          </View>
        </View>
        <View>
          {/* Get Pro Button */}
          {!isPremiumUser && (
            <TouchableOpacity
              onPress={handleGoPro}
              style={styles.proButton}
              activeOpacity={0.8}
            >
              <Text style={styles.proButtonText}>Go PRO</Text>
              <MaterialDesignIcons
                name="crown"
                size={24}
                color="#F5C542"
                style={styles.crownIcon}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Transform &amp; Refine</Text>
          <Text style={styles.sectionDesc}>
            Elevate content quality by humanizing AI text, removing plagiarism,
            and improving grammar.
          </Text>
        </View>
        <View style={styles.gridContainer}>
          <View style={styles.row}>
            {renderSquareWidget(toolWidgets[0])}
            {renderSquareWidget(toolWidgets[1])}
          </View>
          {renderWideWidget(toolWidgets[2])}
        </View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Detection Tools</Text>
          <Text style={styles.sectionDesc}>
            Quickly verify the source &amp; originality of any written content
          </Text>
        </View>
        <View style={styles.externalRow}>
          {verifyTools.map(renderExternalCard)}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
    backgroundColor: COLORS.light,
    // borderBottomLeftRadius: 16,
    // borderBottomRightRadius: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  appName: {
    fontSize: 20,
    fontFamily: FONTS.sora.bold,
    color: COLORS.dark,
  },
  proButton: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  proButtonText: {
    color: COLORS.dark,
    fontFamily: FONTS.sora.bold,
    fontSize: 15,
    paddingBottom: 2,
  },
  crownIcon: {
    position: 'absolute',
    top: -12,
    right: -10,
    transform: [{ rotate: '45deg' }],
  },
  scrollContent: { paddingTop: 10 },
  sectionHeader: {
    paddingHorizontal: SPACING.lg,
    marginBottom: 16,
    marginTop: 4,
  },
  sectionLabel: {
    fontFamily: FONTS.sora.bold,
    fontSize: 18,
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 13,
    fontFamily: FONTS.dmSans.medium,
    opacity: 0.5,
  },
  gridContainer: {
    paddingHorizontal: SPACING.lg,
    gap: 16,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  squareWidget: {
    flex: 1,
    borderRadius: SPACING.xxl,
    padding: SPACING.md,
    justifyContent: 'space-between',
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  widgetTitle: {
    fontSize: 18,
    fontFamily: FONTS.sora.bold,
    marginBottom: 5,
  },
  widgetSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.dmSans.regular,
    lineHeight: 15.5,
  },
  wideWidget: {
    width: '100%',
    borderRadius: 30,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wideContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  externalRow: {
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    gap: SPACING.md,
  },
  externalCard: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderRadius: 28,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    position: 'relative',
    alignItems: 'flex-start',
  },
  adBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: COLORS.light,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  adText: {
    fontSize: 9,
    fontFamily: FONTS.sora.bold,
    color: '#888',
  },
  externalIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  externalTitle: {
    fontSize: 15,
    fontFamily: FONTS.sora.semiBold,
    color: COLORS.dark,
    marginBottom: 2,
  },
  externalSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.dmSans.regular,
    color: COLORS.secondary,
  },
});
