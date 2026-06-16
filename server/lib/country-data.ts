/**
 * Country Data Mapping (Server-side)
 * Maps ISO 3166-1 alpha-2 country codes to currency and language information
 * This is the server-side version of the country data mapping
 */

export interface CountryData {
  country_code: string;
  country_name: string;
  currency_code: string;
  currency_symbol: string;
  language_code: string;
}

export const countryDataMap: Record<string, CountryData> = {
  // Middle East
  "AE": { country_code: "AE", country_name: "United Arab Emirates", currency_code: "AED", currency_symbol: "د.إ", language_code: "ar-AE" },
  "SA": { country_code: "SA", country_name: "Saudi Arabia", currency_code: "SAR", currency_symbol: "ر.س", language_code: "ar-SA" },
  "KW": { country_code: "KW", country_name: "Kuwait", currency_code: "KWD", currency_symbol: "د.ك", language_code: "ar-KW" },
  "QA": { country_code: "QA", country_name: "Qatar", currency_code: "QAR", currency_symbol: "ر.ق", language_code: "ar-QA" },
  "BH": { country_code: "BH", country_name: "Bahrain", currency_code: "BHD", currency_symbol: ".د.ب", language_code: "ar-BH" },
  "OM": { country_code: "OM", country_name: "Oman", currency_code: "OMR", currency_symbol: "ر.ع.", language_code: "ar-OM" },
  "JO": { country_code: "JO", country_name: "Jordan", currency_code: "JOD", currency_symbol: "د.ا", language_code: "ar-JO" },
  "LB": { country_code: "LB", country_name: "Lebanon", currency_code: "LBP", currency_symbol: "ل.ل", language_code: "ar-LB" },
  "IQ": { country_code: "IQ", country_name: "Iraq", currency_code: "IQD", currency_symbol: "ع.د", language_code: "ar-IQ" },
  "IR": { country_code: "IR", country_name: "Iran", currency_code: "IRR", currency_symbol: "﷼", language_code: "fa-IR" },
  "IL": { country_code: "IL", country_name: "Israel", currency_code: "ILS", currency_symbol: "₪", language_code: "he-IL" },
  "TR": { country_code: "TR", country_name: "Turkey", currency_code: "TRY", currency_symbol: "₺", language_code: "tr-TR" },
  "EG": { country_code: "EG", country_name: "Egypt", currency_code: "EGP", currency_symbol: "ج.م", language_code: "ar-EG" },

  // United Kingdom
  "GB": { country_code: "GB", country_name: "United Kingdom", currency_code: "GBP", currency_symbol: "£", language_code: "en-GB" },
  "IE": { country_code: "IE", country_name: "Ireland", currency_code: "EUR", currency_symbol: "€", language_code: "en-IE" },

  // Europe - Eurozone
  "DE": { country_code: "DE", country_name: "Germany", currency_code: "EUR", currency_symbol: "€", language_code: "de-DE" },
  "FR": { country_code: "FR", country_name: "France", currency_code: "EUR", currency_symbol: "€", language_code: "fr-FR" },
  "IT": { country_code: "IT", country_name: "Italy", currency_code: "EUR", currency_symbol: "€", language_code: "it-IT" },
  "ES": { country_code: "ES", country_name: "Spain", currency_code: "EUR", currency_symbol: "€", language_code: "es-ES" },
  "NL": { country_code: "NL", country_name: "Netherlands", currency_code: "EUR", currency_symbol: "€", language_code: "nl-NL" },
  "BE": { country_code: "BE", country_name: "Belgium", currency_code: "EUR", currency_symbol: "€", language_code: "nl-BE" },
  "AT": { country_code: "AT", country_name: "Austria", currency_code: "EUR", currency_symbol: "€", language_code: "de-AT" },
  "PT": { country_code: "PT", country_name: "Portugal", currency_code: "EUR", currency_symbol: "€", language_code: "pt-PT" },
  "GR": { country_code: "GR", country_name: "Greece", currency_code: "EUR", currency_symbol: "€", language_code: "el-GR" },
  "FI": { country_code: "FI", country_name: "Finland", currency_code: "EUR", currency_symbol: "€", language_code: "fi-FI" },
  "LU": { country_code: "LU", country_name: "Luxembourg", currency_code: "EUR", currency_symbol: "€", language_code: "fr-LU" },
  "MT": { country_code: "MT", country_name: "Malta", currency_code: "EUR", currency_symbol: "€", language_code: "en-MT" },
  "CY": { country_code: "CY", country_name: "Cyprus", currency_code: "EUR", currency_symbol: "€", language_code: "el-CY" },
  "SK": { country_code: "SK", country_name: "Slovakia", currency_code: "EUR", currency_symbol: "€", language_code: "sk-SK" },
  "SI": { country_code: "SI", country_name: "Slovenia", currency_code: "EUR", currency_symbol: "€", language_code: "sl-SI" },
  "EE": { country_code: "EE", country_name: "Estonia", currency_code: "EUR", currency_symbol: "€", language_code: "et-EE" },
  "LV": { country_code: "LV", country_name: "Latvia", currency_code: "EUR", currency_symbol: "€", language_code: "lv-LV" },
  "LT": { country_code: "LT", country_name: "Lithuania", currency_code: "EUR", currency_symbol: "€", language_code: "lt-LT" },

  // Europe - Non-Eurozone
  "CH": { country_code: "CH", country_name: "Switzerland", currency_code: "CHF", currency_symbol: "CHF", language_code: "de-CH" },
  "SE": { country_code: "SE", country_name: "Sweden", currency_code: "SEK", currency_symbol: "kr", language_code: "sv-SE" },
  "NO": { country_code: "NO", country_name: "Norway", currency_code: "NOK", currency_symbol: "kr", language_code: "no-NO" },
  "DK": { country_code: "DK", country_name: "Denmark", currency_code: "DKK", currency_symbol: "kr", language_code: "da-DK" },
  "PL": { country_code: "PL", country_name: "Poland", currency_code: "PLN", currency_symbol: "zł", language_code: "pl-PL" },
  "CZ": { country_code: "CZ", country_name: "Czech Republic", currency_code: "CZK", currency_symbol: "Kč", language_code: "cs-CZ" },
  "HU": { country_code: "HU", country_name: "Hungary", currency_code: "HUF", currency_symbol: "Ft", language_code: "hu-HU" },
  "RO": { country_code: "RO", country_name: "Romania", currency_code: "RON", currency_symbol: "lei", language_code: "ro-RO" },
  "BG": { country_code: "BG", country_name: "Bulgaria", currency_code: "BGN", currency_symbol: "лв", language_code: "bg-BG" },
  "HR": { country_code: "HR", country_name: "Croatia", currency_code: "EUR", currency_symbol: "€", language_code: "hr-HR" },

  // North America
  "US": { country_code: "US", country_name: "United States", currency_code: "USD", currency_symbol: "$", language_code: "en-US" },
  "CA": { country_code: "CA", country_name: "Canada", currency_code: "CAD", currency_symbol: "C$", language_code: "en-CA" },
  "MX": { country_code: "MX", country_name: "Mexico", currency_code: "MXN", currency_symbol: "$", language_code: "es-MX" },

  // Asia
  "IN": { country_code: "IN", country_name: "India", currency_code: "INR", currency_symbol: "₹", language_code: "en-IN" },
  "PK": { country_code: "PK", country_name: "Pakistan", currency_code: "PKR", currency_symbol: "₨", language_code: "en-PK" },
  "CN": { country_code: "CN", country_name: "China", currency_code: "CNY", currency_symbol: "¥", language_code: "zh-CN" },
  "JP": { country_code: "JP", country_name: "Japan", currency_code: "JPY", currency_symbol: "¥", language_code: "ja-JP" },
  "KR": { country_code: "KR", country_name: "South Korea", currency_code: "KRW", currency_symbol: "₩", language_code: "ko-KR" },
  "SG": { country_code: "SG", country_name: "Singapore", currency_code: "SGD", currency_symbol: "S$", language_code: "en-SG" },
  "MY": { country_code: "MY", country_name: "Malaysia", currency_code: "MYR", currency_symbol: "RM", language_code: "en-MY" },
  "TH": { country_code: "TH", country_name: "Thailand", currency_code: "THB", currency_symbol: "฿", language_code: "th-TH" },
  "PH": { country_code: "PH", country_name: "Philippines", currency_code: "PHP", currency_symbol: "₱", language_code: "en-PH" },
  "ID": { country_code: "ID", country_name: "Indonesia", currency_code: "IDR", currency_symbol: "Rp", language_code: "id-ID" },
  "VN": { country_code: "VN", country_name: "Vietnam", currency_code: "VND", currency_symbol: "₫", language_code: "vi-VN" },
  "BD": { country_code: "BD", country_name: "Bangladesh", currency_code: "BDT", currency_symbol: "৳", language_code: "bn-BD" },
  "LK": { country_code: "LK", country_name: "Sri Lanka", currency_code: "LKR", currency_symbol: "Rs", language_code: "si-LK" },

  // Oceania
  "AU": { country_code: "AU", country_name: "Australia", currency_code: "AUD", currency_symbol: "A$", language_code: "en-AU" },
  "NZ": { country_code: "NZ", country_name: "New Zealand", currency_code: "NZD", currency_symbol: "NZ$", language_code: "en-NZ" },

  // Africa
  "ZA": { country_code: "ZA", country_name: "South Africa", currency_code: "ZAR", currency_symbol: "R", language_code: "en-ZA" },
  "NG": { country_code: "NG", country_name: "Nigeria", currency_code: "NGN", currency_symbol: "₦", language_code: "en-NG" },
  "KE": { country_code: "KE", country_name: "Kenya", currency_code: "KES", currency_symbol: "KSh", language_code: "en-KE" },
  "GH": { country_code: "GH", country_name: "Ghana", currency_code: "GHS", currency_symbol: "₵", language_code: "en-GH" },
  "MA": { country_code: "MA", country_name: "Morocco", currency_code: "MAD", currency_symbol: "د.م.", language_code: "ar-MA" },
  "TN": { country_code: "TN", country_name: "Tunisia", currency_code: "TND", currency_symbol: "د.ت", language_code: "ar-TN" },
  "DZ": { country_code: "DZ", country_name: "Algeria", currency_code: "DZD", currency_symbol: "د.ج", language_code: "ar-DZ" },

  // South America
  "BR": { country_code: "BR", country_name: "Brazil", currency_code: "BRL", currency_symbol: "R$", language_code: "pt-BR" },
  "AR": { country_code: "AR", country_name: "Argentina", currency_code: "ARS", currency_symbol: "$", language_code: "es-AR" },
  "CL": { country_code: "CL", country_name: "Chile", currency_code: "CLP", currency_symbol: "$", language_code: "es-CL" },
  "CO": { country_code: "CO", country_name: "Colombia", currency_code: "COP", currency_symbol: "$", language_code: "es-CO" },
  "PE": { country_code: "PE", country_name: "Peru", currency_code: "PEN", currency_symbol: "S/", language_code: "es-PE" },
};

/**
 * Get country data by country code
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., "AE", "GB", "US")
 * @returns CountryData object or null if not found
 */
export const getCountryData = (countryCode: string): CountryData | null => {
  if (!countryCode || typeof countryCode !== 'string') {
    return null;
  }
  const upperCode = countryCode.toUpperCase().trim();
  return countryDataMap[upperCode] || null;
};

/**
 * Validate if a country code is supported
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns boolean indicating if country is supported
 */
export const isCountrySupported = (countryCode: string): boolean => {
  if (!countryCode || typeof countryCode !== 'string') {
    return false;
  }
  const upperCode = countryCode.toUpperCase().trim();
  return upperCode in countryDataMap;
};
