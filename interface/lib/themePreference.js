/* eslint-disable require-jsdoc */

import { Themes } from './options/themes.js';

const themeStorageKey = 'theme_preference';

export async function getThemePreference(storageHandler) {
  const theme = await storageHandler.getLocal(themeStorageKey);
  switch (theme) {
    case Themes.Light:
    case Themes.Dark:
      return theme;
    default:
      return Themes.Auto;
  }
}

export async function setThemePreference(storageHandler, theme) {
  const normalizedTheme =
    theme === Themes.Light || theme === Themes.Dark ? theme : Themes.Auto;
  await storageHandler.setLocal(themeStorageKey, normalizedTheme);
  return normalizedTheme;
}

export function applyTheme(theme) {
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  if (theme === Themes.Light || theme === Themes.Dark) {
    document.body.dataset.theme = theme;
    return;
  }

  document.body.dataset.theme = prefersDarkScheme.matches
    ? Themes.Dark
    : Themes.Light;
}
