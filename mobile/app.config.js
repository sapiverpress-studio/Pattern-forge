module.exports = ({ config }) => {
  if (process.env.APP_VARIANT !== 'ux2-preview') return config;

  return {
    ...config,
    name: 'Sapiver Pattern Forge UX2',
    scheme: 'sapiverpatternforgeux2',
    android: {
      ...config.android,
      package: 'uk.co.sapiverpress.patternforge.ux2',
    },
  };
};
