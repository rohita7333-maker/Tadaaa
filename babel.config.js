module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Reanimated 4 worklets — MUST be last.
    plugins: ["react-native-worklets/plugin"],
  };
};
