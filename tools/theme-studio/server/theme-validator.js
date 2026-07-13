const BLEND_MODES = new Set(["soft-light", "overlay", "multiply", "screen", "normal"]);
const CSS_COLOR = /^(#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\))$/i;

export function validateCssValue(definition, input) {
  if (definition.readOnly || definition.control === "readonly") throw new Error(`${definition.label}: token en lecture seule.`);
  const value = String(input ?? "").trim();
  if (!value || value.length > 240 || /[{};]/.test(value)) throw new Error(`${definition.label}: valeur CSS refusée.`);

  if (definition.control === "range" || definition.control === "number") {
    const numeric = Number.parseFloat(value);
    if (!Number.isFinite(numeric) || numeric < definition.min || numeric > definition.max) {
      throw new Error(`${definition.label}: valeur hors plage.`);
    }
    const expectedUnit = definition.unit || "";
    const unit = value.replace(String(numeric), "").trim();
    if (unit !== expectedUnit) throw new Error(`${definition.label}: unité attendue ${expectedUnit || "sans unité"}.`);
  }

  if (definition.control === "color" || definition.control === "color-alpha") {
    if (!CSS_COLOR.test(value)) throw new Error(`${definition.label}: couleur invalide.`);
  }

  if (definition.control === "select" && !definition.options?.includes(value)) {
    throw new Error(`${definition.label}: option non autorisée.`);
  }

  return value;
}

export function validateImportPreset(preset, knownTokens) {
  if (!preset || preset.schemaVersion !== 1 || typeof preset.overrides !== "object") {
    throw new Error("Preset Theme Studio invalide.");
  }
  const result = { shared: {}, light: {}, dark: {} };
  for (const mode of Object.keys(result)) {
    const values = preset.overrides[mode];
    if (!values) continue;
    if (!values || typeof values !== "object" || Array.isArray(values)) throw new Error("Overrides invalides.");
    for (const [token, value] of Object.entries(values)) {
      if (!knownTokens.has(token)) throw new Error(`Token non autorisé: ${token}`);
      result[mode][token] = String(value);
    }
  }
  return result;
}

export { BLEND_MODES };
