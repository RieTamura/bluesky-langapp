import React from 'react';
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

export const ListFilter: React.FC<IconProps> = (props) => {
  const { color = '#000', accessibilityLabel, ...rest } = props;
  const size = computeSize(props, 18);
  return <Lucide.ListFilter color={color} size={size} accessibilityLabel={accessibilityLabel} {...rest} />;
};

export const RefreshCw: React.FC<IconProps> = (props) => {
  const { color = '#000', accessibilityLabel, ...rest } = props;
  const size = computeSize(props, 18);
  return <Lucide.RefreshCw color={color} size={size} accessibilityLabel={accessibilityLabel} {...rest} />;
};

export const Share2: React.FC<IconProps> = (props) => {
  const { color = '#000', accessibilityLabel, ...rest } = props;
  const size = computeSize(props, 18);
  return <Lucide.Share2 color={color} size={size} accessibilityLabel={accessibilityLabel} {...rest} />;
};

export const Home: React.FC<IconProps> = (props) => {
  const { color = '#000', accessibilityLabel, ...rest } = props;
  const size = computeSize(props, 18);
  return <Lucide.Home color={color} size={size} accessibilityLabel={accessibilityLabel} {...rest} />;
};

export const BookOpen: React.FC<IconProps> = (props) => {
  const { color = '#000', accessibilityLabel, ...rest } = props;
  const size = computeSize(props, 18);
  return <Lucide.BookOpen color={color} size={size} accessibilityLabel={accessibilityLabel} {...rest} />;
};

// Map `Pencil` to `Lucide.Edit` because the design-system name uses "Pencil" while
// Lucide's equivalent icon is named "Edit"; semantics are shared, so keep accessibility labels
// on the interactive wrapper rather than the icon when used in buttons.
export const Pencil: React.FC<IconProps> = (props) => {
  const { color = '#000', accessibilityLabel, ...rest } = props;
  const size = computeSize(props, 18);
  return <Lucide.Edit color={color} size={size} accessibilityLabel={accessibilityLabel} {...rest} />;
};

export const BarChart3: React.FC<IconProps> = (props) => {
  const { color = '#000', accessibilityLabel, ...rest } = props;
  const size = computeSize(props, 18);
  return <Lucide.BarChart3 color={color} size={size} accessibilityLabel={accessibilityLabel} {...rest} />;
};

export const ArrowLeft: React.FC<IconProps> = (props) => {
  const { color = '#000', accessibilityLabel, ...rest } = props;
  const size = computeSize(props, 18);
  return <Lucide.ArrowLeft color={color} size={size} accessibilityLabel={accessibilityLabel} {...rest} />;
};

export const SquareArrowOutUpRight: React.FC<IconProps> = (props) => {
  const { color = '#000', accessibilityLabel, ...rest } = props;
  const size = computeSize(props, 18);
  return <Lucide.SquareArrowOutUpRight color={color} size={size} accessibilityLabel={accessibilityLabel} {...rest} />;
};

export const Settings: React.FC<IconProps> = (props) => {
  const { color = '#000', accessibilityLabel, ...rest } = props;
  const size = computeSize(props, 20);
  return <Lucide.Settings color={color} size={size} accessibilityLabel={accessibilityLabel} {...rest} />;
};

// Prefer explicit named exports for clarity; no default export to avoid ambiguity.
