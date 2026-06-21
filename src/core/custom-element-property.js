export function upgradePredefinedProperty(host, name) {
  if (!Object.prototype.hasOwnProperty.call(host, name)) return false;

  const value = host[name];
  delete host[name];
  host[name] = value;

  return true;
}
