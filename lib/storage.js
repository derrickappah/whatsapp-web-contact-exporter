/**
 * Settings & User Preferences Manager
 * Persists configuration in chrome.storage.local
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.WASettings = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  const DEFAULT_SETTINGS = {
    defaultFormat: 'csv',
    delimiter: ',',
    maskNumbers: false,
    autoDeduplicate: true,
    includeVCardPhoto: false,
    customColumns: {
      phone: true,
      formattedPhone: true,
      country: true,
      displayName: true,
      savedName: true,
      pushName: true,
      isSaved: true,
      isBusiness: true,
      about: true,
      groupName: true,
      groupRole: true,
      labels: true,
      jid: true
    }
  };

  function getSettings() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['wa_exporter_settings'], (result) => {
          if (result && result.wa_exporter_settings) {
            resolve({ ...DEFAULT_SETTINGS, ...result.wa_exporter_settings });
          } else {
            resolve(DEFAULT_SETTINGS);
          }
        });
      } else if (typeof localStorage !== 'undefined') {
        try {
          const raw = localStorage.getItem('wa_exporter_settings');
          resolve(raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS);
        } catch (e) {
          resolve(DEFAULT_SETTINGS);
        }
      } else {
        resolve(DEFAULT_SETTINGS);
      }
    });
  }

  function saveSettings(newSettings) {
    return new Promise((resolve) => {
      const merged = { ...DEFAULT_SETTINGS, ...newSettings };
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ wa_exporter_settings: merged }, () => {
          resolve(merged);
        });
      } else if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('wa_exporter_settings', JSON.stringify(merged));
          resolve(merged);
        } catch (e) {
          resolve(merged);
        }
      } else {
        resolve(merged);
      }
    });
  }

  return {
    DEFAULT_SETTINGS,
    getSettings,
    saveSettings
  };
}));
