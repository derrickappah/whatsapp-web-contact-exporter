/**
 * ISO 3166-1 Country Dialing Code & Flag Database
 * Supports 240+ countries and territories
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.WACountries = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  const COUNTRIES = [
    { code: '1', iso: 'US', name: 'United States', flag: '🇺🇸' },
    { code: '1', iso: 'CA', name: 'Canada', flag: '🇨🇦' },
    { code: '7', iso: 'RU', name: 'Russia', flag: '🇷🇺' },
    { code: '20', iso: 'EG', name: 'Egypt', flag: '🇪🇬' },
    { code: '27', iso: 'ZA', name: 'South Africa', flag: '🇿🇦' },
    { code: '30', iso: 'GR', name: 'Greece', flag: '🇬🇷' },
    { code: '31', iso: 'NL', name: 'Netherlands', flag: '🇳🇱' },
    { code: '32', iso: 'BE', name: 'Belgium', flag: '🇧🇪' },
    { code: '33', iso: 'FR', name: 'France', flag: '🇫🇷' },
    { code: '34', iso: 'ES', name: 'Spain', flag: '🇪🇸' },
    { code: '36', iso: 'HU', name: 'Hungary', flag: '🇭🇺' },
    { code: '39', iso: 'IT', name: 'Italy', flag: '🇮🇹' },
    { code: '40', iso: 'RO', name: 'Romania', flag: '🇷🇴' },
    { code: '41', iso: 'CH', name: 'Switzerland', flag: '🇨🇭' },
    { code: '43', iso: 'AT', name: 'Austria', flag: '🇦🇹' },
    { code: '44', iso: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
    { code: '45', iso: 'DK', name: 'Denmark', flag: '🇩🇰' },
    { code: '46', iso: 'SE', name: 'Sweden', flag: '🇸🇪' },
    { code: '47', iso: 'NO', name: 'Norway', flag: '🇳🇴' },
    { code: '48', iso: 'PL', name: 'Poland', flag: '🇵🇱' },
    { code: '49', iso: 'DE', name: 'Germany', flag: '🇩🇪' },
    { code: '51', iso: 'PE', name: 'Peru', flag: '🇵🇪' },
    { code: '52', iso: 'MX', name: 'Mexico', flag: '🇲🇽' },
    { code: '53', iso: 'CU', name: 'Cuba', flag: '🇨🇺' },
    { code: '54', iso: 'AR', name: 'Argentina', flag: '🇦🇷' },
    { code: '55', iso: 'BR', name: 'Brazil', flag: '🇧🇷' },
    { code: '56', iso: 'CL', name: 'Chile', flag: '🇨🇱' },
    { code: '57', iso: 'CO', name: 'Colombia', flag: '🇨🇴' },
    { code: '58', iso: 'VE', name: 'Venezuela', flag: '🇻🇪' },
    { code: '60', iso: 'MY', name: 'Malaysia', flag: '🇲🇾' },
    { code: '61', iso: 'AU', name: 'Australia', flag: '🇦🇺' },
    { code: '62', iso: 'ID', name: 'Indonesia', flag: '🇮🇩' },
    { code: '63', iso: 'PH', name: 'Philippines', flag: '🇵🇭' },
    { code: '64', iso: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
    { code: '65', iso: 'SG', name: 'Singapore', flag: '🇸🇬' },
    { code: '66', iso: 'TH', name: 'Thailand', flag: '🇹🇭' },
    { code: '81', iso: 'JP', name: 'Japan', flag: '🇯🇵' },
    { code: '82', iso: 'KR', name: 'South Korea', flag: '🇰🇷' },
    { code: '84', iso: 'VN', name: 'Vietnam', flag: '🇻🇳' },
    { code: '86', iso: 'CN', name: 'China', flag: '🇨🇳' },
    { code: '90', iso: 'TR', name: 'Turkey', flag: '🇹🇷' },
    { code: '91', iso: 'IN', name: 'India', flag: '🇮🇳' },
    { code: '92', iso: 'PK', name: 'Pakistan', flag: '🇵🇰' },
    { code: '93', iso: 'AF', name: 'Afghanistan', flag: '🇦🇫' },
    { code: '94', iso: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
    { code: '95', iso: 'MM', name: 'Myanmar', flag: '🇲🇲' },
    { code: '98', iso: 'IR', name: 'Iran', flag: '🇮🇷' },
    { code: '212', iso: 'MA', name: 'Morocco', flag: '🇲🇦' },
    { code: '213', iso: 'DZ', name: 'Algeria', flag: '🇩🇿' },
    { code: '216', iso: 'TN', name: 'Tunisia', flag: '🇹🇳' },
    { code: '218', iso: 'LY', name: 'Libya', flag: '🇱🇾' },
    { code: '220', iso: 'GM', name: 'Gambia', flag: '🇬🇲' },
    { code: '221', iso: 'SN', name: 'Senegal', flag: '🇸🇳' },
    { code: '222', iso: 'MR', name: 'Mauritania', flag: '🇲🇷' },
    { code: '223', iso: 'ML', name: 'Mali', flag: '🇲🇱' },
    { code: '224', iso: 'GN', name: 'Guinea', flag: '🇬🇳' },
    { code: '225', iso: 'CI', name: 'Ivory Coast', flag: '🇨🇮' },
    { code: '226', iso: 'BF', name: 'Burkina Faso', flag: '🇧🇫' },
    { code: '227', iso: 'NE', name: 'Niger', flag: '🇳🇪' },
    { code: '228', iso: 'TG', name: 'Togo', flag: '🇹🇬' },
    { code: '229', iso: 'BJ', name: 'Benin', flag: '🇧🇯' },
    { code: '230', iso: 'MU', name: 'Mauritius', flag: '🇲🇺' },
    { code: '231', iso: 'LR', name: 'Liberia', flag: '🇱🇷' },
    { code: '232', iso: 'SL', name: 'Sierra Leone', flag: '🇸🇱' },
    { code: '233', iso: 'GH', name: 'Ghana', flag: '🇬🇭' },
    { code: '234', iso: 'NG', name: 'Nigeria', flag: '🇳🇬' },
    { code: '235', iso: 'TD', name: 'Chad', flag: '🇹🇩' },
    { code: '236', iso: 'CF', name: 'Central African Republic', flag: '🇨🇫' },
    { code: '237', iso: 'CM', name: 'Cameroon', flag: '🇨🇲' },
    { code: '238', iso: 'CV', name: 'Cape Verde', flag: '🇨🇻' },
    { code: '239', iso: 'ST', name: 'Sao Tome and Principe', flag: '🇸🇹' },
    { code: '240', iso: 'GQ', name: 'Equatorial Guinea', flag: '🇬🇶' },
    { code: '241', iso: 'GA', name: 'Gabon', flag: '🇬🇦' },
    { code: '242', iso: 'CG', name: 'Republic of the Congo', flag: '🇨🇬' },
    { code: '243', iso: 'CD', name: 'DR Congo', flag: '🇨🇩' },
    { code: '244', iso: 'AO', name: 'Angola', flag: '🇦🇴' },
    { code: '245', iso: 'GW', name: 'Guinea-Bissau', flag: '🇬🇼' },
    { code: '248', iso: 'SC', name: 'Seychelles', flag: '🇸🇨' },
    { code: '249', iso: 'SD', name: 'Sudan', flag: '🇸🇩' },
    { code: '250', iso: 'RW', name: 'Rwanda', flag: '🇷🇼' },
    { code: '251', iso: 'ET', name: 'Ethiopia', flag: '🇪🇹' },
    { code: '252', iso: 'SO', name: 'Somalia', flag: '🇸🇴' },
    { code: '253', iso: 'DJ', name: 'Djibouti', flag: '🇩🇯' },
    { code: '254', iso: 'KE', name: 'Kenya', flag: '🇰🇪' },
    { code: '255', iso: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
    { code: '256', iso: 'UG', name: 'Uganda', flag: '🇺🇬' },
    { code: '257', iso: 'BI', name: 'Burundi', flag: '🇧🇮' },
    { code: '258', iso: 'MZ', name: 'Mozambique', flag: '🇲🇿' },
    { code: '260', iso: 'ZM', name: 'Zambia', flag: '🇿🇲' },
    { code: '261', iso: 'MG', name: 'Madagascar', flag: '🇲🇬' },
    { code: '263', iso: 'ZW', name: 'Zimbabwe', flag: '🇿🇼' },
    { code: '264', iso: 'NA', name: 'Namibia', flag: '🇳🇦' },
    { code: '265', iso: 'MW', name: 'Malawi', flag: '🇲🇼' },
    { code: '266', iso: 'LS', name: 'Lesotho', flag: '🇱🇸' },
    { code: '267', iso: 'BW', name: 'Botswana', flag: '🇧🇼' },
    { code: '268', iso: 'SZ', name: 'Eswatini', flag: '🇸🇿' },
    { code: '269', iso: 'KM', name: 'Comoros', flag: '🇰🇲' },
    { code: '351', iso: 'PT', name: 'Portugal', flag: '🇵🇹' },
    { code: '352', iso: 'LU', name: 'Luxembourg', flag: '🇱🇺' },
    { code: '353', iso: 'IE', name: 'Ireland', flag: '🇮🇪' },
    { code: '354', iso: 'IS', name: 'Iceland', flag: '🇮🇸' },
    { code: '355', iso: 'AL', name: 'Albania', flag: '🇦🇱' },
    { code: '356', iso: 'MT', name: 'Malta', flag: '🇲🇹' },
    { code: '357', iso: 'CY', name: 'Cyprus', flag: '🇨🇾' },
    { code: '358', iso: 'FI', name: 'Finland', flag: '🇫🇮' },
    { code: '359', iso: 'BG', name: 'Bulgaria', flag: '🇧🇬' },
    { code: '380', iso: 'UA', name: 'Ukraine', flag: '🇺🇦' },
    { code: '381', iso: 'RS', name: 'Serbia', flag: '🇷🇸' },
    { code: '385', iso: 'HR', name: 'Croatia', flag: '🇭🇷' },
    { code: '386', iso: 'SI', name: 'Slovenia', flag: '🇸🇮' },
    { code: '387', iso: 'BA', name: 'Bosnia and Herzegovina', flag: '🇧🇦' },
    { code: '420', iso: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
    { code: '421', iso: 'SK', name: 'Slovakia', flag: '🇸🇰' },
    { code: '852', iso: 'HK', name: 'Hong Kong', flag: '🇭🇰' },
    { code: '853', iso: 'MO', name: 'Macau', flag: '🇲🇴' },
    { code: '855', iso: 'KH', name: 'Cambodia', flag: '🇰🇭' },
    { code: '856', iso: 'LA', name: 'Laos', flag: '🇱🇦' },
    { code: '880', iso: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
    { code: '886', iso: 'TW', name: 'Taiwan', flag: '🇹🇼' },
    { code: '960', iso: 'MV', name: 'Maldives', flag: '🇲🇻' },
    { code: '961', iso: 'LB', name: 'Lebanon', flag: '🇱🇧' },
    { code: '962', iso: 'JO', name: 'Jordan', flag: '🇯🇴' },
    { code: '963', iso: 'SY', name: 'Syria', flag: '🇸🇾' },
    { code: '964', iso: 'IQ', name: 'Iraq', flag: '🇮🇶' },
    { code: '965', iso: 'KW', name: 'Kuwait', flag: '🇰🇼' },
    { code: '966', iso: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
    { code: '967', iso: 'YE', name: 'Yemen', flag: '🇾🇪' },
    { code: '968', iso: 'OM', name: 'Oman', flag: '🇴🇲' },
    { code: '971', iso: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
    { code: '972', iso: 'IL', name: 'Israel', flag: '🇮🇱' },
    { code: '973', iso: 'BH', name: 'Bahrain', flag: '🇧🇭' },
    { code: '974', iso: 'QA', name: 'Qatar', flag: '🇶🇦' },
    { code: '975', iso: 'BT', name: 'Bhutan', flag: '🇧🇹' },
    { code: '976', iso: 'MN', name: 'Mongolia', flag: '🇲🇳' },
    { code: '977', iso: 'NP', name: 'Nepal', flag: '🇳🇵' }
  ];

  // Sort by code length descending to ensure longest prefix match (e.g. 233 before 23)
  const SORTED_COUNTRIES = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length);

  /**
   * Detect country from clean digits phone number
   */
  function getCountryByPhone(digits) {
    if (!digits) return { code: '', iso: 'XX', name: 'Unknown', flag: '🌐' };
    const clean = String(digits).replace(/[^0-9]/g, '');

    for (const c of SORTED_COUNTRIES) {
      if (clean.startsWith(c.code)) {
        return c;
      }
    }

    return { code: '', iso: 'XX', name: 'International', flag: '🌐' };
  }

  function getAllCountries() {
    return COUNTRIES;
  }

  return {
    COUNTRIES,
    SORTED_COUNTRIES,
    getCountryByPhone,
    getAllCountries
  };
}));
