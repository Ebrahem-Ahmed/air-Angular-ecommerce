// services/address.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service.ts.service';

// Address DTOs and Models
export interface AddressDto {
  id: string;
  userId: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  addressType?: string;
  isDefault: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  phoneNumber?: string;
}

export interface AddressCreateDto {
  userId?: string; // Will be set automatically by the service
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  addressType?: string;
  isDefault?: boolean;
}

export interface AddressUpdateDto {
  id: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  addressType?: string;
  isDefault?: boolean;
}

export interface AddressListResponse {
  addresses: AddressDto[];
  hasAddresses: boolean;
  defaultAddress?: AddressDto;
  message?: string;
}

export interface AddressResponse {
  address: AddressDto;
  message?: string;
}

export interface AddressApiResponse {
  address?: AddressDto;
  addresses?: AddressDto[];
  hasAddresses?: boolean;
  defaultAddress?: AddressDto;
  message?: string;
  errors?: string[];
}

export interface AddressTypeCount {
  type: string;
  count: number;
}

@Injectable({ providedIn: 'root' })
export class AddressService {
  private api = inject(ApiService);
  private readonly baseEndpoint = 'addresse'; // Note: matches your controller route

  // Reactive state management
  private addressesSubject = new BehaviorSubject<AddressDto[]>([]);
  public addresses$ = this.addressesSubject.asObservable();

  private defaultAddressSubject = new BehaviorSubject<AddressDto | null>(null);
  public defaultAddress$ = this.defaultAddressSubject.asObservable();

  // Signals for modern Angular approach
  addresses = signal<AddressDto[]>([]);
  defaultAddress = signal<AddressDto | null>(null);
  hasAddresses = signal<boolean>(false);
  isLoadingAddresses = signal<boolean>(false);

  constructor() {
    this.loadUserAddresses();
  }

  /**
   * Get all addresses for the current user
   */
  getUserAddresses(): Observable<AddressDto[]> {
    this.isLoadingAddresses.set(true);

    return this.api.get<AddressListResponse>(this.baseEndpoint).pipe(
      map((response) => response.addresses),
      tap((addresses) => this.updateAddressesState(addresses)),
      tap(() => this.isLoadingAddresses.set(false)),
      catchError((error) => {
        this.isLoadingAddresses.set(false);
        throw error;
      })
    );
  }

  /**
   * Get the default address for the current user
   */
  getDefaultAddress(): Observable<AddressDto | null> {
    return this.api.get<AddressResponse>(`${this.baseEndpoint}/default`).pipe(
      map((response) => response.address),
      tap((address) => this.updateDefaultAddressState(address)),
      catchError((error) => {
        // If no default address found, return null instead of throwing
        if (error.status === 404) {
          this.updateDefaultAddressState(null);
          return [null];
        }
        throw error;
      })
    );
  }

  /**
   * Create a new address
   */
  createAddress(addressData: AddressCreateDto): Observable<AddressDto> {
    this.isLoadingAddresses.set(true);

    return this.api.post<AddressResponse>(this.baseEndpoint, addressData).pipe(
      map((response) => response.address),
      tap((newAddress) => {
        const currentAddresses = this.addresses();
        this.updateAddressesState([...currentAddresses, newAddress]);

        // If this is set as default, update default address
        if (newAddress.isDefault) {
          this.updateDefaultAddressState(newAddress);
        }
      }),
      tap(() => this.isLoadingAddresses.set(false)),
      catchError((error) => {
        this.isLoadingAddresses.set(false);
        throw error;
      })
    );
  }

  /**
   * Add an alternative address (non-default)
   */
  addAlternativeAddress(addressData: AddressCreateDto): Observable<AddressDto> {
    this.isLoadingAddresses.set(true);

    // Ensure it's not set as default
    const alternativeAddressData = { ...addressData, isDefault: false };

    return this.api
      .post<AddressResponse>(
        `${this.baseEndpoint}/alternative`,
        alternativeAddressData
      )
      .pipe(
        map((response) => response.address),
        tap((newAddress) => {
          const currentAddresses = this.addresses();
          this.updateAddressesState([...currentAddresses, newAddress]);
        }),
        tap(() => this.isLoadingAddresses.set(false)),
        catchError((error) => {
          this.isLoadingAddresses.set(false);
          throw error;
        })
      );
  }

  /**
   * Update an existing address
   */
  updateAddress(
    addressId: string,
    updateData: Partial<AddressUpdateDto>
  ): Observable<AddressDto> {
    const fullUpdateData: AddressUpdateDto = { id: addressId, ...updateData };

    return this.api
      .put<AddressResponse>(`${this.baseEndpoint}/${addressId}`, fullUpdateData)
      .pipe(
        map((response) => response.address),
        tap((updatedAddress) => {
          const currentAddresses = this.addresses();
          const updatedAddresses = currentAddresses.map((addr) =>
            addr.id === addressId ? updatedAddress : addr
          );
          this.updateAddressesState(updatedAddresses);

          // If this address is now set as default, update default address
          if (updatedAddress.isDefault) {
            this.updateDefaultAddressState(updatedAddress);
          }
        })
      );
  }

  /**
   * Set an address as the default address
   */
  setDefaultAddress(addressId: string): Observable<AddressDto> {
    return this.api
      .patch<AddressResponse>(
        `${this.baseEndpoint}/${addressId}/set-default`,
        {}
      )
      .pipe(
        map((response) => response.address),
        tap((defaultAddress) => {
          // Update all addresses to reflect the new default status
          const currentAddresses = this.addresses();
          const updatedAddresses = currentAddresses.map((addr) => ({
            ...addr,
            isDefault: addr.id === addressId,
          }));
          this.updateAddressesState(updatedAddresses);
          this.updateDefaultAddressState(defaultAddress);
        })
      );
  }

  /**
   * Get a specific address by ID
   */
  getAddressById(addressId: string): Observable<AddressDto> {
    return this.api
      .get<AddressResponse>(`${this.baseEndpoint}/${addressId}`)
      .pipe(map((response) => response.address));
  }

  /**
   * Delete an address (soft delete)
   */
  deleteAddress(addressId: string): Observable<{ message: string }> {
    return this.api
      .delete<{ message: string }>(`${this.baseEndpoint}/${addressId}`)
      .pipe(
        tap(() => {
          const currentAddresses = this.addresses();
          const updatedAddresses = currentAddresses.filter(
            (addr) => addr.id !== addressId
          );
          this.updateAddressesState(updatedAddresses);

          // If the deleted address was the default, clear default address
          const currentDefault = this.defaultAddress();
          if (currentDefault && currentDefault.id === addressId) {
            this.updateDefaultAddressState(null);
          }
        })
      );
  }

  /**
   * Get addresses by type
   */
  getAddressesByType(type: string): Observable<AddressDto[]> {
    return this.api
      .get<AddressApiResponse>(`${this.baseEndpoint}/by-type/${type}`)
      .pipe(map((response) => response.addresses || []));
  }

  /**
   * Refresh addresses from server
   */
  refreshAddresses(): Observable<AddressDto[]> {
    return this.getUserAddresses();
  }

  /**
   * Get addresses count by type
   */
  getAddressTypesCounts(): AddressTypeCount[] {
    const addresses = this.addresses();
    const typeCounts: { [key: string]: number } = {};

    addresses.forEach((address) => {
      const type = address.addressType || 'Unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    return Object.entries(typeCounts).map(([type, count]) => ({
      type,
      count,
    }));
  }

  /**
   * Get address summary for display
   */
  getAddressSummary(address: AddressDto): string {
    const parts = [
      address.addressLine1,
      address.city,
      address.state,
      address.zipCode,
    ].filter((part) => part && part.trim() !== '');

    return parts.join(', ');
  }

  /**
   * Get full address for display
   */
  getFullAddress(address: AddressDto): string {
    const parts = [
      address.addressLine1,
      address.addressLine2,
      address.city,
      address.state,
      address.zipCode,
      address.country,
    ].filter((part) => part && part.trim() !== '');

    return parts.join(', ');
  }

  /**
   * Check if user has addresses
   */
  hasUserAddresses(): boolean {
    return this.hasAddresses();
  }

  /**
   * Check if user has a default address
   */
  hasDefaultAddress(): boolean {
    return this.defaultAddress() !== null;
  }

  /**
   * Get addresses count
   */
  getAddressesCount(): number {
    return this.addresses().length;
  }

  /**
   * Find addresses by partial match
   */
  searchAddresses(searchTerm: string): AddressDto[] {
    const addresses = this.addresses();
    const term = searchTerm.toLowerCase();

    return addresses.filter(
      (address) =>
        address.addressLine1.toLowerCase().includes(term) ||
        address.city.toLowerCase().includes(term) ||
        address.state.toLowerCase().includes(term) ||
        address.zipCode.toLowerCase().includes(term) ||
        address.addressType?.toLowerCase().includes(term) ||
        address.addressLine2?.toLowerCase().includes(term)
    );
  }

  /**
   * Validate address data
   */
  validateAddressData(addressData: Partial<AddressCreateDto>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!addressData.addressLine1?.trim()) {
      errors.push('Address Line 1 is required');
    }

    if (!addressData.city?.trim()) {
      errors.push('City is required');
    }

    if (!addressData.state?.trim()) {
      errors.push('State is required');
    }

    if (!addressData.zipCode?.trim()) {
      errors.push('ZIP Code is required');
    }

    if (!addressData.country?.trim()) {
      errors.push('Country is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Private helper methods
  private updateAddressesState(addresses: AddressDto[]): void {
    this.addresses.set(addresses);
    this.addressesSubject.next(addresses);
    this.hasAddresses.set(addresses.length > 0);

    // Update default address if it exists in the list
    const defaultAddr = addresses.find((addr) => addr.isDefault);
    if (defaultAddr) {
      this.updateDefaultAddressState(defaultAddr);
    }
  }

  private updateDefaultAddressState(address: AddressDto | null): void {
    this.defaultAddress.set(address);
    this.defaultAddressSubject.next(address);
  }

  private loadUserAddresses(): void {
    // Only load if we don't have addresses already
    if (this.addresses().length === 0) {
      this.getUserAddresses().subscribe({
        next: () => {
          // Addresses loaded successfully
        },
        error: (error) => {
          console.warn('Could not load user addresses:', error);
        },
      });
    }
  }
}
