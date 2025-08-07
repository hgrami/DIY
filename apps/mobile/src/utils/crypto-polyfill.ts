import * as Crypto from 'expo-crypto';

// Polyfill for crypto.getRandomValues() used by uuid
if (typeof global !== 'undefined') {
  if (!global.crypto) {
    global.crypto = {} as any;
  }
  
  if (!global.crypto.getRandomValues) {
    global.crypto.getRandomValues = (array: any) => {
      // Generate random bytes using expo-crypto
      const randomBytes = Crypto.getRandomBytes(array.length);
      for (let i = 0; i < array.length; i++) {
        array[i] = randomBytes[i];
      }
      return array;
    };
  }
}

export {};