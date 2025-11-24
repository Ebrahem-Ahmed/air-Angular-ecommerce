// checkout/services/checkout-form.service.ts
import { Injectable, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuthService } from '../../../core/services/auth.service.ts.service';
import { GuestUserService } from '../../../core/services/guestuser.service';
import { CheckoutService } from '../../../core/services/checkout.service';

@Injectable({
  providedIn: 'root',
})
export class CheckoutFormService {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private guestUserService = inject(GuestUserService);
  private checkoutService = inject(CheckoutService);

  billingForm!: FormGroup;
  shippingForm!: FormGroup;
  guestForm!: FormGroup;

  private destroy$ = new Subject<void>();

  constructor() {
    this.initializeForms();
  }

  private initializeForms(): void {
    this.billingForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      country: ['Egypt', Validators.required],
      addressLine1: ['', Validators.required],
      addressLine2: [''],
      city: ['', Validators.required],
      zipCode: [''],
      phone: ['', Validators.required],
    });

    this.shippingForm = this.fb.group({
      recipientName: ['', Validators.required],
      line1: ['', Validators.required],
      line2: [''],
      city: ['', Validators.required],
      countryCode: ['EG'],
      postalCode: [''],
      phone: [''],
    });

    this.guestForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      createAccount: [false],
    });
  }

  updateShippingFormValidators(sameAsBilling: boolean): void {
    const controls = this.shippingForm.controls;

    if (sameAsBilling) {
      Object.keys(controls).forEach((key) => {
        controls[key].clearValidators();
        controls[key].updateValueAndValidity();
      });
    } else {
      controls['recipientName'].setValidators([Validators.required]);
      controls['line1'].setValidators([Validators.required]);
      controls['city'].setValidators([Validators.required]);

      Object.keys(controls).forEach((key) => {
        controls[key].updateValueAndValidity();
      });
    }
  }

  synchronizeEmailFields(isGuestUser: boolean): void {
    this.guestForm
      .get('email')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((email) => {
        if (email && email !== this.billingForm.get('email')?.value) {
          this.billingForm.patchValue({ email }, { emitEvent: false });
          if (isGuestUser) {
            this.checkoutService.setGuestEmail(email);
          }
        }
      });

    this.billingForm
      .get('email')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((email) => {
        if (email && email !== this.guestForm.get('email')?.value) {
          this.guestForm.patchValue({ email }, { emitEvent: false });
          if (isGuestUser) {
            this.checkoutService.setGuestEmail(email);
          }
        }
      });
  }

  prefillUserData(): void {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return;

    this.billingForm.patchValue({
      firstName: currentUser.firstName || '',
      lastName: currentUser.lastName || '',
      email: currentUser.email || '',
      phone: currentUser.phone || '',
    });

    this.shippingForm.patchValue({
      recipientName:
        `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() ||
        'Recipient',
      phone: currentUser.phone || '',
    });
  }

  resetForms(): void {
    this.billingForm.reset();
    this.shippingForm.reset();
    this.guestForm.reset();
  }

  getFieldError(formGroup: FormGroup, fieldName: string): string {
    const field = formGroup.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required'])
        return `${this.getFieldLabel(fieldName)} is required`;
      if (field.errors['email']) return 'Invalid email format';
      if (field.errors['pattern'])
        return `Invalid ${this.getFieldLabel(fieldName)} format`;
    }
    return '';
  }

  isFieldInvalid(formGroup: FormGroup, fieldName: string): boolean {
    const field = formGroup.get(fieldName);
    return !!(field?.errors && field.touched);
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email',
      country: 'Country',
      addressLine1: 'Address Line 1',
      city: 'City',
      phone: 'Phone',
      recipientName: 'Recipient Name',
      line1: 'Address Line 1',
    };
    return labels[fieldName] || fieldName;
  }

  isBillingFormComplete(
    selectedBillingAddressId: string | null,
    showNewBillingForm: boolean
  ): boolean {
    const billingData = this.billingForm.value;

    if (selectedBillingAddressId && !showNewBillingForm) {
      return !!(billingData.email && billingData.phone);
    }

    return !!(
      billingData.firstName &&
      billingData.lastName &&
      billingData.email &&
      billingData.addressLine1 &&
      billingData.city &&
      billingData.country &&
      billingData.phone
    );
  }

  isShippingFormComplete(
    sameAsBilling: boolean,
    selectedShippingAddressId: string | null,
    showNewShippingForm: boolean
  ): boolean {
    if (sameAsBilling) return true;

    const shippingData = this.shippingForm.value;

    if (selectedShippingAddressId && !showNewShippingForm) {
      return !!shippingData.recipientName;
    }

    return !!(
      shippingData.recipientName &&
      shippingData.line1 &&
      shippingData.city &&
      shippingData.countryCode
    );
  }

  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
