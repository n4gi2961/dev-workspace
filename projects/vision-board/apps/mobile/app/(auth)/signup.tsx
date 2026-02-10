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

export default function SignupScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const { t } = useI18n();

  const handleSignup = async () => {
    if (!displayName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', t.auth.signup.errors.passwordMismatch);
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', t.auth.signup.errors.passwordTooShort);
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, displayName);
      router.replace('/(tabs)' as never);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      Alert.alert('Signup Failed', message);
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
              Create Account
            </Text>
            <Text className="text-sm mt-2" style={{ color: '#8E8E93' }}>
              Sign up to get started
            </Text>
          </View>

          {/* Form */}
          <View className="gap-4">
            <View>
              <Text className="text-sm font-medium text-white mb-2">Display Name</Text>
              <Input
                placeholder="Enter your name"
                value={displayName}
                onChangeText={setDisplayName}
              />
            </View>

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
                placeholder="Create a password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-white mb-2">Confirm Password</Text>
              <Input
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>
          </View>

          {/* Create Account Button */}
          <View className="mt-8">
            <Button
              variant="primary"
              label={loading ? 'Creating...' : 'Create Account'}
              onPress={handleSignup}
              disabled={loading}
            />
          </View>

          {/* Login link */}
          <View className="mt-8 flex-row justify-center">
            <Text className="text-sm" style={{ color: '#8E8E93' }}>
              Already have an account?{' '}
            </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text className="text-sm font-semibold" style={{ color: '#0095F6' }}>
                  Sign In
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
