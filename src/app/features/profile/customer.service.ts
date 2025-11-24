// services/customer.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service.ts.service';

// Customer DTOs and Models
export interface PublicCustomerInfoDto {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  initialsOnly?: string;
}
export interface CustomerProfileDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: number;
  preferredLanguage?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  userName: string;
  phoneNumber?: string;
}

export interface CustomerUpdateDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: number;
  preferredLanguage?: string;
}

export interface CustomerInfoDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  fullName: string;
}

export interface CustomerSummaryDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  memberSince: Date;
  totalOrders: number;
  totalAddresses: number;
  totalReviews: number;
  totalWishlistItems: number;
  isActive: boolean;
}

export interface UpdateEmailDto {
  email: string;
}

export interface UpdatePhoneDto {
  phone: string;
}

export interface UpdateNameDto {
  firstName: string;
  lastName: string;
}

export interface CustomerApiResponse<T> {
  customer?: T;
  message?: string;
  errors?: string[];
}

export interface CustomerSummaryApiResponse {
  summary: CustomerSummaryDto;
}

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private api = inject(ApiService);
  private readonly baseEndpoint = 'customer';

  // Reactive state management
  private currentCustomerSubject =
    new BehaviorSubject<CustomerProfileDto | null>(null);
  public currentCustomer$ = this.currentCustomerSubject.asObservable();

  // Signals for modern Angular approach
  currentCustomer = signal<CustomerProfileDto | null>(null);
  customerSummary = signal<CustomerSummaryDto | null>(null);
  isLoadingCustomer = signal<boolean>(false);

  constructor() {
    this.loadCustomerProfile();
  }

  /**
   * Get current customer's profile data
   */
  getCustomerProfile(): Observable<CustomerProfileDto> {
    this.isLoadingCustomer.set(true);

    return this.api
      .get<CustomerApiResponse<CustomerProfileDto>>(
        `${this.baseEndpoint}/profile`
      )
      .pipe(
        map((response) => response.customer!),
        tap((customer) => this.updateCustomerState(customer)),
        tap(() => this.isLoadingCustomer.set(false)),
        catchError((error) => {
          this.isLoadingCustomer.set(false);
          throw error;
        })
      );
  }

  /**
   * Update customer profile data
   */
  updateCustomerProfile(
    updateData: CustomerUpdateDto
  ): Observable<CustomerProfileDto> {
    this.isLoadingCustomer.set(true);

    return this.api
      .put<CustomerApiResponse<CustomerProfileDto>>(
        `${this.baseEndpoint}/profile`,
        updateData
      )
      .pipe(
        map((response) => response.customer!),
        tap((customer) => this.updateCustomerState(customer)),
        tap(() => this.isLoadingCustomer.set(false)),
        catchError((error) => {
          this.isLoadingCustomer.set(false);
          throw error;
        })
      );
  }

  /**
   * Get basic customer info (minimal data)
   */
  getCustomerInfo(): Observable<CustomerInfoDto> {
    return this.api
      .get<CustomerApiResponse<CustomerInfoDto>>(`${this.baseEndpoint}/info`)
      .pipe(map((response) => response.customer!));
  }

  /**
   * Update customer's email
   */
  updateEmail(email: string): Observable<{ message: string; email: string }> {
    const updateData: UpdateEmailDto = { email };

    return this.api
      .patch<{ message: string; email: string }>(
        `${this.baseEndpoint}/email`,
        updateData
      )
      .pipe(
        tap(() => {
          // Update the current customer's email in state
          const currentCustomer = this.currentCustomer();
          if (currentCustomer) {
            const updatedCustomer = {
              ...currentCustomer,
              email,
              userName: email,
            };
            this.updateCustomerState(updatedCustomer);
          }
        })
      );
  }

  /**
   * Update customer's phone number
   */
  updatePhone(phone: string): Observable<{ message: string; phone: string }> {
    const updateData: UpdatePhoneDto = { phone };

    return this.api
      .patch<{ message: string; phone: string }>(
        `${this.baseEndpoint}/phone`,
        updateData
      )
      .pipe(
        tap(() => {
          // Update the current customer's phone in state
          const currentCustomer = this.currentCustomer();
          if (currentCustomer) {
            const updatedCustomer = {
              ...currentCustomer,
              phone,
              phoneNumber: phone,
            };
            this.updateCustomerState(updatedCustomer);
          }
        })
      );
  }

  /**
   * Update customer's name (first and last name)
   */
  updateName(
    firstName: string,
    lastName: string
  ): Observable<{
    message: string;
    firstName: string;
    lastName: string;
    fullName: string;
  }> {
    const updateData: UpdateNameDto = { firstName, lastName };

    return this.api
      .patch<{
        message: string;
        firstName: string;
        lastName: string;
        fullName: string;
      }>(`${this.baseEndpoint}/name`, updateData)
      .pipe(
        tap(() => {
          // Update the current customer's name in state
          const currentCustomer = this.currentCustomer();
          if (currentCustomer) {
            const updatedCustomer = { ...currentCustomer, firstName, lastName };
            this.updateCustomerState(updatedCustomer);
          }
        })
      );
  }

  /**
   * Delete customer account (soft delete)
   */
  deleteAccount(): Observable<{ message: string }> {
    return this.api
      .delete<{ message: string }>(`${this.baseEndpoint}/account`)
      .pipe(
        tap(() => {
          // Clear customer state after account deletion
          this.clearCustomerState();
        })
      );
  }

  /**
   * Get customer statistics/summary
   */
  getCustomerSummary(): Observable<CustomerSummaryDto> {
    return this.api
      .get<CustomerSummaryApiResponse>(`${this.baseEndpoint}/summary`)
      .pipe(
        map((response) => response.summary),
        tap((summary) => this.customerSummary.set(summary))
      );
  }

  /**
   * Refresh customer profile from server
   */
  refreshCustomerProfile(): Observable<CustomerProfileDto> {
    return this.getCustomerProfile();
  }

  /**
   * Get customer display name
   */
  getCustomerDisplayName(): string {
    const customer = this.currentCustomer();
    if (!customer) return '';
    return (
      `${customer.firstName} ${customer.lastName}`.trim() || customer.email
    );
  }

  /**
   * Get customer initials for avatar
   */
  getCustomerInitials(): string {
    const customer = this.currentCustomer();
    if (!customer) return '';
    const firstName = customer.firstName?.charAt(0) || '';
    const lastName = customer.lastName?.charAt(0) || '';
    return (
      `${firstName}${lastName}`.toUpperCase() ||
      customer.email.charAt(0).toUpperCase()
    );
  }

  /**
   * Check if customer profile is complete
   */
  isProfileComplete(): boolean {
    const customer = this.currentCustomer();
    if (!customer) return false;

    return !!(
      customer.firstName &&
      customer.lastName &&
      customer.email &&
      customer.phone
    );
  }

  /**
   * Get profile completion percentage
   */
  getProfileCompletionPercentage(): number {
    const customer = this.currentCustomer();
    if (!customer) return 0;

    const fields = [
      customer.firstName,
      customer.lastName,
      customer.email,
      customer.phone,
      customer.dateOfBirth,
      customer.gender,
      customer.preferredLanguage,
    ];

    const completedFields = fields.filter(
      (field) => field !== null && field !== undefined && field !== ''
    ).length;
    return Math.round((completedFields / fields.length) * 100);
  }

  /**
   * Get missing profile fields
   */
  getMissingProfileFields(): string[] {
    const customer = this.currentCustomer();
    if (!customer) return ['All fields'];

    const missingFields: string[] = [];

    if (!customer.firstName) missingFields.push('First Name');
    if (!customer.lastName) missingFields.push('Last Name');
    if (!customer.email) missingFields.push('Email');
    if (!customer.phone) missingFields.push('Phone');
    if (!customer.dateOfBirth) missingFields.push('Date of Birth');
    if (customer.gender === null || customer.gender === undefined)
      missingFields.push('Gender');
    if (!customer.preferredLanguage) missingFields.push('Preferred Language');

    return missingFields;
  }

  // Private helper methods
  private updateCustomerState(customer: CustomerProfileDto): void {
    this.currentCustomer.set(customer);
    this.currentCustomerSubject.next(customer);
  }

  private clearCustomerState(): void {
    this.currentCustomer.set(null);
    this.currentCustomerSubject.next(null);
    this.customerSummary.set(null);
  }

  private loadCustomerProfile(): void {
    // Only load if we have a valid token and no current customer
    if (!this.currentCustomer()) {
      this.getCustomerProfile().subscribe({
        next: () => {
          // Profile loaded successfully
        },
        error: (error) => {
          console.warn('Could not load customer profile:', error);
        },
      });
    }
  }

  /**
   * Get customer info by user ID (for displaying in reviews, etc.)
   * Returns limited public information
   */
  getCustomerInfoById(userId: string): Observable<PublicCustomerInfoDto> {
    return this.api
      .get<{ customer: PublicCustomerInfoDto }>(
        `${this.baseEndpoint}/info/${userId}`
      )
      .pipe(map((response) => response.customer));
  }

  /**
   * Get multiple customers' info by user IDs (batch request)
   * Returns limited public information for all requested users
   */
  getCustomersInfoByIds(
    userIds: string[]
  ): Observable<PublicCustomerInfoDto[]> {
    const requestBody = { userIds };
    return this.api
      .post<{ customers: PublicCustomerInfoDto[] }>(
        `${this.baseEndpoint}/info/batch`,
        requestBody
      )
      .pipe(map((response) => response.customers));
  }

  /**
   * Get customer display name from PublicCustomerInfoDto
   */
  static getDisplayName(
    customer: PublicCustomerInfoDto | null | undefined
  ): string {
    if (!customer) return '';
    return (
      customer.fullName ||
      `${customer.firstName} ${customer.lastName}`.trim() ||
      'Anonymous'
    );
  }

  /**
   * Get customer initials from PublicCustomerInfoDto
   */
  static getInitials(
    customer: PublicCustomerInfoDto | null | undefined
  ): string {
    if (!customer) return 'A';

    if (customer.initialsOnly) {
      return customer.initialsOnly;
    }

    const firstName = customer.firstName?.charAt(0) || '';
    const lastName = customer.lastName?.charAt(0) || '';
    return `${firstName}${lastName}`.toUpperCase() || 'A';
  }
}
