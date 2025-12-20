import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import OnboardFirst from '../../assets/images/onboard_first.svg';
import { COLORS, FONTS, SPACING } from '../../constants/styling';
import CustomButton from '../customButton/CustomButton';

const { width } = Dimensions.get('window');

interface JoinDiscordModalProps {
  visible: boolean;
  onClose: () => void;
}

const DISCORD_INVITE_LINK = 'https://discord.gg/yourInviteCodeHere'; // replace with your actual invite

const JoinDiscordModal: React.FC<JoinDiscordModalProps> = ({
  visible,
  onClose,
}) => {
  const handleJoin = async () => {
    onClose();
    await Linking.openURL(DISCORD_INVITE_LINK);
  };

  const features = [
    'Join community & explore all our apps',
    'Talk directly with our dev team',
    'Report bugs or app issues quickly',
    'Discuss ideas & suggest new features',
    'Share what you need in our next apps',
  ];

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.content}>
              <TouchableOpacity style={styles.closeIcon} onPress={onClose}>
                <Ionicons
                  name="close-outline"
                  size={30}
                  color={COLORS.secondary}
                />
              </TouchableOpacity>

              <View style={styles.iconRow}>
                <Ionicons
                  name="logo-discord"
                  size={60}
                  color={COLORS.dark}
                  style={{ marginRight: 12 }}
                />
                <OnboardFirst width={75} height={75} />
              </View>

              <Text style={styles.title}>Join Our Discord Community</Text>
              <Text style={styles.subtitle}>
                Be part of our growing community. Connect directly with the team
                and other users!
              </Text>

              <View style={styles.list}>
                {features.map((item, index) => (
                  <View style={styles.listItem} key={index}>
                    <Ionicons
                      name="checkmark"
                      size={12}
                      color={COLORS.dark}
                      style={{
                        marginRight: SPACING.sm,
                        backgroundColor: COLORS.primary,
                        borderRadius: 50,
                        padding: 2,
                      }}
                    />
                    <Text style={styles.listText}>{item}</Text>
                  </View>
                ))}
              </View>
              <CustomButton
                text="Join Now for Free"
                onPress={handleJoin}
                fontSize={17}
                fontColor={COLORS.dark}
                style={styles.joinButton}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default JoinDiscordModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: COLORS.light,
    width: width * 0.88,
    borderRadius: SPACING.md,
    padding: SPACING.xl,
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
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontFamily: FONTS.sora.semiBold,
    fontSize: 23,
    color: COLORS.dark,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: FONTS.dmSans.regular,
    fontSize: 15,
    color: COLORS.secondary,
    textAlign: 'center',
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  list: {
    alignSelf: 'flex-start',
    marginBottom: 25,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  listText: {
    fontFamily: FONTS.dmSans.regular,
    fontSize: 15,
    color: COLORS.dark,
    flexShrink: 1,
  },
  joinButton: {
    borderRadius: SPACING.sm_md,
    paddingVertical: SPACING.s_md,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
  },
});
