// checkout/utils/checkout-validator.ts
import { FormGroup } from '@angular/forms';
import { AddressDto } from '../../profile/address.service';
import { CheckoutRequest } from '../../../core/services/checkout.service';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class CheckoutValidator {
  static validateForms(
    billingForm: FormGroup,
    shippingForm: FormGroup,
    guestForm: FormGroup,
    isUserAuthenticated: boolean,
    isGuestUser: boolean,
    selectedBillingAddressId: string | null,
    selectedShippingAddressId: string | null,
    showNewBillingForm: boolean,
    showNewShippingForm: boolean,
    sameAsBilling: boolean,
    selectedPaymentMethod: string | null,
    userAddresses: AddressDto[],
    cartIsEmpty: boolean
  ): ValidationResult {
    const errors: string[] = [];

    // Enhanced guest email validation
    if (isGuestUser) {
      const billingEmail = billingForm.get('email')?.value;
      if (!billingEmail || !this.isValidEmail(billingEmail)) {
        errors.push('Please provide a valid email address.');
      }
    }

    // Billing validation
    if (
      isUserAuthenticated &&
      selectedBillingAddressId &&
      !showNewBillingForm
    ) {
      const selectedAddress = userAddresses.find(
        (addr) => addr.id === selectedBillingAddressId
      );
      if (!selectedAddress) {
        errors.push('Please select a valid billing address.');
      }
      if (
        !billingForm.get('email')?.value ||
        !billingForm.get('phone')?.value
      ) {
        if (!billingForm.get('email')?.value) {
          errors.push('Email is required for billing.');
        }
      }
    } else {
      if (!billingForm.valid) {
        billingForm.markAllAsTouched();
        errors.push('Please fill in all required billing information.');
      }
    }

    // Shipping validation
    if (!sameAsBilling) {
      if (
        isUserAuthenticated &&
        selectedShippingAddressId &&
        !showNewShippingForm
      ) {
        const selectedShippingAddress = userAddresses.find(
          (addr) => addr.id === selectedShippingAddressId
        );
        if (!selectedShippingAddress) {
          errors.push('Please select a valid shipping address.');
        }
      } else {
        if (!shippingForm.valid) {
          shippingForm.markAllAsTouched();
          errors.push('Please fill in all required shipping information.');
        }
      }
    }

    if (!selectedPaymentMethod) {
      errors.push('Please select a payment method.');
    }

    if (cartIsEmpty) {
      errors.push('Cart is empty. Please add items to continue.');
    }

    return { isValid: errors.length === 0, errors };
  }

  static validateCheckoutRequest(
    request: CheckoutRequest,
    isGuestUser: boolean
  ): ValidationResult {
    const errors: string[] = [];

    if (!request.billingAddress || request.billingAddress.trim() === '') {
      errors.push('Billing address is required');
    }

    if (!request.shippingAddress || request.shippingAddress.trim() === '') {
      errors.push('Shipping address is required');
    }

    if (!request.paymentMethod || request.paymentMethod.trim() === '') {
      errors.push('Payment method is required');
    }

    if (isGuestUser) {
      if (!request.guestEmail || !this.isValidEmail(request.guestEmail)) {
        errors.push('Valid guest email is required');
      }

      if (!request.guestUserId || request.guestUserId.trim() === '') {
        errors.push('Guest user ID is required');
      }

      if (!request.cartItems || request.cartItems.length === 0) {
        errors.push('Cart items are required for guest checkout');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  static validateCartForCheckout(
    cartItems: any[],
    isGuestUser: boolean,
    guestUserId: string | null,
    guestEmail: string
  ): ValidationResult {
    const errors: string[] = [];

    if (!cartItems || cartItems.length === 0) {
      errors.push('Your cart is empty. Please add items before checkout.');
      return { isValid: false, errors };
    }

    const invalidItems = cartItems.filter(
      (item) => !item.variantId || item.quantity <= 0 || item.unitPrice <= 0
    );

    if (invalidItems.length > 0) {
      errors.push(
        'Some items in your cart are invalid. Please review your cart.'
      );
    }

    if (isGuestUser) {
      if (!guestUserId) {
        errors.push(
          'Guest session not properly initialized. Please refresh and try again.'
        );
      }

      if (!guestEmail || !this.isValidEmail(guestEmail)) {
        errors.push('Valid email address is required for guest checkout.');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  static isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  static getErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error?.error?.message) {
      return error.error.message;
    }

    if (error?.message) {
      return error.message;
    }

    if (error?.status) {
      switch (error.status) {
        case 400:
          return 'Please check your information and try again.';
        case 401:
          return 'Authentication required. Please log in or continue as guest.';
        case 403:
          return 'Access denied. Please contact support if this continues.';
        case 404:
          return 'The requested resource was not found.';
        case 422:
          return 'Unable to process your request. Please verify all information.';
        case 500:
          return 'Service temporarily unavailable. Please try again in a moment.';
        default:
          return 'An unexpected error occurred. Please try again.';
      }
    }

    return 'An error occurred during checkout. Please try again.';
  }

  static getCheckoutProgress(
    billingFormValid: boolean,
    shippingFormValid: boolean,
    sameAsBilling: boolean,
    selectedPaymentMethod: string | null,
    isGuestEmailValid: boolean
  ): number {
    const totalSteps = 4;
    let completedSteps = 0;

    if (billingFormValid) completedSteps++;
    if (sameAsBilling || shippingFormValid) completedSteps++;
    if (selectedPaymentMethod) completedSteps++;
    if (isGuestEmailValid) completedSteps++;

    return Math.round((completedSteps / totalSteps) * 100);
  }
}
