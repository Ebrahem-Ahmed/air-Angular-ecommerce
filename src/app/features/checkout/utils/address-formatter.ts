// checkout/utils/address-formatter.ts
import {
  BillingAddress,
  ShippingAddress,
} from '../services/checkout-address.service';

export class AddressFormatter {
  private static readonly COUNTRY_CODE_MAP: { [key: string]: string } = {
    Egypt: 'EG',
    UAE: 'AE',
    'Saudi Arabia': 'SA',
  };

  private static readonly CODE_COUNTRY_MAP: { [key: string]: string } = {
    EG: 'Egypt',
    AE: 'UAE',
    SA: 'Saudi Arabia',
  };

  static formatBillingAddress(billing: BillingAddress): string {
    return [
      `${billing.firstName} ${billing.lastName}`,
      billing.addressLine1,
      billing.addressLine2,
      `${billing.city}, ${billing.country}`,
      billing.zipCode,
      `Phone: ${billing.phone}`,
      `Email: ${billing.email}`,
    ]
      .filter((part) => part && part.trim() !== '')
      .join('\n');
  }

  static formatShippingAddress(shipping: ShippingAddress): string {
    return [
      shipping.recipientName,
      shipping.line1,
      shipping.line2,
      `${shipping.city}, ${shipping.countryCode}`,
      shipping.postalCode,
      shipping.phone ? `Phone: ${shipping.phone}` : '',
    ]
      .filter((part) => part && part.trim() !== '')
      .join('\n');
  }

  static getCountryCode(countryName: string): string {
    return this.COUNTRY_CODE_MAP[countryName] || 'EG';
  }

  static getCountryName(countryCode: string): string {
    return this.CODE_COUNTRY_MAP[countryCode] || 'Egypt';
  }

  static formatAddressOneLine(
    line1: string,
    line2?: string,
    city?: string,
    country?: string,
    zipCode?: string
  ): string {
    const parts = [line1, line2, city, country, zipCode].filter(
      (part) => part && part.trim() !== ''
    );
    return parts.join(', ');
  }

  static parseAddressString(addressString: string): {
    lines: string[];
    phone?: string;
    email?: string;
  } {
    const lines = addressString
      .split('\n')
      .filter((line) => line.trim() !== '');
    const result: { lines: string[]; phone?: string; email?: string } = {
      lines: [],
    };

    lines.forEach((line) => {
      if (line.startsWith('Phone: ')) {
        result.phone = line.replace('Phone: ', '');
      } else if (line.startsWith('Email: ')) {
        result.email = line.replace('Email: ', '');
      } else {
        result.lines.push(line);
      }
    });

    return result;
  }

  static validateAddressFormat(address: string): boolean {
    if (!address || address.trim() === '') return false;

    const lines = address.split('\n').filter((line) => line.trim() !== '');
    return lines.length >= 3; // Minimum: name, address, city/country
  }

  static formatDisplayAddress(
    addressLine1: string,
    addressLine2?: string,
    city?: string,
    country?: string,
    zipCode?: string
  ): string {
    const parts: string[] = [];

    if (addressLine1) parts.push(addressLine1);
    if (addressLine2) parts.push(addressLine2);
    if (city && country) {
      parts.push(`${city}, ${country}`);
    } else if (city) {
      parts.push(city);
    } else if (country) {
      parts.push(country);
    }
    if (zipCode) parts.push(zipCode);

    return parts.join(', ');
  }

  static truncateAddress(address: string, maxLength: number = 50): string {
    if (address.length <= maxLength) return address;

    return address.substring(0, maxLength - 3) + '...';
  }

  static extractPhoneFromAddress(address: string): string | null {
    const phoneMatch = address.match(/Phone:\s*(.+)/);
    return phoneMatch ? phoneMatch[1].trim() : null;
  }

  static extractEmailFromAddress(address: string): string | null {
    const emailMatch = address.match(/Email:\s*(.+)/);
    return emailMatch ? emailMatch[1].trim() : null;
  }

  static removePhoneAndEmailFromAddress(address: string): string {
    return address
      .split('\n')
      .filter(
        (line) => !line.startsWith('Phone: ') && !line.startsWith('Email: ')
      )
      .join('\n');
  }
}
