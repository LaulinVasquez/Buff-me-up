import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.samirrodriguez.buffmeup',
  appName: 'Buff Me Up',
  webDir: 'dist',

  server: {
    url: 'https://buff-me-up.vercel.app/',
    cleartext: false,
  },
};

export default config;