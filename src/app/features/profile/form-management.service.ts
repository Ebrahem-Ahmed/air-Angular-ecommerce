import { Injectable, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { CustomerProfileDto } from './customer.service';

// Custom validator for phone numbers
export function phoneValidator(
  control: AbstractControl
): ValidationErrors | null {
  if (!control.value) {
    return null; // Let required validator handle empty values
  }

  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  const cleanPhone = control.value.replace(/[\s\-\(\)\.]/g, '');

  if (!phoneRegex.test(cleanPhone)) {
    return { invalidPhone: true };
  }

  // Check length (E.164 format allows up to 15 digits)
  if (cleanPhone.length < 7 || cleanPhone.length > 16) {
    return { phoneLength: true };
  }

  return null;
}

@Injectable({
  providedIn: 'root',
})
export class FormManagementService {
  private fb = inject(FormBuilder);

  // Form error state
  formErrors: { [key: string]: string } = {};

  /**
   * Creates edit profile form - now always includes phone field
   * Phone field allows users to add or update their phone number
   */
  createEditProfileForm(customer: CustomerProfileDto | null): FormGroup {
    console.log('Creating edit profile form with customer:', customer);

    const form = this.fb.group({
      firstName: [
        customer?.firstName || '',
        [Validators.required, Validators.minLength(2)],
      ],
      lastName: [
        customer?.lastName || '',
        [Validators.required, Validators.minLength(2)],
      ],
      email: [customer?.email || '', [Validators.required, Validators.email]],
      dateOfBirth: [
        customer?.dateOfBirth
          ? new Date(customer.dateOfBirth).toISOString().split('T')[0]
          : '',
      ],
      gender: [customer?.gender?.toString() || ''],
      preferredLanguage: [customer?.preferredLanguage || ''],
      // Always include phone field with current phone value
      // Make it optional so users can add or update their phone
      phone: [
        this.getPhoneNumber(customer) || '',
        [phoneValidator], // Only phone format validation, not required
      ],
    });

    console.log('Created form with values:', form.value);
    return form;
  }

  /**
   * Creates dedicated mobile form for adding/updating phone
   */
  createAddMobileForm(customer: CustomerProfileDto | null): FormGroup {
    return this.fb.group({
      phone: [
        this.getPhoneNumber(customer) || '',
        [Validators.required, phoneValidator],
      ],
    });
  }

  /**
   * Creates address form - always includes phone field
   * Phone is pre-filled from customer data if available
   */
  createAddressForm(customer: CustomerProfileDto | null): FormGroup {
    return this.fb.group({
      addressLine1: ['', Validators.required],
      addressLine2: [''],
      city: ['', Validators.required],
      state: ['', Validators.required],
      zipCode: ['', Validators.required],
      country: ['', Validators.required],
      addressType: ['Home'],
      isDefault: [false],
      // Always include phone field with customer's phone pre-filled
      phoneNumber: [
        this.getPhoneNumber(customer) || '',
        [Validators.required, phoneValidator],
      ],
    });
  }

  createDataSettingsForm(): FormGroup {
    return this.fb.group({
      emailNotifications: [true],
      smsNotifications: [false],
      marketingEmails: [true],
      dataSharing: [false],
    });
  }

  createPreferencesForm(customer: CustomerProfileDto | null): FormGroup {
    return this.fb.group({
      preferredLanguage: [customer?.preferredLanguage || 'English'],
      currency: ['EUR'],
      sizePreference: [''],
    });
  }

  /**
   * Updates form with customer data - preserves existing form values if data is missing
   */
  updateFormWithCustomerData(
    form: FormGroup,
    customer: CustomerProfileDto
  ): void {
    console.log('=== UPDATE FORM WITH CUSTOMER DATA ===');
    console.log('Form provided:', !!form);
    console.log('Customer provided:', !!customer);
    console.log('Customer data:', customer);

    if (!form || !customer) {
      console.warn('Form or customer is missing:', {
        form: !!form,
        customer: !!customer,
      });
      return;
    }

    const currentValues = form.value;
    console.log('Current form values:', currentValues);

    const phoneNumber = this.getPhoneNumber(customer);
    console.log('Extracted phone number:', phoneNumber);

    const updateData: any = {
      firstName: customer.firstName || currentValues.firstName || '',
      lastName: customer.lastName || currentValues.lastName || '',
      email: customer.email || currentValues.email || '',
      dateOfBirth: customer.dateOfBirth
        ? new Date(customer.dateOfBirth).toISOString().split('T')[0]
        : currentValues.dateOfBirth || '',
      gender: customer.gender?.toString() || currentValues.gender || '',
      preferredLanguage:
        customer.preferredLanguage || currentValues.preferredLanguage || '',
    };

    console.log('Update data before phone:', updateData);

    // Handle phone fields - always update with customer data
    if (form.get('phone')) {
      updateData.phone = phoneNumber || currentValues.phone || '';
      console.log('Setting phone field to:', updateData.phone);
    }
    if (form.get('phoneNumber')) {
      updateData.phoneNumber = phoneNumber || currentValues.phoneNumber || '';
      console.log('Setting phoneNumber field to:', updateData.phoneNumber);
    }

    console.log('Final update data:', updateData);
    form.patchValue(updateData);
    console.log('Form after patchValue:', form.value);
  }

  /**
   * Updates mobile form specifically
   */
  updateMobileForm(form: FormGroup, customer: CustomerProfileDto): void {
    if (!form || !customer) return;

    const currentValue = form.get('phone')?.value;
    const phoneNumber = this.getPhoneNumber(customer);

    form.patchValue({
      phone: phoneNumber || currentValue || '',
    });
  }

  /**
   * Updates preferences form
   */
  updatePreferencesForm(form: FormGroup, customer: CustomerProfileDto): void {
    if (!form || !customer) return;

    const currentValues = form.value;

    form.patchValue({
      preferredLanguage:
        customer.preferredLanguage ||
        currentValues.preferredLanguage ||
        'English',
      currency: currentValues.currency || 'EUR',
      sizePreference: currentValues.sizePreference || '',
    });
  }

  /**
   * Updates address form with address data
   */
  updateAddressForm(
    form: FormGroup,
    address: any,
    customer: CustomerProfileDto | null
  ): void {
    if (!form) return;

    const currentValues = form.value;
    const phoneNumber =
      address?.phoneNumber ||
      this.getPhoneNumber(customer) ||
      currentValues.phoneNumber ||
      '';

    // Properly convert isDefault to boolean
    let isDefaultValue = false;
    if (address?.isDefault !== undefined) {
      isDefaultValue =
        address.isDefault === true || address.isDefault === 'true';
    } else if (currentValues.isDefault !== undefined) {
      isDefaultValue =
        currentValues.isDefault === true || currentValues.isDefault === 'true';
    }

    const updateData = {
      addressLine1:
        address?.addressLine1 ||
        address?.street ||
        currentValues.addressLine1 ||
        '',
      addressLine2:
        address?.addressLine2 ||
        address?.street2 ||
        currentValues.addressLine2 ||
        '',
      city: address?.city || currentValues.city || '',
      state: address?.state || currentValues.state || '',
      zipCode:
        address?.zipCode || address?.postalCode || currentValues.zipCode || '',
      country: address?.country || currentValues.country || '',
      addressType: address?.addressType || currentValues.addressType || 'Home',
      isDefault: isDefaultValue,
      phoneNumber: phoneNumber,
    };

    form.patchValue(updateData);
  }

  /**
   * Resets address form to default state but preserves phone number
   */
  resetAddressForm(form: FormGroup, customer: CustomerProfileDto | null): void {
    if (!form) return;

    const phoneNumber = this.getPhoneNumber(customer) || '';

    const resetData = {
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      addressType: 'Home',
      isDefault: false,
      phoneNumber: phoneNumber,
    };

    form.patchValue(resetData);
    form.markAsPristine();
    form.markAsUntouched();
  }

  prepareFormForModal(form: FormGroup): void {
    if (!form) return;
    form.markAsPristine();
    form.markAsUntouched();
  }

  /**
   * Utility method to extract phone number from customer data
   */
  private getPhoneNumber(customer: CustomerProfileDto | null): string {
    if (!customer) return '';
    const phone = customer.phone || customer.phoneNumber || '';
    console.log('Getting phone number from customer:', phone);
    return phone;
  }

  /**
   * Updates phone requirement - now simplified since phone is always optional in edit form
   */
  updatePhoneValidation(
    form: FormGroup,
    customer: CustomerProfileDto | null
  ): void {
    const phoneControl = form.get('phone');
    if (!phoneControl) return;

    // For edit profile form, phone is always optional but must be valid if provided
    phoneControl.clearValidators();
    phoneControl.setValidators([phoneValidator]);
    phoneControl.updateValueAndValidity();

    console.log('Updated phone validation, current value:', phoneControl.value);
  }

  // Form validation helpers
  isFieldInvalid(formGroup: FormGroup, fieldName: string): boolean {
    const field = formGroup.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(formGroup: FormGroup, fieldName: string): string {
    const field = formGroup.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required'])
        return `${this.getFieldDisplayName(fieldName)} is required`;
      if (field.errors['email']) return 'Please enter a valid email address';
      if (field.errors['minlength'])
        return `${this.getFieldDisplayName(fieldName)} must be at least ${
          field.errors['minlength'].requiredLength
        } characters`;
      if (field.errors['pattern'])
        return `Invalid ${this.getFieldDisplayName(fieldName)} format`;
      if (field.errors['invalidPhone'])
        return 'Please enter a valid phone number';
      if (field.errors['phoneLength'])
        return 'Phone number must be between 7 and 15 digits';
    }
    return '';
  }

  private getFieldDisplayName(fieldName: string): string {
    const fieldNames: { [key: string]: string } = {
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Email',
      phone: 'Phone number',
      phoneNumber: 'Phone number',
      addressLine1: 'Address line 1',
      city: 'City',
      state: 'State',
      zipCode: 'ZIP code',
      country: 'Country',
    };
    return fieldNames[fieldName] || fieldName;
  }

  // Error management
  clearFormErrors(): void {
    this.formErrors = {};
  }

  setFormError(field: string, message: string): void {
    this.formErrors[field] = message;
  }

  hasFormError(key: string): boolean {
    return !!this.formErrors[key];
  }

  getFormError(key: string): string {
    return this.formErrors[key] || '';
  }
}
