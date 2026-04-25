import { Platform } from 'react-native';

const apiByPlatform = {
  android: 'http://10.0.2.2:3000/api',
  ios: 'http://localhost:3000/api',
  default: 'http://localhost:3000/api',
};

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  apiByPlatform[Platform.OS] ||
  apiByPlatform.default;
