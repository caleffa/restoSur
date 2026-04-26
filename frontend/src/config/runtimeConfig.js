const runtimeConfig = typeof window !== 'undefined' ? window.__RUNTIME_CONFIG__ || {} : {};

export function getRuntimeConfigValue(key, fallback = '') {
  const value = runtimeConfig[key];
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return fallback;
}
