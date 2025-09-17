declare module '@expo/vector-icons' {
  import * as React from 'react';
  import { StyleProp, TextStyle, ViewStyle } from 'react-native';

  // Narrower props for icon components commonly exported by expo/vector-icons
  export interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: StyleProp<TextStyle | ViewStyle>;
    // allow additional props such as accessibility props or testID
    [key: string]: any;
  }

  export const Feather: React.ComponentType<IconProps>;
  export const MaterialCommunityIcons: React.ComponentType<IconProps>;
  export default Feather;
}
