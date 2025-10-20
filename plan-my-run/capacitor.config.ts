import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.runna.app',
  appName: 'Runna',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
