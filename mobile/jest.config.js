module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-gesture-handler|react-native-screens)/)',
  ],
  moduleNameMapper: {
    '^react-native-blob-util$': '<rootDir>/jest/blobUtil.js',
    '^react-native-image-picker$': '<rootDir>/jest/imagePicker.js',
    '^react-native-permissions$': '<rootDir>/jest/permissions.js',
    '^react-native-compressor$': '<rootDir>/jest/compressor.js',
  },
};
