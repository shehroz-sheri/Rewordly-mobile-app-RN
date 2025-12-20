import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { HomeScreenFeatures } from '../../screens/home/HomeScreen';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { COLORS, FONTS, SPACING } from '../../constants/styling';

const RenderSecondaryCard = (feature: HomeScreenFeatures) => (
  <TouchableOpacity
    key={feature.id}
    style={styles.secondaryCardContainer}
    onPress={feature.action}
    activeOpacity={0.7}
  >
    <View
      style={[styles.secondaryIconWrapper, { backgroundColor: feature.color }]}
    >
      <MaterialDesignIcons
        name={feature.icon as any}
        size={24}
        color={COLORS.light}
      />
    </View>
    <View style={styles.textWrapper}>
      <Text style={styles.secondaryRowTitle}>{feature.title}</Text>
      <Text style={styles.secondaryRowSubtitle}>{feature.subtitle}</Text>
    </View>
    <MaterialDesignIcons
      name="chevron-right"
      size={20}
      color={COLORS.secondary}
    />
  </TouchableOpacity>
);

export default RenderSecondaryCard;

const styles = StyleSheet.create({
  secondaryCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm_md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.light,
    borderRadius: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surface,
  },
  secondaryIconWrapper: {
    borderRadius: SPACING.sm,
    padding: SPACING.xs_sm,
    marginRight: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryRowTitle: {
    fontSize: 17,
    fontFamily: FONTS.sora.semiBold,
    color: COLORS.dark,
    marginBottom: 1,
  },
  secondaryRowSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.dmSans.regular,
    color: COLORS.secondary,
  },
  textWrapper: {
    flex: 1,
  },
});
