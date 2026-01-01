import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING } from '../../constants/styling';

const CustomBottomTab: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.mainContainer, { paddingBottom: insets.bottom }]}>
      <View style={styles.tabBar}>
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
              navigation.navigate(route.name, route.params);
            }
          };

          // Icon Mapping
          let iconName: string;
          if (route.name === 'Home') {
            iconName = isFocused ? 'home' : 'home-outline';
          } else if (route.name === 'History') {
            iconName = isFocused ? 'time' : 'time-outline';
          } else if (route.name === 'Settings') {
            iconName = isFocused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'ellipse';
          }

          return (
            <TouchableOpacity
              key={index}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              style={styles.tabButton}
              activeOpacity={1}
            >
              <Ionicons
                name={iconName as any}
                size={24}
                color={isFocused ? COLORS.dark : '#9CA3AF'}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isFocused ? COLORS.dark : '#9CA3AF' }
                ]}
              >
                {String(label)}
              </Text>

              {/* Active indicator line */}
              {isFocused && (
                <View style={styles.activeIndicator} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.offWhite,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    // paddingBottom: SPACING.xs,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.sm + 2,
  },
  tabLabel: {
    fontSize: 12,
    fontFamily: FONTS.sora.medium,
    marginTop: 4,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 4,
    width: '50%',
    backgroundColor: COLORS.dark,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
});

export default CustomBottomTab;