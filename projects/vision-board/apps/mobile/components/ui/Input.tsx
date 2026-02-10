import { View, TextInput } from 'react-native';
import { LucideIcon } from './LucideIcon';
import { colors } from '../../constants/Colors';

interface InputProps {
  variant?: 'text' | 'search';
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric';
  className?: string;
}

export function Input({
  variant = 'text',
  placeholder = '',
  value,
  onChangeText,
  secureTextEntry,
  autoCapitalize,
  keyboardType,
  className = '',
}: InputProps) {
  const isSearch = variant === 'search';

  return (
    <View
      className={`h-12 flex-row items-center border border-border w-full px-4 ${
        isSearch ? 'rounded-xl gap-3' : 'rounded-lg'
      } ${className}`}
    >
      {isSearch && (
        <LucideIcon name="search" size={18} color={colors.text.tertiary} />
      )}
      <TextInput
        className="flex-1 text-sm text-white font-normal"
        placeholderTextColor={colors.text.tertiary}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
      />
    </View>
  );
}
