import React, { useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  UIManager,
  LayoutAnimation,
  Dimensions
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // Essential for floating tabs
import { COLORS, FONTS, SPACING } from '../../constants/styling';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CustomBottomTab: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.mainContainer, { paddingBottom: insets.bottom }]}>
      <View style={styles.floatingTabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
                ? options.title
                : route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              // Trigger smooth animation when switching tabs
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              navigation.navigate(route.name, route.params);
            }
          };

          // --- Icon Mapping ---
          let iconName: string;
          if (route.name === 'Home') {
            iconName = isFocused ? 'home' : 'home-outline';
          } else if (route.name === 'History') {
            iconName = isFocused ? 'time' : 'time-outline';
          } else if (route.name === 'Settings') {
            iconName = isFocused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'grid-outline';
          }

          return (
            <TouchableOpacity
              key={index}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              style={[
                styles.tabButton,
                isFocused ? styles.tabButtonFocused : null
              ]}
              activeOpacity={0.8}
            >
              <Ionicons
                name={iconName as any}
                size={20}
                color={isFocused ? COLORS.dark : COLORS.secondary} // Invert color for active state
              />

              {/* Only show label if focused (Pill Design) */}
              {isFocused && (
                <Text
                  numberOfLines={1}
                  style={[styles.tabLabel, isFocused ? { color: COLORS.dark } : { color: COLORS.light }]}
                >
                  {String(label)}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// --- Styles ---

const styles = StyleSheet.create({
  mainContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.dark,
    borderTopLeftRadius: 24, // Rounded top corners
    borderTopRightRadius: 24, // Rounded top corners
  },
  floatingTabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.dark,
    width: '100%', // Full width instead of 80%
    maxWidth: Dimensions.get('window').width > 380 ? '85%' : '80%',
    borderTopLeftRadius: 24, // Rounded top corners
    borderTopRightRadius: 24, // Rounded top corners
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm_md,
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'center',

    // Remove shadow for non-floating design
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,

    marginBottom: 0, // No margin for non-floating
  },
  tabButton: {
    flex: 1,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    flexDirection: 'row', // Align icon and text horizontally
  },
  tabButtonFocused: {
    // flex: 2, // Active tab takes up more space
    backgroundColor: COLORS.primary, // The "Pill" background color
    marginHorizontal: 5,
  },
  tabLabel: {
    fontSize: 12,
    fontFamily: FONTS.sora.medium,
    marginLeft: 6,
  },
});

export default CustomBottomTab;