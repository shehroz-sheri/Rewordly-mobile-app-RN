import { View, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/styling';

type PaginationDotsProps = {
  activeIndex: number;
  totalSteps: number;
};

const PaginationDots: React.FC<PaginationDotsProps> = ({
  activeIndex,
  totalSteps,
}) => {
  const dots = Array.from({ length: totalSteps }, (_, index) => {
    const isActive = index + 1 === activeIndex;
    return (
      <View
        key={index}
        style={[styles.dot, isActive ? styles.activeDot : styles.inactiveDot]}
      />
    );
  });

  return <View style={styles.pagination}>{dots}</View>;
};

export default PaginationDots;

const styles = StyleSheet.create({
  pagination: {
    flexDirection: 'row',
  },
  dot: {
    height: 10,
    borderRadius: 5,
    marginHorizontal: 4,
    backgroundColor: 'transparent',
  },
  inactiveDot: {
    width: 10,
    backgroundColor: COLORS.surface,
  },
  activeDot: {
    width: 25,
    backgroundColor: COLORS.primary,
  },
});
