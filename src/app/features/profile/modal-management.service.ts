import { Injectable } from '@angular/core';
import { AddressDto } from './address.service';

// Bootstrap Modal declaration
declare var bootstrap: any;

@Injectable({
  providedIn: 'root'
})
export class ModalManagementService {
  // Modal instances
  private editProfileModal: any;
  private addMobileModal: any;
  private addressModal: any;
  private dataSettingsModal: any;
  private preferencesModal: any;

  // Modal state
  selectedAddress: AddressDto | null = null;
  isEditingAddress = false;

  initializeBootstrapModals(): void {
    try {
      const editProfileModalEl = document.getElementById('editProfileModal');
      const addMobileModalEl = document.getElementById('addMobileModal');
      const addressModalEl = document.getElementById('addressModal');
      const dataSettingsModalEl = document.getElementById('dataSettingsModal');
      const preferencesModalEl = document.getElementById('preferencesModal');

      if (editProfileModalEl)
        this.editProfileModal = new bootstrap.Modal(editProfileModalEl);
      if (addMobileModalEl)
        this.addMobileModal = new bootstrap.Modal(addMobileModalEl);
      if (addressModalEl)
        this.addressModal = new bootstrap.Modal(addressModalEl);
      if (dataSettingsModalEl)
        this.dataSettingsModal = new bootstrap.Modal(dataSettingsModalEl);
      if (preferencesModalEl)
        this.preferencesModal = new bootstrap.Modal(preferencesModalEl);

      this.setupModalEventListeners();
    } catch (error) {
      console.warn('Bootstrap not available, modals will not work:', error);
    }
  }

  private setupModalEventListeners(): void {
    // Setup event listeners for when modals are about to be shown
    document
      .getElementById('editProfileModal')
      ?.addEventListener('show.bs.modal', () => {
        // Emit event or callback for preparing edit profile form
        this.onEditProfileModalShow();
      });

    document
      .getElementById('addMobileModal')
      ?.addEventListener('show.bs.modal', () => {
        // Emit event or callback for preparing mobile form
        this.onMobileModalShow();
      });

    // Reset forms when modals are hidden
    document
      .getElementById('editProfileModal')
      ?.addEventListener('hidden.bs.modal', () => {
        this.onEditProfileModalHidden();
      });

    document
      .getElementById('addMobileModal')
      ?.addEventListener('hidden.bs.modal', () => {
        this.onMobileModalHidden();
      });

    document
      .getElementById('addressModal')
      ?.addEventListener('hidden.bs.modal', () => {
        this.onAddressModalHidden();
      });

    document
      .getElementById('dataSettingsModal')
      ?.addEventListener('hidden.bs.modal', () => {
        this.onDataSettingsModalHidden();
      });

    document
      .getElementById('preferencesModal')
      ?.addEventListener('hidden.bs.modal', () => {
        this.onPreferencesModalHidden();
      });
  }

  // Modal event callbacks - these can be overridden or use observables
  onEditProfileModalShow(): void {
    // Override this in component or use observable
  }

  onMobileModalShow(): void {
    // Override this in component or use observable
  }

  onEditProfileModalHidden(): void {
    // Override this in component or use observable
  }

  onMobileModalHidden(): void {
    // Override this in component or use observable
  }

  onAddressModalHidden(): void {
    // Override this in component or use observable
  }

  onDataSettingsModalHidden(): void {
    // Override this in component or use observable
  }

  onPreferencesModalHidden(): void {
    // Override this in component or use observable
  }

  // Modal management methods
  openEditAddressDialog(address: AddressDto): void {
    console.log('Opening edit address dialog with:', address);
    this.selectedAddress = address;
    this.isEditingAddress = true;
    this.addressModal?.show();
  }

  openAddAddressDialog(): void {
    console.log('Opening add address dialog');
    this.selectedAddress = null;
    this.isEditingAddress = false;
    this.addressModal?.show();
  }

  closeModal(modal: any): void {
    try {
      modal?.hide();
    } catch (error) {
      console.warn('Could not close modal:', error);
    }
  }

  closeEditProfileModal(): void {
    this.closeModal(this.editProfileModal);
  }

  closeMobileModal(): void {
    this.closeModal(this.addMobileModal);
  }

  closeAddressModal(): void {
    this.closeModal(this.addressModal);
  }

  closeDataSettingsModal(): void {
    this.closeModal(this.dataSettingsModal);
  }

  closePreferencesModal(): void {
    this.closeModal(this.preferencesModal);
  }

  // Cleanup
  dispose(): void {
    this.editProfileModal?.dispose();
    this.addMobileModal?.dispose();
    this.addressModal?.dispose();
    this.dataSettingsModal?.dispose();
    this.preferencesModal?.dispose();
  }
}
