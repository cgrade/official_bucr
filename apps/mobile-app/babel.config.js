module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated v4 plugin — must always be LAST in the plugins array
      'react-native-reanimated/plugin',
    ],
  };
};
