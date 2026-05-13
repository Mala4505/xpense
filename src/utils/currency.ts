export function formatAmount(amount: number, locale: string = 'en-IN'): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCurrency(amount: number, currency: string, locale: string = 'en-IN'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatAmountWithPrefix(
  amount: number,
  flow: 'IN' | 'OUT',
  currency: string = 'INR'
): string {
  const prefix = flow === 'IN' ? '+ ' : '− ';
  const formatted = formatAmount(amount);
  return `${prefix}${currency} ${formatted}`;
}

export const CURRENCY_LIST = [
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'KWD', name: 'Kuwaiti Dinar' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'BDT', name: 'Bangladeshi Taka' },
  { code: 'PKR', name: 'Pakistani Rupee' },
  { code: 'LKR', name: 'Sri Lankan Rupee' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'MYR', name: 'Malaysian Ringgit' },
  { code: 'QAR', name: 'Qatari Riyal' },
  { code: 'OMR', name: 'Omani Rial' },
  { code: 'BHD', name: 'Bahraini Dinar' },
  { code: 'JOD', name: 'Jordanian Dinar' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CNY', name: 'Chinese Yuan' },
];
