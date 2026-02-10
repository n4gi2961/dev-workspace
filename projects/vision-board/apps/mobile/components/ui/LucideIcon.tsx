import * as LucideIcons from 'lucide-react-native';
import type { LucideProps } from 'lucide-react-native';
import type { ForwardRefExoticComponent } from 'react';

interface LucideIconProps {
  name: string;
  size?: number;
  color?: string;
}

/** Convert kebab-case icon name (e.g. "chevron-left") to PascalCase ("ChevronLeft") */
function toPascalCase(str: string): string {
  return str
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

const iconMap = LucideIcons as unknown as Record<
  string,
  ForwardRefExoticComponent<LucideProps>
>;

export function LucideIcon({ name, size = 24, color = '#FFFFFF' }: LucideIconProps) {
  const pascalName = toPascalCase(name);
  const Icon = iconMap[pascalName];
  if (!Icon) return null;
  return <Icon size={size} color={color} />;
}
