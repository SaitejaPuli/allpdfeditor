import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.saiteja.allpdfeditor',
  appName: 'All PDF Editor',
  webDir: 'capacitor-web',
  server: {
    url: 'https://allpdfeditor.lovable.app/',
    cleartext: false
  }
};

export default config;
