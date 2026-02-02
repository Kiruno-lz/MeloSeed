/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config) => {
        config.externals.push('pino-pretty', 'lokijs', 'encoding');
        
        // Fix for @metamask/sdk trying to import react-native modules
        config.resolve.fallback = { 
            ...config.resolve.fallback, 
            fs: false, 
            net: false, 
            tls: false 
        };

        // Ignore React Native modules in the browser
        config.resolve.alias = {
            ...config.resolve.alias,
            'react-native$': false,
            '@react-native-async-storage/async-storage': false,
        };

        return config;
      },
}

module.exports = nextConfig;
