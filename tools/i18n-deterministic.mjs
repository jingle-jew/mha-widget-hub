import { setLanguage } from "../src/i18n/index.js";

const TEST_LANGUAGE = "en";
const TEST_NAVIGATOR_LANGUAGE = "en-US";

export function installDeterministicI18n(beforeEachHook) {
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const navigatorValue = navigatorDescriptor?.get?.call(globalThis);

  if (navigatorDescriptor?.configurable) {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      enumerable: navigatorDescriptor.enumerable ?? true,
      writable: true,
      value: {
        ...(navigatorValue && typeof navigatorValue === "object" ? navigatorValue : {}),
        language: TEST_NAVIGATOR_LANGUAGE,
        languages: [TEST_NAVIGATOR_LANGUAGE],
      },
    });
  }

  setLanguage(TEST_LANGUAGE);
  beforeEachHook(() => {
    setLanguage(TEST_LANGUAGE);
  });
}
