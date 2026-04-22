export const sortByLabel = (items, getLabel) => (
  [...items].sort((a, b) => (
    (getLabel(a) || '').localeCompare(getLabel(b) || '', 'es', { sensitivity: 'base' })
  ))
);
