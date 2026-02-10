import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useNavigation } from '../../../contexts/navigation';

/**
 * Deep link handler for board URLs.
 *
 * This route exists to support:
 * - Direct links to boards (e.g., shared URLs)
 * - Backwards compatibility with old navigation
 *
 * Instead of showing a separate board screen, it:
 * 1. Sets the selectedBoardId in NavigationContext
 * 2. Redirects to the home tab where the canvas will display the board
 */
export default function BoardRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { setSelectedBoardId } = useNavigation();

  useEffect(() => {
    if (id) {
      // Set the board ID in navigation context
      setSelectedBoardId(id);
      // Redirect to home tab (which now shows the canvas)
      router.replace('/(main)/(tabs)');
    }
  }, [id, setSelectedBoardId]);

  // Show loading while redirecting
  return (
    <View className="flex-1 items-center justify-center bg-gray-900">
      <ActivityIndicator size="large" color="#3B82F6" />
    </View>
  );
}
