export function fillTemplate(template, vars = {}) {
  if (typeof template !== 'string') return template;
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    const value = vars[key];
    return value === null || value === undefined ? match : String(value);
  });
}

export default { fillTemplate };
