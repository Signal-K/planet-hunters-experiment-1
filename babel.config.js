module.exports = {
  presets: ["babel-preset-expo"],
  plugins: [["react-native-worklets-core/plugin"]],
  env: {
    test: {
      presets: [
        ["@babel/preset-env", { targets: { node: "current" } }],
        "@babel/preset-react",
      ],
      plugins: [
        "@babel/plugin-proposal-nullish-coalescing-operator",
        "@babel/plugin-proposal-optional-chaining",
      ],
    },
  },
};
