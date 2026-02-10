import { View, Text } from 'react-native';

interface CardProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function Card({ title, description, children, className = '' }: CardProps) {
  return (
    <View className={`rounded-2xl border border-border p-4 gap-3 w-full ${className}`}>
      {title && (
        <Text className="text-base font-semibold text-txt-primary">{title}</Text>
      )}
      {description && (
        <Text className="text-xs text-txt-secondary w-full">{description}</Text>
      )}
      {children}
    </View>
  );
}
