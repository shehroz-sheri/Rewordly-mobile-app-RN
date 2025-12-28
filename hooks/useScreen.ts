import { useWindowDimensions } from 'react-native';

export const useScreen = () => {
  const { width, height } = useWindowDimensions();
  return { screen_width: width, screen_height: height };
};
