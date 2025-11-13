/**
 * Card utility functions for masking, formatting, and validation
 */

/**
 * Masks a card number showing only the last 4 digits
 * @param cardNumber - The full card number
 * @returns Masked card number (e.g., "•••• •••• •••• 1234")
 */
export const maskCardNumber = (cardNumber: string): string => {
  if (!cardNumber) return '';
  
  // Remove all non-digits
  const digits = cardNumber.replace(/\D/g, '');
  
  if (digits.length < 4) {
    return '••••';
  }
  
  const lastFour = digits.slice(-4);
  const maskedPart = '•••• •••• ••••';
  
  return `${maskedPart} ${lastFour}`;
};

/**
 * Masks a PAN number showing first 5 and last 2 characters
 * @param panNumber - The full PAN number
 * @returns Masked PAN (e.g., "ABCDE•••4F")
 */
export const maskPAN = (panNumber: string): string => {
  if (!panNumber || panNumber.length < 7) return panNumber;
  
  const first5 = panNumber.substring(0, 5);
  const last2 = panNumber.substring(panNumber.length - 2);
  const middleDots = '•'.repeat(panNumber.length - 7);
  
  return `${first5}${middleDots}${last2}`;
};

/**
 * Formats a card number with spaces (XXXX XXXX XXXX XXXX)
 * @param cardNumber - The card number
 * @returns Formatted card number
 */
export const formatCardNumber = (cardNumber: string): string => {
  if (!cardNumber) return '';
  
  // Remove all non-digits
  const digits = cardNumber.replace(/\D/g, '');
  
  // Format as XXXX XXXX XXXX XXXX
  if (digits.length === 16) {
    return `${digits.substring(0, 4)} ${digits.substring(4, 8)} ${digits.substring(8, 12)} ${digits.substring(12, 16)}`;
  }
  
  // For other lengths, add space every 4 digits
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
};

/**
 * Formats an expiry date (MM/YY)
 * @param expiryDate - The expiry date
 * @returns Formatted expiry date
 */
export const formatExpiryDate = (expiryDate: string): string => {
  if (!expiryDate) return '';
  
  // Remove all non-digits
  const digits = expiryDate.replace(/\D/g, '');
  
  if (digits.length >= 2) {
    return `${digits.substring(0, 2)}/${digits.substring(2, 4)}`;
  }
  
  return digits;
};

/**
 * Gets the card network from card number
 * @param cardNumber - The card number
 * @returns Card network (visa, mastercard, amex, rupay, etc.)
 */
export const getCardNetwork = (cardNumber: string): string => {
  if (!cardNumber) return 'unknown';
  
  const digits = cardNumber.replace(/\D/g, '');
  
  if (digits.length < 6) return 'unknown';
  
  // Visa: starts with 4
  if (digits.startsWith('4')) {
    return 'visa';
  }
  
  // Mastercard: 51-55 or 2221-2720
  const first2 = parseInt(digits.substring(0, 2));
  const first4 = parseInt(digits.substring(0, 4));
  if ((first2 >= 51 && first2 <= 55) || (first4 >= 2221 && first4 <= 2720)) {
    return 'mastercard';
  }
  
  // American Express: 34 or 37
  if (digits.startsWith('34') || digits.startsWith('37')) {
    return 'amex';
  }
  
  // RuPay: 60, 65, 81, 82, 508
  if (digits.startsWith('60') || digits.startsWith('65') || 
      digits.startsWith('81') || digits.startsWith('82') ||
      digits.startsWith('508')) {
    return 'rupay';
  }
  
  // Discover: 6011, 622126-622925, 644-649, 65
  if (digits.startsWith('6011') || digits.startsWith('65') ||
      (first4 >= 622126 && first4 <= 622925) ||
      (first2 >= 644 && first2 <= 649)) {
    return 'discover';
  }
  
  return 'unknown';
};

/**
 * Validates a card number using Luhn algorithm
 * @param cardNumber - The card number
 * @returns True if valid
 */
export const validateCardNumber = (cardNumber: string): boolean => {
  const digits = cardNumber.replace(/\D/g, '');
  
  if (digits.length < 13 || digits.length > 19) {
    return false;
  }
  
  let sum = 0;
  let isEven = false;
  
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
};

/**
 * Gets display name for card type
 * @param type - The card type
 * @returns Display name
 */
export const getCardTypeDisplayName = (type: string): string => {
  const typeMap: Record<string, string> = {
    credit: 'Credit Card',
    debit: 'Debit Card',
    aadhar: 'Aadhaar Card',
    pan: 'PAN Card',
    other: 'Other',
  };
  
  return typeMap[type] || type;
};

/**
 * Gets the bank logo/color based on bank name
 * @param bank - The bank name
 * @returns Color class
 */
export const getBankColor = (bank: string): string => {
  const bankColors: Record<string, string> = {
    'hdfc': 'from-blue-600 to-blue-700',
    'sbi': 'from-blue-800 to-blue-900',
    'icici': 'from-orange-600 to-orange-700',
    'axis': 'from-red-600 to-red-700',
    'kotak': 'from-red-700 to-red-800',
    'indusind': 'from-green-600 to-green-700',
    'yes': 'from-blue-500 to-blue-600',
    'uidai': 'from-green-600 to-green-700',
    'income tax dept.': 'from-green-700 to-green-800',
    'other': 'from-slate-600 to-slate-700',
  };
  
  const normalizedBank = bank?.toLowerCase() || '';
  return bankColors[normalizedBank] || 'from-slate-600 to-slate-700';
};

