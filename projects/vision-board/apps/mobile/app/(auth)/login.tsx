import { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Pressable,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../contexts/i18n';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { t } = useI18n();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      router.replace('/(tabs)' as never);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
      style={{ backgroundColor: '#121212' }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-6 py-6">
          {/* Header */}
          <View className="mb-8">
            <Text className="text-[28px] font-semibold text-white">
              Welcome Back
            </Text>
            <Text className="text-sm mt-2" style={{ color: '#8E8E93' }}>
              Sign in to continue
            </Text>
          </View>

          {/* Form */}
          <View className="gap-4">
            <View>
              <Text className="text-sm font-medium text-white mb-2">Email</Text>
              <Input
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-white mb-2">Password</Text>
              <Input
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          {/* Sign In Button */}
          <View className="mt-8">
            <Button
              variant="primary"
              label={loading ? 'Signing in...' : 'Sign In'}
              onPress={handleLogin}
              disabled={loading}
            />
          </View>

          {/* Sign up link */}
          <View className="mt-8 flex-row justify-center">
            <Text className="text-sm" style={{ color: '#8E8E93' }}>
              Don't have an account?{' '}
            </Text>
            <Link href="/(auth)/signup" asChild>
              <Pressable>
                <Text className="text-sm font-semibold" style={{ color: '#0095F6' }}>
                  Sign Up
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
