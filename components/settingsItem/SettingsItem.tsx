import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { COLORS, FONTS, SPACING } from '../../constants/styling';

type IconSet = 'MaterialDesignIcons' | 'Ionicons';

interface SettingsItemProps {
  iconSet: IconSet;
  iconName: string;
  label: string;
  onPress: () => void;
  isLastInGroup: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({
  iconSet,
  iconName,
  label,
  onPress,
  isLastInGroup,
}) => {
  const IconComponent =
    iconSet === 'MaterialDesignIcons' ? MaterialDesignIcons : Ionicons;

  return (
    <TouchableOpacity
      style={[styles.itemContainer, !isLastInGroup && styles.separator]}
      activeOpacity={0.6}
      onPress={onPress}
    >
      <View style={styles.iconBackground}>
        <IconComponent name={iconName as any} size={24} color={COLORS.dark} />
      </View>
      <Text style={styles.labelText}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={COLORS.secondary} />
    </TouchableOpacity>
  );
};

export default SettingsItem;

const styles = StyleSheet.create({
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.light,
    paddingVertical: SPACING.sm_md,
    paddingHorizontal: SPACING.md,
    width: '100%',
  },
  separator: {
    borderBottomWidth: 0.6,
    // borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.surface,
  },
  iconBackground: {
    backgroundColor: COLORS.primary,
    borderRadius: SPACING.sm,
    padding: SPACING.xs_sm,
    marginRight: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: {
    flex: 1,
    fontSize: 17,
    fontFamily: FONTS.dmSans.regular,
    color: COLORS.dark,
  },
});
