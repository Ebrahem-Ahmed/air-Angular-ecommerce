// checkout/services/checkout-address.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AddressDto, AddressService } from '../../profile/address.service';
import { AuthService } from '../../../core/services/auth.service.ts.service';
import { CheckoutFormService } from './checkout-form.service';

export interface BillingAddress {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  zipCode?: string;
  phone: string;
}

export interface ShippingAddress {
  recipientName: string;
  line1: string;
  line2?: string;
  city: string;
  countryCode: string;
  postalCode?: string;
  phone?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CheckoutAddressService {
  private addressService = inject(AddressService);
  private authService = inject(AuthService);
  private formService = inject(CheckoutFormService);

  userAddresses: AddressDto[] = [];
  selectedBillingAddressId: string | null = null;
  selectedShippingAddressId: string | null = null;
  showNewBillingForm = false;
  showNewShippingForm = false;

  loadUserAddresses(): Observable<AddressDto[]> {
    return new Observable((observer) => {
      if (!this.authService.isLoggedIn()) {
        observer.next([]);
        observer.complete();
        return;
      }

      this.addressService.getUserAddresses().subscribe({
        next: (addresses) => {
          this.userAddresses = addresses;
          this.selectDefaultAddress(addresses);
          observer.next(addresses);
          observer.complete();
        },
        error: (error) => {
          console.error('Failed to load addresses:', error);
          this.showNewBillingForm = true;
          this.formService.prefillUserData();
          observer.error(error);
        },
      });
    });
  }

  private selectDefaultAddress(addresses: AddressDto[]): void {
    const defaultAddress =
      addresses.find((addr) => addr.isDefault) || addresses[0];

    if (defaultAddress) {
      this.selectedBillingAddressId = defaultAddress.id;
      this.prefillAddressForm(defaultAddress, 'billing');
      this.formService.prefillUserData();
    } else {
      this.showNewBillingForm = true;
      this.formService.prefillUserData();
    }
  }

  private prefillAddressForm(
    address: AddressDto,
    formType: 'billing' | 'shipping'
  ): void {
    const addressData = {
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || '',
      city: address.city,
      zipCode: address.zipCode,
    };

    if (formType === 'billing') {
      this.formService.billingForm.patchValue({
        ...addressData,
        country: address.country,
      });
    } else {
      this.formService.shippingForm.patchValue({
        line1: addressData.addressLine1,
        line2: addressData.addressLine2,
        city: addressData.city,
        postalCode: addressData.zipCode,
        countryCode: this.getCountryCode(address.country),
      });
    }
  }

  onBillingAddressChange(addressId: string): void {
    if (!this.authService.isLoggedIn()) return;

    if (addressId === 'new') {
      this.showNewBillingForm = true;
      this.selectedBillingAddressId = null;
      this.formService.billingForm.reset();
      this.formService.prefillUserData();
    } else {
      this.showNewBillingForm = false;
      this.selectedBillingAddressId = addressId;
      const selectedAddress = this.userAddresses.find(
        (addr) => addr.id === addressId
      );
      if (selectedAddress) {
        this.prefillAddressForm(selectedAddress, 'billing');
        this.formService.prefillUserData();
        this.formService.billingForm.markAsUntouched();
      }
    }
  }

  onShippingAddressChange(addressId: string): void {
    if (!this.authService.isLoggedIn()) return;

    if (addressId === 'new') {
      this.showNewShippingForm = true;
      this.selectedShippingAddressId = null;
      this.formService.shippingForm.reset();
      this.formService.prefillUserData();
    } else {
      this.showNewShippingForm = false;
      this.selectedShippingAddressId = addressId;
      const selectedAddress = this.userAddresses.find(
        (addr) => addr.id === addressId
      );
      if (selectedAddress) {
        this.prefillAddressForm(selectedAddress, 'shipping');
        this.formService.shippingForm.markAsUntouched();
      }
    }
  }

  async saveNewAddressesIfNeeded(
    sameAsBilling: boolean,
    isGuestUser: boolean
  ): Promise<void> {
    if (isGuestUser || !this.authService.isLoggedIn()) {
      console.log('Guest user or not authenticated - skipping address saving');
      return Promise.resolve();
    }

    const promises: Promise<any>[] = [];
    const currentUser = this.authService.currentUser();

    // Save new billing address
    if (this.showNewBillingForm && this.formService.billingForm.valid) {
      const billingData = this.formService.billingForm.value;

      // Create API payload for billing address
      const billingApiPayload = {
        userId: currentUser?.id,
        firstName: billingData.firstName,
        lastName: billingData.lastName,
        company: '', // Required by API
        street: billingData.addressLine1,
        street2: billingData.addressLine2 || '',
        city: billingData.city,
        state: billingData.city, // Using city as state fallback
        postalCode: billingData.zipCode || '', // Ensure we have a value
        country: billingData.country,
        phoneNumber: billingData.phone,
        isDefault: this.userAddresses.length === 0,
        addressType: 'Billing',
      };

      promises.push(
        this.addressService
          .createAddress(billingApiPayload as any)
          .toPromise()
          .then((address) => {
            if (address) {
              this.selectedBillingAddressId = address.id;
              this.userAddresses.push(address);
            }
          })
      );
    }

    // Save new shipping address - THIS IS WHERE THE FIX IS
    if (
      !sameAsBilling &&
      this.showNewShippingForm &&
      this.formService.shippingForm.valid
    ) {
      const shippingData = this.formService.shippingForm.value;
      const recipientNameParts = shippingData.recipientName.split(' ');

      // Create API payload for shipping address
      const shippingApiPayload = {
        userId: currentUser?.id,
        firstName: recipientNameParts[0] || 'Recipient',
        lastName: recipientNameParts.slice(1).join(' ') || '',
        company: '', // Required by API
        street: shippingData.line1,
        street2: shippingData.line2 || '',
        city: shippingData.city,
        state: shippingData.city, // Using city as state fallback
        postalCode: shippingData.postalCode || '', // FIXED: Use postalCode from form and ensure it's not undefined
        country: this.getCountryName(shippingData.countryCode),
        phoneNumber: shippingData.phone || currentUser?.phone || '',
        isDefault: false,
        addressType: 'Shipping',
      };

      promises.push(
        this.addressService
          .createAddress(shippingApiPayload as any)
          .toPromise()
          .then((address) => {
            if (address) {
              this.selectedShippingAddressId = address.id;
              this.userAddresses.push(address);
            }
          })
      );
    }

    await Promise.all(promises);
  }

  formatAddress(billing: BillingAddress): string {
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

  formatShippingAddress(shipping: ShippingAddress): string {
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

  private getCountryCode(countryName: string): string {
    const countryMap: { [key: string]: string } = {
      Egypt: 'EG',
      UAE: 'AE',
      'Saudi Arabia': 'SA',
    };
    return countryMap[countryName] || 'EG';
  }

  private getCountryName(countryCode: string): string {
    const codeMap: { [key: string]: string } = {
      EG: 'Egypt',
      AE: 'UAE',
      SA: 'Saudi Arabia',
    };
    return codeMap[countryCode] || 'Egypt';
  }

  getAddressSummary(address: AddressDto): string {
    return this.addressService.getAddressSummary(address);
  }

  getFullAddress(address: AddressDto): string {
    return this.addressService.getFullAddress(address);
  }

  setupGuestCheckout(): void {
    this.showNewBillingForm = true;
    this.selectedBillingAddressId = null;
    this.selectedShippingAddressId = null;
    this.userAddresses = [];
  }
}
