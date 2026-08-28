export function fillTemplate(template, vars = {}) {
  if (typeof template !== 'string') return template;
  return template.replace(/\{([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)\}/g, (match, path) => {
    const value = path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), vars);
    return value === null || value === undefined ? match : String(value);
  });
}

export default { fillTemplate };
