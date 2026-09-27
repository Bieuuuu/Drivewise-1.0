import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.drivewise.copiloto',
  appName: 'DriveWise',
  webDir: 'dist',
  server: {
    // Use an authorized Firebase Auth domain so /__/auth/handler accepts OAuth requests from the APK
    hostname: 'drivewise-1-0.vercel.app',
    androidScheme: 'https',
    allowNavigation: [
      'drivewise-1-0.vercel.app',
      'gen-lang-client-0028437993.firebaseapp.com',
      '*.firebaseapp.com',
      'accounts.google.com',
      '*.google.com',
      '*.googleapis.com',
      '*.gstatic.com',
    ],
  },
  plugins: {
    // Custom native bridge plugins configured here
  },
};

export default config;
