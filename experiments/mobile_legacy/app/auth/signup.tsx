import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../contexts/i18n';

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
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-50 dark:bg-gray-900"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-6 py-8">
          <View className="mb-8">
            <Text className="text-3xl font-bold text-center text-gray-900 dark:text-white">
              {t.auth.signup.title}
            </Text>
          </View>

          <View className="space-y-4">
            <View>
              <TextInput
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                placeholder={t.auth.signup.displayName}
                placeholderTextColor="#9CA3AF"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            </View>

            <View className="mt-3">
              <TextInput
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                placeholder={t.auth.signup.email}
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            <View className="mt-3">
              <TextInput
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                placeholder={t.auth.signup.passwordPlaceholder}
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
              />
            </View>

            <View className="mt-3">
              <TextInput
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                placeholder={t.auth.signup.passwordConfirm}
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoComplete="new-password"
              />
            </View>

            <TouchableOpacity
              className={`mt-6 w-full py-3 rounded-lg ${
                loading ? 'bg-blue-400' : 'bg-blue-600'
              }`}
              onPress={handleSignup}
              disabled={loading}
            >
              <Text className="text-center text-white font-semibold">
                {loading ? t.auth.signup.submitting : t.auth.signup.submit}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="mt-6 flex-row justify-center">
            <Text className="text-gray-600 dark:text-gray-400">
              {t.auth.signup.hasAccount}{' '}
            </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text className="text-blue-600 dark:text-blue-400 font-semibold">
                  {t.auth.signup.login}
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
