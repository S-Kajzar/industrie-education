// Tests du site (npm test) : la construction écrit _site/, puis Playwright le sert localement
// (tests/serveur.js, comme GitHub Pages) et le vérifie dans Chromium. Aucun accès au réseau.
'use strict';

const { defineConfig } = require('@playwright/test');
const { base } = require('./site.json');

const PORT = Number(process.env.PORT_TESTS || 4173);
const ADRESSE = `http://127.0.0.1:${PORT}${base}`;

module.exports = defineConfig({
  testDir: 'tests',
  testMatch: '*.spec.js',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: ADRESSE,
    browserName: 'chromium',
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    trace: 'off',
  },
  webServer: {
    command: 'node tests/serveur.js',
    env: { PORT: String(PORT) },
    url: ADRESSE,
    reuseExistingServer: !process.env.CI,
  },
});
