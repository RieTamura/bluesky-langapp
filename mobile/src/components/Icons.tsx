import React from 'react';
import Svg from 'react-native-svg';
// Use lucide-react-native for consistent Lucide icons
import * as Lucide from 'lucide-react-native';

// Wrap common icons with a minimal prop interface so consumers can remain unchanged.
type IconProps = { size?: number; color?: string; accessibilityLabel?: string; width?: number; height?: number } & Record<string, any>;

const computeSize = (props: IconProps, defaultSize = 18) => {
  if (props.size) return props.size;
  if (props.width) return props.width;
  if (props.height) return props.height;
  return defaultSize;
};

export const ListFilter: React.FC<IconProps> = ({ color = '#000', accessibilityLabel, ...props }) => {
  const size = computeSize(props as IconProps, 18);
  return <Lucide.ListFilter color={color} size={size} accessibilityLabel={accessibilityLabel} {...props as any} /> as any;
};

export const RefreshCw: React.FC<IconProps> = ({ color = '#000', accessibilityLabel, ...props }) => {
  const size = computeSize(props as IconProps, 18);
  return <Lucide.RefreshCw color={color} size={size} accessibilityLabel={accessibilityLabel} {...props as any} /> as any;
};

export const Share2: React.FC<IconProps> = ({ color = '#000', accessibilityLabel, ...props }) => {
  const size = computeSize(props as IconProps, 18);
  return <Lucide.Share2 color={color} size={size} accessibilityLabel={accessibilityLabel} {...props as any} /> as any;
};

export const Home: React.FC<IconProps> = ({ color = '#000', accessibilityLabel, ...props }) => {
  const size = computeSize(props as IconProps, 18);
  return <Lucide.Home color={color} size={size} accessibilityLabel={accessibilityLabel} {...props as any} /> as any;
};

export const BookOpen: React.FC<IconProps> = ({ color = '#000', accessibilityLabel, ...props }) => {
  const size = computeSize(props as IconProps, 18);
  return <Lucide.BookOpen color={color} size={size} accessibilityLabel={accessibilityLabel} {...props as any} /> as any;
};

export const Pencil: React.FC<IconProps> = ({ color = '#000', accessibilityLabel, ...props }) => {
  const size = computeSize(props as IconProps, 18);
  return <Lucide.Edit color={color} size={size} accessibilityLabel={accessibilityLabel} {...props as any} /> as any;
};

export const BarChart3: React.FC<IconProps> = ({ color = '#000', accessibilityLabel, ...props }) => {
  const size = computeSize(props as IconProps, 18);
  return <Lucide.BarChart3 color={color} size={size} accessibilityLabel={accessibilityLabel} {...props as any} /> as any;
};

export const ArrowLeft: React.FC<IconProps> = ({ color = '#000', accessibilityLabel, ...props }) => {
  const size = computeSize(props as IconProps, 18);
  return <Lucide.ArrowLeft color={color} size={size} accessibilityLabel={accessibilityLabel} {...props as any} /> as any;
};

export const SquareArrowOutUpRight: React.FC<IconProps> = ({ color = '#000', accessibilityLabel, ...props }) => {
  const size = computeSize(props as IconProps, 18);
  return <Lucide.SquareArrowOutUpRight color={color} size={size} accessibilityLabel={accessibilityLabel} {...props as any} /> as any;
};

export const Settings: React.FC<IconProps> = ({ color = '#000', accessibilityLabel, ...props }) => {
  const size = computeSize(props as IconProps, 20);
  return <Lucide.Settings color={color} size={size} accessibilityLabel={accessibilityLabel} {...props as any} /> as any;
};

export default SquareArrowOutUpRight;
