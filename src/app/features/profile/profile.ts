// Complete fix for profile.ts

import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  effect,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup } from '@angular/forms';

// Services
import { Router } from '@angular/router';
import { AddressDto } from './address.service';
import { WishlistItem } from '../wishlist/wishlist.service';
import { Order } from '../../core/services/order.service';

// New services
import { FormManagementService } from './form-management.service';
import { ModalManagementService } from './modal-management.service';
import { ProfileDataService } from './profile-data.service';
import { ProfileDisplayService } from './profile-display.service';
import { ToastService } from '../../core/services/toast.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit, OnDestroy, AfterViewInit {
  // Service injections
  private formService = inject(FormManagementService);
  private modalService = inject(ModalManagementService);
  private dataService = inject(ProfileDataService);
  private displayService = inject(ProfileDisplayService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  // Forms - Initialize immediately to prevent template errors
  editProfileForm!: FormGroup;
  addMobileForm!: FormGroup;
  addressForm!: FormGroup;
  dataSettingsForm!: FormGroup;
  preferencesForm!: FormGroup;

  // Track if forms have been initialized with customer data
  private formsInitializedWithData = false;

  // Access data through service
  get currentCustomer() {
    return this.dataService.currentCustomer;
  }
  get addresses() {
    return this.dataService.addresses;
  }
  get defaultAddress() {
    return this.dataService.defaultAddress;
  }
  get isLoadingCustomer() {
    return this.dataService.isLoadingCustomer;
  }
  get isLoadingAddresses() {
    return this.dataService.isLoadingAddresses;
  }
  get wishlistItems() {
    return this.dataService.wishlistItems;
  }
  get wishlistItemCount() {
    return this.dataService.wishlistItemCount;
  }
  get orders() {
    return this.dataService.orders;
  }
  get isLoadingOrders() {
    return this.dataService.isLoadingOrders;
  }

  // Access modal state
  get selectedAddress() {
    return this.modalService.selectedAddress;
  }
  get isEditingAddress() {
    return this.modalService.isEditingAddress;
  }

  // Access form errors
  get formErrors() {
    return this.formService.formErrors;
  }

  // CONSTRUCTOR - Use constructor for effect to ensure proper injection context
  constructor() {
    // Setup the effect in constructor to have proper injection context
    effect(() => {
      const customer = this.currentCustomer();
      console.log('=== CUSTOMER SIGNAL EFFECT ===');
      console.log('Customer signal changed:', customer);
      console.log('Forms initialized flag:', this.formsInitializedWithData);

      if (customer) {
        if (!this.formsInitializedWithData) {
          console.log(
            'Initializing forms with customer data for the first time'
          );
          this.initializeFormsWithCustomerData(customer);
          this.formsInitializedWithData = true;
        } else {
          console.log('Updating existing forms with customer data');
          this.updateAllFormsWithCustomerData(customer);
        }
      } else {
        console.log('No customer data available yet');
      }
    });
  }

  ngOnInit() {
    console.log('=== PROFILE COMPONENT INIT ===');

    // Initialize forms immediately to prevent template errors
    this.initializeEmptyForms();

    // Load data - effect will handle form updates when customer data arrives
    this.loadData();
    this.setupModalCallbacks();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.modalService.initializeBootstrapModals();
    }, 100);
  }

  ngOnDestroy() {
    this.modalService.dispose();
  }

  private initializeEmptyForms() {
    // Create empty forms first to prevent template errors
    console.log('Initializing empty forms...');

    this.editProfileForm = this.formService.createEditProfileForm(null);
    this.addMobileForm = this.formService.createAddMobileForm(null);
    this.addressForm = this.formService.createAddressForm(null);
    this.dataSettingsForm = this.formService.createDataSettingsForm();
    this.preferencesForm = this.formService.createPreferencesForm(null);

    console.log('Empty forms created');
  }

  private loadData() {
    this.dataService.loadCustomerData().subscribe({
      next: (customer) => {
        console.log('Customer data loaded:', customer);
        // Forms will be updated via the effect when customer signal changes
      },
      error: (error) => console.warn('Could not load customer profile:', error),
    });

    this.dataService.loadAddresses().subscribe({
      error: (error) => console.warn('Could not load addresses:', error),
    });

    this.dataService.loadWishlistData();

    const ordersObservable = this.dataService.loadOrdersData();
    if (ordersObservable) {
      ordersObservable.subscribe({
        next: (orders) => {
          console.log('Orders loaded:', orders.length);
        },
        error: (error) => {
          console.warn('Could not load orders:', error);
        },
      });
    }
  }

  private initializeFormsWithCustomerData(customer: any) {
    console.log('=== INITIALIZING FORMS WITH CUSTOMER DATA ===');
    console.log('Customer data received:', customer);

    // Recreate forms with customer data
    this.editProfileForm = this.formService.createEditProfileForm(customer);
    this.addMobileForm = this.formService.createAddMobileForm(customer);
    this.addressForm = this.formService.createAddressForm(customer);
    this.preferencesForm = this.formService.createPreferencesForm(customer);

    console.log(
      'Edit profile form values after initialization:',
      this.editProfileForm.value
    );
    console.log('Forms successfully initialized with customer data');
  }

  private updateAllFormsWithCustomerData(customer: any) {
    console.log('Updating forms with customer data:', customer);

    // Update all forms with the latest customer data
    this.formService.updateFormWithCustomerData(this.editProfileForm, customer);
    this.formService.updateMobileForm(this.addMobileForm, customer);
    this.formService.updatePreferencesForm(this.preferencesForm, customer);

    // Update address form phone field with customer phone
    if (this.addressForm.get('phoneNumber')) {
      const phoneNumber = customer.phone || customer.phoneNumber || '';
      this.addressForm.patchValue({ phoneNumber });
    }

    // Update phone validation based on current status
    this.formService.updatePhoneValidation(this.editProfileForm, customer);
  }

  private setupModalCallbacks() {
    // Override modal service callbacks
    this.modalService.onEditProfileModalShow = () =>
      this.prepareEditProfileForm();
    this.modalService.onMobileModalShow = () => this.prepareMobileForm();
    this.modalService.onEditProfileModalHidden = () => this.resetProfileForm();
    this.modalService.onMobileModalHidden = () => this.resetMobileForm();
    this.modalService.onAddressModalHidden = () => this.resetAddressForm();
    this.modalService.onDataSettingsModalHidden = () =>
      this.resetDataSettingsForm();
    this.modalService.onPreferencesModalHidden = () =>
      this.resetPreferencesForm();
  }

  private prepareEditProfileForm() {
    const customer = this.currentCustomer();
    console.log('=== PREPARING EDIT PROFILE FORM ===');
    console.log('Current customer data:', customer);
    console.log('Form before update:', this.editProfileForm.value);

    if (customer) {
      console.log('Preparing edit profile form with customer data:', customer);
      this.formService.updateFormWithCustomerData(
        this.editProfileForm,
        customer
      );
      this.formService.updatePhoneValidation(this.editProfileForm, customer);
      this.formService.prepareFormForModal(this.editProfileForm);

      console.log('Form after update:', this.editProfileForm.value);
    } else {
      console.warn(
        'No customer data available when preparing edit profile form'
      );
    }
    this.formService.clearFormErrors();
  }

  private prepareMobileForm() {
    const customer = this.currentCustomer();
    if (customer) {
      console.log('Preparing mobile form with customer data:', customer);
      this.formService.updateMobileForm(this.addMobileForm, customer);
      this.formService.prepareFormForModal(this.addMobileForm);
    }
    this.formService.clearFormErrors();
  }

  private resetProfileForm() {
    const customer = this.currentCustomer();
    if (customer) {
      this.formService.updateFormWithCustomerData(
        this.editProfileForm,
        customer
      );
      this.formService.updatePhoneValidation(this.editProfileForm, customer);
    }
    this.formService.clearFormErrors();
  }

  private resetMobileForm() {
    const customer = this.currentCustomer();
    if (customer) {
      this.formService.updateMobileForm(this.addMobileForm, customer);
    }
    this.formService.clearFormErrors();
  }

  private resetAddressForm() {
    console.log('Resetting address form');
    const customer = this.currentCustomer();
    this.formService.resetAddressForm(this.addressForm, customer);
    this.formService.clearFormErrors();
  }

  private resetDataSettingsForm() {
    this.dataSettingsForm.reset();
    this.formService.clearFormErrors();
  }

  private resetPreferencesForm() {
    const customer = this.currentCustomer();
    if (customer) {
      this.formService.updatePreferencesForm(this.preferencesForm, customer);
    }
    this.formService.clearFormErrors();
  }

  // Template getters - delegate to services
  get customerDisplayName(): string {
    return this.displayService.getCustomerDisplayName(this.currentCustomer());
  }

  get customerEmail(): string {
    return this.displayService.getCustomerEmail(this.currentCustomer());
  }

  get customerBirthDate(): string {
    return this.displayService.getCustomerBirthDate(this.currentCustomer());
  }

  get customerPhone(): string {
    return this.displayService.getCustomerPhone(this.currentCustomer());
  }

  get hasAddresses(): boolean {
    return this.dataService.hasAddresses();
  }

  get profileCompletionPercentage(): number {
    return this.dataService.getProfileCompletionPercentage();
  }

  get hasPhoneNumber(): boolean {
    return this.dataService.hasPhoneNumber();
  }

  get hasWishlistItems(): boolean {
    return this.dataService.hasWishlistItems();
  }

  get hasOrders(): boolean {
    return this.dataService.hasOrders();
  }

  get recentWishlistItems(): WishlistItem[] {
    return this.dataService.getRecentWishlistItems();
  }

  get recentOrders(): Order[] {
    return this.dataService.getRecentOrders();
  }

  // Modal management methods
  openEditAddressDialog(address: AddressDto) {
    this.modalService.openEditAddressDialog(address);

    // Prepare form for editing with address data
    const customer = this.currentCustomer();
    this.formService.updateAddressForm(this.addressForm, address, customer);
    this.formService.prepareFormForModal(this.addressForm);
    this.formService.clearFormErrors();
  }

  openAddAddressDialog() {
    this.modalService.openAddAddressDialog();

    // Prepare form for adding new address
    const customer = this.currentCustomer();
    this.formService.resetAddressForm(this.addressForm, customer);

    // Set default values
    this.addressForm.patchValue({
      addressType: 'Home',
      isDefault: !this.hasAddresses,
    });

    this.formService.clearFormErrors();
  }

  // Navigation methods
  onViewAllWishlist() {
    console.log('View all wishlist clicked');
    this.router.navigate(['/wishlist']);
  }

  onViewAllOrders() {
    console.log('View all orders clicked');
    this.router.navigate(['/orders']);
  }

  onViewOrder(orderId: string) {
    console.log('View order clicked:', orderId);
    this.router.navigate(['/orders', orderId]);
  }

  onRemoveFromWishlist(item: WishlistItem) {
    console.log('Remove from wishlist:', item);
    this.dataService.removeFromWishlist(item.id, item.productId).subscribe({
      next: (result) => {
        this.toastService.success('Item removed from wishlist');
        console.log('Item removed from wishlist:', result);
      },
      error: (error) => {
        this.toastService.error('Failed to remove item from wishlist');
        console.error('Failed to remove item from wishlist:', error);
      },
    });
  }

  onLogout() {
    if (confirm('Are you sure you want to log out?')) {
      this.dataService.logout().subscribe({
        next: () => {
          this.toastService.success(' Logged out successfully');

          console.log('Logged out successfully');
        },
        error: (error) => {
          console.error('Logout error:', error);
          this.dataService.logoutLocal();
          this.toastService.error('Error during logout, clearing local data');
        },
      });
    }
  }

  // Form submission methods
  onSaveProfile() {
    this.formService.clearFormErrors();

    if (this.editProfileForm.valid) {
      const formData = this.displayService.prepareProfileDataForSubmission(
        this.editProfileForm.value
      );
      console.log('Submitting profile data:', formData);

      this.dataService.updateCustomerProfile(formData).subscribe({
        next: (updatedCustomer) => {
          this.toastService.success('Profile updated successfully');
          console.log('Profile updated successfully:', updatedCustomer);
          this.modalService.closeEditProfileModal();
        },
        error: (error) => {
          this.toastService.error('Failed to update profile');
          console.error('Failed to update profile - Full error:', error);

          let errorMessage = 'Failed to update profile. Please try again.';
          if (error.status === 400) {
            if (error.error?.errors) {
              const validationErrors = error.error.errors;
              const errorMessages = Object.values(validationErrors).flat();
              errorMessage = errorMessages.join(', ');
            } else if (error.error?.message) {
              errorMessage = error.error.message;
            } else {
              errorMessage = 'Invalid data provided. Please check your input.';
              this.toastService.error(errorMessage);
            }
          } else if (error.status === 401) {
            errorMessage = 'Authentication failed. Please log in again.';
            this.toastService.error(errorMessage);
          } else if (error.status === 422) {
            errorMessage = 'Validation failed. Please check your input fields.';
            this.toastService.error(errorMessage);
          } else if (error.error?.message) {
            errorMessage = error.error.message;
            this.toastService.error(errorMessage);
          }

          this.formService.setFormError('general', errorMessage);
        },
      });
    } else {
      console.log('Form invalid:', this.editProfileForm.errors);
      this.formService.setFormError(
        'general',
        'Please correct the errors below.'
      );
    }
  }

  onSaveMobileNumber() {
    this.formService.clearFormErrors();

    if (this.addMobileForm.valid) {
      const phone = this.displayService.cleanPhoneNumber(
        this.addMobileForm.value.phone
      );
      this.dataService.updatePhone(phone).subscribe({
        next: () => {
          console.log('Phone number updated successfully');
          this.modalService.closeMobileModal();
          this.toastService.success('Phone number updated successfully');
        },
        error: (error) => {
          console.error('Failed to update phone:', error);
          this.formService.setFormError(
            'phone',
            'Failed to update phone number. Please try again.'
          );
          this.toastService.error('Failed to update phone number');
        },
      });
    } else {
      this.formService.setFormError(
        'phone',
        'Please enter a valid phone number.'
      );
      console.log('Mobile form invalid:', this.addMobileForm.errors);
    }
  }

  onSaveAddress() {
    this.formService.clearFormErrors();

    if (this.addressForm.valid) {
      const customer = this.currentCustomer();
      const formValue = this.addressForm.value;

      const addressData = this.displayService.prepareAddressDataForSubmission(
        formValue,
        customer,
        formValue.phoneNumber, // Use the phone number from the form
        true // Address form always has phone field now
      );

      console.log('Submitting address data:', addressData);

      this.dataService.createAddress(addressData as any).subscribe({
        next: (newAddress) => {
          this.toastService.success('Address saved successfully');

          console.log('Address created successfully:', newAddress);
          this.modalService.closeAddressModal();
        },
        error: (error) => {
          this.toastService.error('Failed to create address');
          console.error('Failed to create address - Full error:', error);
          let errorMessage = 'Failed to create address. Please try again.';

          if (error.status === 400) {
            if (error.error?.errors) {
              const validationErrors = error.error.errors;
              const errorMessages = Object.values(validationErrors).flat();
              errorMessage = errorMessages.join(', ');
            } else if (error.error?.message) {
              errorMessage = error.error.message;
              this.toastService.error(errorMessage);
            }
          } else if (error.error?.message) {
            errorMessage = error.error.message;
            this.toastService.error(errorMessage);
          }

          this.formService.setFormError('address', errorMessage);
        },
      });
    } else {
      console.log('Address form invalid:', this.addressForm.errors);
      this.formService.setFormError(
        'address',
        'Please fill in all required fields.'
      );
    }
  }

  onUpdateAddress() {
    this.formService.clearFormErrors();

    if (this.addressForm.valid && this.selectedAddress) {
      const formData = this.addressForm.value;
      const customer = this.currentCustomer();
      const cleanPhone = this.displayService.cleanPhoneNumber(
        formData.phoneNumber
      );

      const updateData = {
        id: this.selectedAddress.id,
        firstName: customer?.firstName || '',
        lastName: customer?.lastName || '',
        company: '',
        street: formData.addressLine1,
        street2: formData.addressLine2 || '',
        city: formData.city,
        state: formData.state,
        postalCode: formData.zipCode,
        country: formData.country,
        phoneNumber: cleanPhone,
        isDefault: formData.isDefault || false,
        addressType: formData.addressType || 'Home',
      };

      console.log('Updating address data:', updateData);

      this.dataService
        .updateAddress(this.selectedAddress.id, updateData as any)
        .subscribe({
          next: (updatedAddress) => {
            console.log('Address updated successfully:', updatedAddress);
            this.modalService.closeAddressModal();
            this.toastService.success('Address updated successfully');
          },
          error: (error) => {
            console.error('Failed to update address - Full error:', error);
            this.toastService.error('Failed to update address');
            let errorMessage = 'Failed to update address. Please try again.';

            if (error.status === 400) {
              if (error.error?.errors) {
                const validationErrors = error.error.errors;
                const errorMessages = Object.values(validationErrors).flat();
                errorMessage = errorMessages.join(', ');
              } else if (error.error?.message) {
                errorMessage = error.error.message;
                this.toastService.error(errorMessage);
              }
            } else if (error.error?.message) {
              errorMessage = error.error.message;
              this.toastService.error(errorMessage);
            }

            this.formService.setFormError('address', errorMessage);
          },
        });
    } else {
      console.log('Address form invalid:', this.addressForm.errors);
      this.formService.setFormError(
        'address',
        'Please fill in all required fields.'
      );
    }
  }

  onSetDefaultAddress(address: AddressDto) {
    if (!address.isDefault) {
      this.dataService.setDefaultAddress(address.id).subscribe({
        next: () => {
          console.log('Default address updated successfully');
          this.toastService.success('Default address updated successfully');
        },
        error: (error) => {
          console.error('Failed to set default address:', error);
          this.toastService.error('Failed to set default address');
        },
      });
    }
  }

  onDeleteAddress(address: AddressDto) {
    {
      this.dataService.deleteAddress(address.id).subscribe({
        next: () => {
          console.log('Address deleted successfully');
          this.toastService.success('Address deleted successfully');
        },
        error: (error) => {
          console.error('Failed to delete address:', error);
          this.toastService.error('Failed to delete address');
        },
      });
    }
  }

  // Utility methods - delegate to services
  formatPrice(price: number, currency: string = 'EUR'): string {
    return this.displayService.formatPrice(price, currency);
  }

  formatOrderDate(dateString: string): string {
    return this.displayService.formatOrderDate(dateString);
  }

  getOrderStatusClass(status: string): string {
    return this.displayService.getOrderStatusClass(status);
  }

  truncateText(text: string, maxLength: number = 30): string {
    return this.displayService.truncateText(text, maxLength);
  }

  getAddressSummary(address: AddressDto): string {
    return this.dataService.getAddressSummary(address);
  }

  getFullAddress(address: AddressDto): string {
    return this.dataService.getFullAddress(address);
  }

  isFieldInvalid(formGroup: FormGroup, fieldName: string): boolean {
    return this.formService.isFieldInvalid(formGroup, fieldName);
  }

  getFieldError(formGroup: FormGroup, fieldName: string): string {
    return this.formService.getFieldError(formGroup, fieldName);
  }

  hasFormError(key: string): boolean {
    return this.formService.hasFormError(key);
  }

  getFormError(key: string): string {
    return this.formService.getFormError(key);
  }

  formatPhoneForDisplay(phone: string): string {
    return this.displayService.formatPhoneForDisplay(phone);
  }
}
