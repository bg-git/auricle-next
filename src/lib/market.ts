// lib/market.ts
import { ShopifyCustomer } from '@/context/AuthContext';

export type CountryCode = string; // ISO 3166-1 alpha-2 country code

/**
 * Get the country code from a customer's default address
 */
export function getCustomerCountryCode(customer: ShopifyCustomer | null): CountryCode {
  if (!customer?.defaultAddress?.country) {
    return 'GB'; // Default to UK
  }

  const country = customer.defaultAddress.country.toUpperCase();

  // If it's already a 2-letter ISO code, return it
  if (country.length === 2) {
    return country;
  }

  // Map common country names to ISO codes
  const countryNameMap: Record<string, string> = {
    'UNITED KINGDOM': 'GB',
    'UNITED STATES': 'US',
    'CANADA': 'CA',
    'FRANCE': 'FR',
    'GERMANY': 'DE',
    'SPAIN': 'ES',
    'ITALY': 'IT',
    'NETHERLANDS': 'NL',
    'BELGIUM': 'BE',
    'AUSTRIA': 'AT',
    'PORTUGAL': 'PT',
    'IRELAND': 'IE',
    'POLAND': 'PL',
    'SWEDEN': 'SE',
    'DENMARK': 'DK',
    'FINLAND': 'FI',
    'GREECE': 'GR',
    'BULGARIA': 'BG',
    'CROATIA': 'HR',
    'CYPRUS': 'CY',
    'CZECH REPUBLIC': 'CZ',
    'ESTONIA': 'EE',
    'HUNGARY': 'HU',
    'LATVIA': 'LV',
    'LITHUANIA': 'LT',
    'LUXEMBOURG': 'LU',
    'MALTA': 'MT',
    'ROMANIA': 'RO',
    'SLOVAKIA': 'SK',
    'SLOVENIA': 'SI',
  };

  return countryNameMap[country] || 'GB';
}

/**
 * Format a price with currency
 */
export function formatPrice(amount: string | number, currencyCode: string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const formatted = numAmount % 1 === 0 ? numAmount.toFixed(0) : numAmount.toFixed(2);

  // Currency symbols
  const symbols: Record<string, string> = {
    GBP: '£',
    USD: '$',
    CAD: 'CA$',
    EUR: '€',
  };

  const symbol = symbols[currencyCode] || currencyCode;
  return `${symbol}${formatted}`;
}
