import { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import OnboardFirst from '../../assets/images/onboard_first.svg';
import { COLORS, FONTS, SPACING } from '../../constants/styling';
import CustomButton from '../customButton/CustomButton';

const { width } = Dimensions.get('window');

interface RateUsModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number) => void;
}

const RateUsModal: React.FC<RateUsModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const [rating, setRating] = useState<number>(5);

  const handleRate = (index: number) => setRating(index);

  const handleSubmit = () => {
    if (rating > 0) {
      onSubmit(rating);
      onClose();
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <TouchableOpacity style={styles.closeIcon} onPress={onClose}>
                <Ionicons
                  name="close-outline"
                  size={30}
                  color={COLORS.secondary}
                />
              </TouchableOpacity>

              <View style={styles.imageWrapper}>
                <OnboardFirst width={120} height={120} />
              </View>

              <Text style={styles.title}>Enjoying Our App?</Text>
              <Text style={styles.subtitle}>
                Please take a moment to rate your experience with our app. Your
                feedback is highly valued!
              </Text>

              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map(i => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => handleRate(i)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={i <= rating ? 'star' : 'star-outline'}
                      size={36}
                      color={i <= rating ? COLORS.primary : COLORS.secondary}
                      style={styles.star}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <CustomButton
                text={rating === 0 ? 'Tap to Rate' : 'Submit Rating'}
                onPress={handleSubmit}
                disabled={rating === 0}
                fontSize={17}
                fontColor={COLORS.dark}
                style={styles.submitButton}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default RateUsModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.light,
    width: width * 0.85,
    borderRadius: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.dark,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: SPACING.s_md,
      },
      android: {
        elevation: 15,
      },
    }),
  },
  closeIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
    zIndex: 10,
  },
  imageWrapper: {
    marginBottom: 15,
    marginTop: 10,
  },
  title: {
    fontFamily: FONTS.sora.semiBold,
    fontSize: 23,
    color: COLORS.dark,
    marginBottom: 5,
  },
  subtitle: {
    fontFamily: FONTS.dmSans.regular,
    fontSize: 16,
    color: COLORS.secondary,
    textAlign: 'center',
    marginBottom: 25,
    paddingHorizontal: 10,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  star: {
    marginHorizontal: 4,
  },
  submitButton: {
    borderRadius: SPACING.sm_md,
    paddingVertical: SPACING.s_md,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
  },
});
