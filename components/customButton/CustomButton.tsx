import {
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
  GestureResponderEvent,
  TextStyle,
} from 'react-native';
import { COLORS, FONTS } from '../../constants/styling';

type CustomButtonProps = {
  text: string;
  onPress: (event: GestureResponderEvent) => void;
  style?: ViewStyle;
  fontSize?: number;
  fontFamily?: string;
  fontColor?: string;
  disabled?: boolean;
};

const CustomButton: React.FC<CustomButtonProps> = ({
  text,
  onPress,
  style,
  fontSize,
  fontFamily,
  fontColor,
  disabled = false,
}) => {
  const textStyle: TextStyle = fontSize ? { fontSize } : {};
  const fontFamilyStyle: TextStyle = fontFamily ? { fontFamily } : {};
  const fontColorStyle: TextStyle = fontColor ? { color: fontColor } : {};

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
    >
      <Text
        style={[styles.buttonText, textStyle, fontFamilyStyle, fontColorStyle]}
      >
        {text}
      </Text>
    </TouchableOpacity>
  );
};

export default CustomButton;

const styles = StyleSheet.create({
  button: {
    width: '100%',
    backgroundColor: COLORS.dark,
    borderRadius: 30,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: {
    color: COLORS.light,
    fontSize: 20,
    fontFamily: FONTS.sora.semiBold,
  },
});
