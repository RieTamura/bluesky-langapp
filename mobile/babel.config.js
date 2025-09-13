module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Use the official JSX transform explicitly (automatic runtime).
      // This helps avoid the deprecated transform-react-jsx-self/source plugins
      // being applied and causing duplicate __self/__source props.
      ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]
    ]
  };
};
