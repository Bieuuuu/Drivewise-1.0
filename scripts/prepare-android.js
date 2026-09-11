import fs from 'fs';
import path from 'path';

/**
 * Prepares the Android project by injecting DriveWise permissions,
 * services, and accessibility configurations into AndroidManifest.xml
 */
function prepareAndroid() {
  const manifestPath = path.resolve('android/app/src/main/AndroidManifest.xml');
  if (!fs.existsSync(manifestPath)) {
    console.warn('AndroidManifest.xml not found at:', manifestPath);
    return;
  }

  let content = fs.readFileSync(manifestPath, 'utf8');

  // 1. Add permissions if not already present
  const permissionsToAdd = `
    <!-- DriveWise Native Permissions -->
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
`;

  if (!content.includes('android.permission.SYSTEM_ALERT_WINDOW')) {
    content = content.replace('<application', `${permissionsToAdd}\n    <application`);
  }

  // 2. Add services inside <application>
  const servicesToAdd = `
        <!-- DriveWise Accessibility Service to read Uber and 99 rides -->
        <service
            android:name=".DriveWiseAccessibilityService"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService" />
            </intent-filter>
            <meta-data
                android:name="android.accessibilityservice"
                android:resource="@xml/accessibility_service_config" />
        </service>

        <!-- DriveWise Floating Window Overlay Service -->
        <service
            android:name=".FloatingOverlayService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="specialUse" />
`;

  if (!content.includes('DriveWiseAccessibilityService')) {
    content = content.replace('</application>', `${servicesToAdd}\n    </application>`);
  }

  fs.writeFileSync(manifestPath, content, 'utf8');
  console.log('✅ AndroidManifest.xml successfully configured for DriveWise!');

  // 3. Ensure strings.xml has accessibility service description
  const stringsPath = path.resolve('android/app/src/main/res/values/strings.xml');
  if (fs.existsSync(stringsPath)) {
    let strings = fs.readFileSync(stringsPath, 'utf8');
    if (!strings.includes('accessibility_service_description')) {
      strings = strings.replace(
        '</resources>',
        '    <string name="accessibility_service_description">Permite ao Copiloto DriveWise calcular o lucro e identificar corridas da Uber e 99 em tempo real.</string>\n</resources>'
      );
      fs.writeFileSync(stringsPath, strings, 'utf8');
      console.log('✅ strings.xml updated with accessibility description!');
    }
  }
}

prepareAndroid();
