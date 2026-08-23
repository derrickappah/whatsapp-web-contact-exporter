/**
 * Phone Number Utilities & Normalizer
 * Handles E.164, National formatting, masking, and country detection
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['./countries'], factory);
  } else if (typeof module === 'object' && module.exports) {
    const countries = require('./countries');
    module.exports = factory(countries);
  } else {
    root.WAPhoneUtils = factory(root.WACountries);
  }
}(typeof self !== 'undefined' ? self : this, function (WACountries) {

  function cleanDigits(raw) {
    if (!raw) return '';
    return String(raw).replace(/[^0-9]/g, '');
  }

  function formatE164(raw) {
    const digits = cleanDigits(raw);
    if (!digits) return '';
    return `+${digits}`;
  }

  function detectCountry(raw) {
    const digits = cleanDigits(raw);
    if (!WACountries || typeof WACountries.getCountryByPhone !== 'function') {
      return { code: '', iso: 'XX', name: 'International', flag: '🌐' };
    }
    return WACountries.getCountryByPhone(digits);
  }

  /**
   * Format phone numbers into spaced national/international representation
   */
  function formatPretty(raw) {
    const digits = cleanDigits(raw);
    if (!digits) return '';
    const country = detectCountry(digits);
    const code = country.code;

    if (code && digits.startsWith(code)) {
      const rest = digits.slice(code.length);
      if (code === '1' && rest.length === 10) {
        return `+1 (${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6)}`;
      }
      if (rest.length >= 7) {
        const p1 = rest.slice(0, Math.floor(rest.length / 2));
        const p2 = rest.slice(Math.floor(rest.length / 2));
        return `+${code} ${p1} ${p2}`;
      }
      return `+${code} ${rest}`;
    }

    return `+${digits}`;
  }

  /**
   * Mask phone number for screen-recording / privacy mode
   * e.g. +233 20 631 4924 -> +233 20 ••• 4924
   */
  function maskPhone(raw) {
    const digits = cleanDigits(raw);
    if (!digits || digits.length < 6) return raw;
    const country = detectCountry(digits);
    const code = country.code || digits.slice(0, 3);
    const start = digits.slice(code.length, code.length + 2);
    const end = digits.slice(-3);
    return `+${code} ${start} ••• •${end}`;
  }

  /**
   * Validate if digits represent a valid phone number
   */
  function isValidPhone(raw) {
    const digits = cleanDigits(raw);
    return digits.length >= 7 && digits.length <= 15;
  }

  /**
   * Split full name into first and last name for CRM / Google Contacts
   */
  function splitName(fullName) {
    if (!fullName || typeof fullName !== 'string') {
      return { firstName: '', lastName: '' };
    }
    const clean = fullName.trim();
    const parts = clean.split(/\s+/);
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: '' };
    }
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');
    return { firstName, lastName };
  }

  return {
    cleanDigits,
    formatE164,
    formatPretty,
    detectCountry,
    maskPhone,
    isValidPhone,
    splitName
  };
}));
