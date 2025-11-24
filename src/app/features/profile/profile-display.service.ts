import { Injectable } from '@angular/core';
import { CustomerProfileDto } from './customer.service';

@Injectable({
  providedIn: 'root',
})
export class ProfileDisplayService {
  // Display formatting methods
  getCustomerDisplayName(customer: CustomerProfileDto | null): string {
    if (!customer) return '';
    const firstName = customer.firstName || '';
    const lastName = customer.lastName || '';
    return `${firstName} ${lastName}`.trim() || 'User';
  }

  getCustomerEmail(customer: CustomerProfileDto | null): string {
    return customer?.email || '';
  }

  getCustomerBirthDate(customer: CustomerProfileDto | null): string {
    const dob = customer?.dateOfBirth;
    return dob ? new Date(dob).toLocaleDateString() : 'Not specified';
  }

  getCustomerPhone(customer: CustomerProfileDto | null): string {
    if (!customer) return '';
    return customer.phone || customer.phoneNumber || '';
  }

  // Utility methods for display
  formatPrice(price: number, currency: string = 'EUR'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  }

  formatOrderDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getOrderStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      Pending: 'badge bg-warning text-dark',
      Processing: 'badge bg-info text-white',
      Shipped: 'badge bg-primary text-white',
      Delivered: 'badge bg-success text-white',
      Cancelled: 'badge bg-danger text-white',
    };
    return statusClasses[status] || 'badge bg-secondary text-white';
  }

  truncateText(text: string, maxLength: number = 30): string {
    if (!text) return '';
    return text.length > maxLength
      ? text.substring(0, maxLength) + '...'
      : text;
  }

  // Format phone number for display (optional helper method)
  formatPhoneForDisplay(phone: string): string {
    if (!phone) return '';

    // Simple formatting for display - you can customize this
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return cleaned.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, '+$1 ($2) $3-$4');
    }
    return phone;
  }

  // Data transformation helpers
  prepareProfileDataForSubmission(formData: any): any {
    const preparedData = { ...formData };

    // Handle gender conversion
    if (
      preparedData.gender !== '' &&
      preparedData.gender !== null &&
      preparedData.gender !== undefined
    ) {
      preparedData.gender = parseInt(preparedData.gender, 10);
    } else {
      delete preparedData.gender; // Remove if empty
    }

    // Handle date format - ensure it's in YYYY-MM-DD format
    if (preparedData.dateOfBirth) {
      const dateValue = preparedData.dateOfBirth;
      if (
        typeof dateValue === 'string' &&
        dateValue.match(/^\d{4}-\d{2}-\d{2}$/)
      ) {
        // Already in correct format
      } else {
        // Convert to correct format
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          preparedData.dateOfBirth = date.toISOString().split('T')[0];
        } else {
          delete preparedData.dateOfBirth; // Remove invalid date
        }
      }
    } else {
      delete preparedData.dateOfBirth; // Remove if empty
    }

    // Handle optional fields
    if (
      !preparedData.preferredLanguage ||
      preparedData.preferredLanguage === ''
    ) {
      delete preparedData.preferredLanguage;
    }

    // Handle phone number (only if phone field exists and has a value)
    if (preparedData.phone) {
      const cleanPhone = preparedData.phone.replace(/[\s\-\(\)\.]/g, '');
      // Only include phone if it's not empty after cleaning
      if (cleanPhone.length > 0) {
        preparedData.phone = cleanPhone;
      } else {
        delete preparedData.phone; // Remove if empty after cleaning
      }
    } else if (preparedData.hasOwnProperty('phone')) {
      delete preparedData.phone; // Remove empty phone field
    }

    return preparedData;
  }

  prepareAddressDataForSubmission(
    formData: any,
    customer: CustomerProfileDto | null,
    customerPhone: string,
    hasPhoneField: boolean
  ): any {
    // Determine which phone number to use
    let phoneToUse = '';
    if (hasPhoneField && formData.phoneNumber) {
      // Form has phone field and user filled it
      phoneToUse = formData.phoneNumber.replace(/[\s\-\(\)\.]/g, '');
    } else if (customerPhone) {
      // User already has phone, use existing one
      phoneToUse = customerPhone.replace(/[\s\-\(\)\.]/g, '');
    }

    // Map form fields to API expected format
    return {
      userId: customer?.id,
      firstName: customer?.firstName || '',
      lastName: customer?.lastName || '',
      company: '',
      street: formData.addressLine1,
      street2: formData.addressLine2 || '',
      city: formData.city,
      state: formData.state,
      postalCode: formData.zipCode,
      country: formData.country,
      phoneNumber: phoneToUse,
      isDefault: formData.isDefault || false,
      addressType: formData.addressType || 'Home',
    };
  }

  cleanPhoneNumber(phone: string): string {
    return phone.replace(/[\s\-\(\)\.]/g, '');
  }
}
