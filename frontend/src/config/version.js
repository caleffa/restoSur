import appVersion from './appVersion.json';

export const getAppVersion = () => (
  `v${appVersion.major}.${appVersion.minor}.${appVersion.patch}.${appVersion.build}`
);
