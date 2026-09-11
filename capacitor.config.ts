import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.drivewise.copiloto',
  appName: 'DriveWise',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    // Custom native bridge plugins configured here
  },
};

export default config;
