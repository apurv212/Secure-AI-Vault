/**
 * Bank name normalization utility
 * Normalizes various bank name variations to standardized format
 * Removes "Bank" word from normalized names
 */

const bankNormalizations = {
  'hdfc': 'HDFC',
  'hdfc bank': 'HDFC',
  'hdfcbank': 'HDFC',
  'hdfc ltd': 'HDFC',
  'sbi': 'SBI',
  'state bank of india': 'SBI',
  'icici': 'ICICI',
  'icici bank': 'ICICI',
  'icicibank': 'ICICI',
  'axis': 'Axis',
  'axis bank': 'Axis',
  'axisbank': 'Axis',
  'kotak': 'Kotak Mahindra',
  'kotak mahindra': 'Kotak Mahindra',
  'kotak bank': 'Kotak Mahindra',
  'kotak mahindra bank': 'Kotak Mahindra',
  'pnb': 'PNB',
  'punjab national bank': 'PNB',
  'bob': 'Baroda',
  'bank of baroda': 'Baroda',
  'canara': 'Canara',
  'canara bank': 'Canara',
  'union': 'Union',
  'union bank': 'Union',
  'union bank of india': 'Union',
  'idbi': 'IDBI',
  'idbi bank': 'IDBI',
  'yes': 'YES',
  'yes bank': 'YES',
  'indian bank': 'Indian',
  'indian': 'Indian',
  'indian overseas bank': 'IOB',
  'iob': 'IOB',
  'central bank': 'Central',
  'central bank of india': 'Central',
  'central': 'Central',
  'uco': 'UCO',
  'uco bank': 'UCO',
  'syndicate': 'Syndicate',
  'syndicate bank': 'Syndicate',
  'federal': 'Federal',
  'federal bank': 'Federal',
  'south indian bank': 'South Indian',
  'sib': 'South Indian',
  'karur vysya': 'Karur Vysya',
  'kvb': 'Karur Vysya',
  'karur vysya bank': 'Karur Vysya',
  'city union': 'City Union',
  'cub': 'City Union',
  'city union bank': 'City Union',
  'dcb': 'DCB',
  'development credit bank': 'DCB',
  'rbl': 'RBL',
  'rbl bank': 'RBL',
  'dbs': 'DBS',
  'dbs bank': 'DBS',
  'standard chartered': 'Standard Chartered',
  'sc': 'Standard Chartered',
  'standard chartered bank': 'Standard Chartered',
  'hsbc': 'HSBC',
  'hsbc bank': 'HSBC',
  'citibank': 'Citi',
  'citi': 'Citi',
  'citi bank': 'Citi',
  'american express': 'American Express',
  'amex': 'American Express',
  'americanexpress': 'American Express',
};

/**
 * Normalizes a bank name to a standardized format
 * @param {string} bankName - The bank name to normalize
 * @returns {string|null} - Normalized bank name or null if not found
 */
function normalizeBankName(bankName) {
  if (!bankName || typeof bankName !== 'string') {
    return null;
  }

  const trimmedName = bankName.trim();
  if (!trimmedName) {
    return null;
  }

  // Remove common suffixes/prefixes and normalize
  const normalized = trimmedName.toLowerCase()
    .replace(/\s+/g, ' ') // Normalize multiple spaces
    .trim();

  // Check direct match in normalization map
  if (bankNormalizations[normalized]) {
    return bankNormalizations[normalized];
  }

  // Try removing "bank" word and check again
  const withoutBank = normalized.replace(/\bbank\b/g, '').trim();
  if (withoutBank && bankNormalizations[withoutBank]) {
    return bankNormalizations[withoutBank];
  }

  // Try removing common suffixes
  const variations = [
    normalized.replace(/\s+ltd\.?$/i, ''),
    normalized.replace(/\s+limited$/i, ''),
    normalized.replace(/\s+of\s+india$/i, ''),
  ];

  for (const variation of variations) {
    if (variation && bankNormalizations[variation]) {
      return bankNormalizations[variation];
    }
  }

  // If no match found, capitalize first letter of each word
  // but remove "bank" word if present
  const words = normalized.split(' ')
    .filter(word => word.toLowerCase() !== 'bank')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  
  return words.length > 0 ? words.join(' ') : null;
}

/**
 * Normalizes extracted card data
 * - Normalizes bank name
 * - Sets type to "other" if no bank is found
 * @param {object} extractedData - The extracted card data
 * @returns {object} - Normalized extracted data
 */
function normalizeExtractedData(extractedData) {
  if (!extractedData || typeof extractedData !== 'object') {
    return extractedData;
  }

  const normalized = { ...extractedData };

  // Normalize bank name
  if (normalized.bank) {
    const normalizedBank = normalizeBankName(normalized.bank);
    if (normalizedBank) {
      normalized.bank = normalizedBank;
    } else {
      // If bank name couldn't be normalized, remove it
      delete normalized.bank;
    }
  }

  // If no bank found, set type to "other"
  if (!normalized.bank || !normalized.bank.trim()) {
    normalized.type = 'other';
    delete normalized.bank;
  }

  return normalized;
}

module.exports = {
  normalizeBankName,
  normalizeExtractedData,
  bankNormalizations,
};

