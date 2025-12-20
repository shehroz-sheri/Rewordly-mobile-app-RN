import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, SPACING } from '../../constants/styling';
import { HomeScreenFeatures } from '../../screens/home/HomeScreen';

const RenderSplitPrimaryCard = (feature: HomeScreenFeatures) => (
  <TouchableOpacity
    key={feature.id}
    style={[styles.splitCard, { backgroundColor: feature.color }]}
    onPress={feature.action}
    activeOpacity={0.8}
  >
    <MaterialDesignIcons
      name={feature.icon as any}
      size={36}
      color={feature.id === '1' ? COLORS.dark : COLORS.light}
    />

    <Text
      style={[
        styles.splitCardTitle,
        { color: feature.id === '1' ? COLORS.dark : COLORS.light },
      ]}
    >
      {feature.title}
    </Text>

    <Text
      style={[
        styles.splitCardSubtitle,
        { color: feature.id === '1' ? COLORS.dark : COLORS.light },
      ]}
    >
      {feature.subtitle}
    </Text>

    <MaterialDesignIcons
      name="arrow-right"
      size={20}
      color={feature.id === '1' ? COLORS.dark : COLORS.light}
      style={styles.splitCardArrow}
    />
  </TouchableOpacity>
);

export default RenderSplitPrimaryCard;

const styles = StyleSheet.create({
  splitCard: {
    flex: 1,
    // height: 150,
    borderRadius: SPACING.md,
    padding: SPACING.md,
    justifyContent: 'space-between',
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  splitCardTitle: {
    fontSize: 17,
    fontFamily: FONTS.sora.bold,
  },
  splitCardSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.dmSans.regular,
    color: COLORS.light,
    opacity: 0.8,
    marginTop: SPACING.xs_sm,
  },
  splitCardArrow: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
  },
});
