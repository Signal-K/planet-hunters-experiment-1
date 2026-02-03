module.exports = {
  presets: ["babel-preset-expo"],
  plugins: [["react-native-worklets-core/plugin"]],
  env: {
    test: {
      presets: ["module:metro-react-native-babel-preset"],
    },
  },
};
