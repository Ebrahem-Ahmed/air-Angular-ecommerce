// services/paymentpaypal.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service.ts.service';
import { AuthService } from '../../core/services/auth.service.ts.service';
import { CartService, CartItem } from '../../features/cart/cart.service';

// Legacy interfaces for backward compatibility
export interface CheckoutData {
  billingAddress: BillingAddress;
  shippingAddress?: ShippingAddress;
  sameAsbilling: boolean;
  shippingMethod: string;
  paymentMethod: PaymentMethod;
  orderSummary: OrderSummary;
}

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

export interface OrderSummary {
  items: CartItem[];
  itemsTotal: number;
  shipping: number;
  total: number;
  currency: string;
}

export enum PaymentMethod {
  PAYPAL = 'PayPal',
  CASH_ON_DELIVERY = 'Cash on Delivery',
  CREDIT_CARD = 'Credit Card',
}

export interface PayPalPaymentData {
  amount: number;
  currency: string;
  description: string;
  orderId?: string;
  returnUrl: string;
  cancelUrl: string;
  billingAddress: BillingAddress;
  shippingAddress?: ShippingAddress;
}

export interface PayPalCreateResponse {
  isSuccess: boolean;
  message?: string;
  data?: {
    paymentId: string;
    approvalUrl: string;
    orderId: string;
  };
}

export interface PayPalExecuteRequest {
  paymentId: string;
  payerId: string;
}

export interface PayPalExecuteResponse {
  isSuccess: boolean;
  message?: string;
  data?: {
    id: string;
    transactionId: string;
    orderId: string;
    amount: number;
    currency: string;
    status: string;
  };
}

export interface PaymentData {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  billingAddress: BillingAddress;
  shippingAddress?: ShippingAddress;
}

export interface PaymentProcessResponse {
  isSuccess: boolean;
  message?: string;
  data?: {
    id: string;
    orderId: string;
    paymentStatus: string;
    transactionId?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private api = inject(ApiService);
  private authService = inject(AuthService);
  private cartService = inject(CartService);

  // State management
  private checkoutDataSubject = new BehaviorSubject<CheckoutData | null>(null);
  private orderSummarySubject = new BehaviorSubject<OrderSummary | null>(null);

  public checkoutData$ = this.checkoutDataSubject.asObservable();
  public orderSummary$ = this.orderSummarySubject.asObservable();

  // Signals
  private isProcessingSignal = signal<boolean>(false);
  public isProcessing = this.isProcessingSignal.asReadonly();

  constructor() {}

  /**
   * Calculate order totals from cart items
   */
  calculateOrderTotals(items: CartItem[]): OrderSummary {
    const itemsTotal = items.reduce(
      (total, item) => total + (item.totalPrice || 0),
      0
    );
    const shipping = 0; // Free shipping
    const total = itemsTotal + shipping;

    return {
      items,
      itemsTotal,
      shipping,
      total,
      currency: 'EGP', // Default currency
    };
  }

  /**
   * Update order summary
   */
  updateOrderSummary(summary: OrderSummary): void {
    this.orderSummarySubject.next(summary);
  }

  /**
   * Get current checkout data
   */
  getCurrentCheckoutData(): CheckoutData | null {
    return this.checkoutDataSubject.getValue();
  }

  /**
   * Save checkout data
   */
  saveCheckoutData(data: CheckoutData): void {
    this.checkoutDataSubject.next(data);
    // Optionally save to localStorage for persistence
    try {
      localStorage.setItem('checkout_data', JSON.stringify(data));
    } catch (error) {
      console.warn('Could not save checkout data to localStorage:', error);
    }
  }

  /**
   * Load checkout data from storage
   */
  loadCheckoutData(): CheckoutData | null {
    try {
      const saved = localStorage.getItem('checkout_data');
      if (saved) {
        const data = JSON.parse(saved);
        this.checkoutDataSubject.next(data);
        return data;
      }
    } catch (error) {
      console.warn('Could not load checkout data from localStorage:', error);
    }
    return null;
  }

  /**
   * Clear checkout data
   */
  clearCheckoutData(): void {
    this.checkoutDataSubject.next(null);
    localStorage.removeItem('checkout_data');
  }

  /**
   * Validate checkout data
   */
  validateCheckoutData(data: CheckoutData): string[] {
    const errors: string[] = [];

    // Validate billing address
    if (!data.billingAddress) {
      errors.push('Billing address is required');
    } else {
      const billing = data.billingAddress;
      if (!billing.firstName?.trim()) errors.push('First name is required');
      if (!billing.lastName?.trim()) errors.push('Last name is required');
      if (!billing.email?.trim()) errors.push('Email is required');
      if (!billing.addressLine1?.trim())
        errors.push('Address line 1 is required');
      if (!billing.city?.trim()) errors.push('City is required');
      if (!billing.country?.trim()) errors.push('Country is required');
      if (!billing.phone?.trim()) errors.push('Phone number is required');

      // Validate email format
      if (billing.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billing.email)) {
        errors.push('Invalid email format');
      }
    }

    // Validate shipping address if different from billing
    if (!data.sameAsbilling && data.shippingAddress) {
      const shipping = data.shippingAddress;
      if (!shipping.recipientName?.trim())
        errors.push('Recipient name is required');
      if (!shipping.line1?.trim())
        errors.push('Shipping address line 1 is required');
      if (!shipping.city?.trim()) errors.push('Shipping city is required');
    }

    // Validate payment method
    if (!data.paymentMethod) {
      errors.push('Payment method is required');
    }

    // Validate order summary
    if (
      !data.orderSummary ||
      !data.orderSummary.items ||
      data.orderSummary.items.length === 0
    ) {
      errors.push('Order must contain at least one item');
    }

    return errors;
  }

  /**
   * Prepare PayPal payment data
   */
  preparePayPalPaymentData(checkoutData: CheckoutData): PayPalPaymentData {
    const baseUrl = window.location.origin;

    return {
      amount: checkoutData.orderSummary.total,
      currency: checkoutData.orderSummary.currency || 'USD',
      description: `Order for ${checkoutData.orderSummary.items.length} items`,
      returnUrl: `${baseUrl}/payment/success`,
      cancelUrl: `${baseUrl}/payment/failed`,
      billingAddress: checkoutData.billingAddress,
      shippingAddress: checkoutData.sameAsbilling
        ? undefined
        : checkoutData.shippingAddress,
    };
  }

  /**
   * Prepare payment data for other methods
   */
  preparePaymentData(
    checkoutData: CheckoutData,
    paymentMethod: PaymentMethod
  ): PaymentData {
    return {
      orderId: '', // Will be set by backend
      amount: checkoutData.orderSummary.total,
      currency: checkoutData.orderSummary.currency || 'USD',
      paymentMethod,
      billingAddress: checkoutData.billingAddress,
      shippingAddress: checkoutData.sameAsbilling
        ? undefined
        : checkoutData.shippingAddress,
    };
  }

  /**
   * Create PayPal payment
   */
  createPayPalPayment(
    paymentData: PayPalPaymentData
  ): Observable<PayPalCreateResponse> {
    this.isProcessingSignal.set(true);

    return this.api
      .post<PayPalCreateResponse>('payment/paypal/create', paymentData)
      .pipe(
        tap(() => this.isProcessingSignal.set(false)),
        catchError((error) => {
          this.isProcessingSignal.set(false);
          return this.handleError(error);
        })
      );
  }

  /**
   * Execute PayPal payment
   */
  executePayPalPayment(
    executeData: PayPalExecuteRequest
  ): Observable<PayPalExecuteResponse> {
    this.isProcessingSignal.set(true);

    return this.api
      .post<PayPalExecuteResponse>('payment/paypal/execute', executeData)
      .pipe(
        tap(() => this.isProcessingSignal.set(false)),
        catchError((error) => {
          this.isProcessingSignal.set(false);
          return this.handleError(error);
        })
      );
  }

  /**
   * Process payment (for non-PayPal methods)
   */
  processPayment(paymentData: PaymentData): Observable<PaymentProcessResponse> {
    this.isProcessingSignal.set(true);

    return this.api
      .post<PaymentProcessResponse>('payment/process', paymentData)
      .pipe(
        tap(() => this.isProcessingSignal.set(false)),
        catchError((error) => {
          this.isProcessingSignal.set(false);
          return this.handleError(error);
        })
      );
  }

  /**
   * Redirect to PayPal
   */
  redirectToPayPal(approvalUrl: string): void {
    window.location.href = approvalUrl;
  }

  /**
   * Handle payment success
   */
  handlePaymentSuccess(paymentId: string, transactionId?: string): void {
    console.log('Payment successful:', { paymentId, transactionId });

    // Clear checkout data after successful payment
    this.clearCheckoutData();

    // Clear cart
    this.cartService.clearCart().subscribe({
      next: () => console.log('Cart cleared after successful payment'),
      error: (error) => console.error('Failed to clear cart:', error),
    });
  }

  /**
   * Handle payment failure
   */
  handlePaymentFailure(error: string): void {
    console.error('Payment failed:', error);
    this.isProcessingSignal.set(false);
  }

  /**
   * Error handler
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred while processing payment';

    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.status) {
      switch (error.status) {
        case 400:
          errorMessage =
            'Invalid payment data. Please check your information and try again.';
          break;
        case 401:
          errorMessage =
            'Authentication required. Please log in and try again.';
          break;
        case 403:
          errorMessage = 'Payment not authorized. Please contact support.';
          break;
        case 404:
          errorMessage = 'Payment service not found.';
          break;
        case 422:
          errorMessage =
            'Payment could not be processed. Please verify your payment details.';
          break;
        case 500:
          errorMessage =
            'Payment service temporarily unavailable. Please try again later.';
          break;
        case 503:
          errorMessage =
            'Payment gateway is currently unavailable. Please try again later.';
          break;
        default:
          errorMessage = `Payment error: ${error.status}`;
      }
    }

    console.error('Payment Service Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
