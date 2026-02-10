import { Text } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface ToastProps {
  message: string;
  visible: boolean;
}

export function Toast({ message, visible }: ToastProps) {
  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      className="h-10 rounded-full items-center justify-center px-5 py-2.5"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
    >
      <Text className="text-xs font-medium" style={{ color: '#FFFFFFCC' }}>
        {message}
      </Text>
    </Animated.View>
  );
}
