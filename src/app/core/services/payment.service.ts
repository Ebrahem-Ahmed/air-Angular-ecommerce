// services/payment.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from './api.service.ts.service';
import { AuthService } from './auth.service.ts.service';

// Payment Interfaces
export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  transactionId?: string;
  paymentDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentCreateRequest {
  orderId: string;
  amount: number;
  paymentMethod: string;
}

export interface PayPalCreatePaymentRequest {
  amount: number;
  currancy: string;
  description: string;
  orderId: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface PayPalCreatePaymentResponse {
  paymentId: string;
  approvalUrl: string;
  orderId: string;
}

export interface PayPalExecutePaymentRequest {
  paymentId: string;
  payerId: string;
}

export interface PayPalExecutePaymentResponse {
  id: string;
  orderId: string;
  paymentStatus: string;
  transactionId: string;
  amount: number;
  currency: string;
}

export interface PayPalPaymentDetails {
  paymentId: string;
  status: string;
  amount: number;
  currency: string;
  description: string;
  payerEmail?: string;
  transactionId?: string;
}

export interface PaymentRefundRequest {
  transactionId: string;
  amount: number;
  reason?: string;
}

export interface PaymentRefundResponse {
  refundId: string;
  status: string;
  amount: number;
  currency: string;
}

export interface PaymentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export enum PaymentMethod {
  CashOnDelivery = 'Cash on Delivery',
  COD = 'COD',
  PayPal = 'PayPal',
}

export enum PaymentStatus {
  Pending = 'Pending',
  Processing = 'Processing',
  Completed = 'Completed',
  Failed = 'Failed',
  Cancelled = 'Cancelled',
  Refunded = 'Refunded',
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private api = inject(ApiService);
  private authService = inject(AuthService);

  // Signals for state management
  private isProcessingSignal = signal<boolean>(false);
  private currentPaymentSignal = signal<Payment | null>(null);

  public isProcessing = this.isProcessingSignal.asReadonly();
  public currentPayment = this.currentPaymentSignal.asReadonly();

  constructor() {}

  /**
   * Get payment by ID
   */
  getPaymentById(paymentId: string): Observable<Payment> {
    return this.api.get<ApiResponse<Payment>>(`payment/${paymentId}`).pipe(
      map((response) => {
        if (response.success && response.data) {
          this.currentPaymentSignal.set(response.data);
          return response.data;
        }
        throw new Error(response.message || 'Failed to get payment');
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Process Cash on Delivery payment
   */
  processCashOnDeliveryPayment(
    paymentData: PaymentCreateRequest
  ): Observable<Payment> {
    this.isProcessingSignal.set(true);

    // Ensure payment method is set correctly for COD
    const requestData = {
      ...paymentData,
      paymentMethod: PaymentMethod.CashOnDelivery,
    };

    return this.api
      .post<ApiResponse<Payment>>('payment/process', requestData)
      .pipe(
        map((response) => {
          if (response.success && response.data) {
            this.currentPaymentSignal.set(response.data);
            return response.data;
          }
          throw new Error(
            response.message || 'Cash on Delivery payment processing failed'
          );
        }),
        catchError((error) => {
          this.isProcessingSignal.set(false);
          return this.handleError(error);
        }),
        map((payment) => {
          this.isProcessingSignal.set(false);
          return payment;
        })
      );
  }

  /**
   * Create PayPal payment
   */
  createPayPalPayment(
    paymentData: PayPalCreatePaymentRequest
  ): Observable<PayPalCreatePaymentResponse> {
    this.isProcessingSignal.set(true);

    return this.api
      .post<ApiResponse<PayPalCreatePaymentResponse>>(
        'payment/paypal/create',
        paymentData
      )
      .pipe(
        map((response) => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.message || 'PayPal payment creation failed');
        }),
        catchError((error) => {
          this.isProcessingSignal.set(false);
          return this.handleError(error);
        }),
        map((paymentResponse) => {
          this.isProcessingSignal.set(false);
          return paymentResponse;
        })
      );
  }

  /**
   * Execute PayPal payment after user approval
   */
  executePayPalPayment(
    executeData: PayPalExecutePaymentRequest
  ): Observable<PayPalExecutePaymentResponse> {
    this.isProcessingSignal.set(true);

    return this.api
      .post<ApiResponse<PayPalExecutePaymentResponse>>(
        'payment/paypal/execute',
        executeData
      )
      .pipe(
        map((response) => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(
            response.message || 'PayPal payment execution failed'
          );
        }),
        catchError((error) => {
          this.isProcessingSignal.set(false);
          return this.handleError(error);
        }),
        map((executionResult) => {
          this.isProcessingSignal.set(false);
          return executionResult;
        })
      );
  }

  /**
   * Get PayPal payment details
   */
  getPayPalPaymentDetails(paymentId: string): Observable<PayPalPaymentDetails> {
    return this.api
      .get<ApiResponse<PayPalPaymentDetails>>(`payment/paypal/${paymentId}`)
      .pipe(
        map((response) => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(
            response.message || 'Failed to get PayPal payment details'
          );
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Refund PayPal payment
   */
  refundPayPalPayment(
    refundData: PaymentRefundRequest
  ): Observable<PaymentRefundResponse> {
    return this.api
      .post<ApiResponse<PaymentRefundResponse>>(
        'payment/paypal/refund',
        refundData
      )
      .pipe(
        map((response) => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(
            response.message || 'PayPal refund processing failed'
          );
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Get all pending payments
   */
  getPendingPayments(): Observable<Payment[]> {
    return this.api.get<ApiResponse<Payment[]>>('payment/pending').pipe(
      map((response) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || 'Failed to get pending payments');
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Validate payment data before processing
   */
  validatePaymentData(
    paymentData: PaymentCreateRequest
  ): PaymentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate order ID
    if (!paymentData.orderId || paymentData.orderId.trim() === '') {
      errors.push('Order ID is required');
    }

    // Validate amount
    if (!paymentData.amount || paymentData.amount <= 0) {
      errors.push('Payment amount must be greater than 0');
    }

    if (paymentData.amount > 10000) {
      warnings.push(
        'Large payment amount detected. Please verify the amount is correct.'
      );
    }

    // Validate payment method
    const validPaymentMethods = Object.values(PaymentMethod);
    if (
      !paymentData.paymentMethod ||
      !validPaymentMethods.includes(paymentData.paymentMethod as PaymentMethod)
    ) {
      errors.push(
        'Invalid payment method. Supported methods: Cash on Delivery, PayPal'
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate PayPal payment data
   */
  validatePayPalPaymentData(
    paymentData: PayPalCreatePaymentRequest
  ): PaymentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate amount
    if (!paymentData.amount || paymentData.amount <= 0) {
      errors.push('Payment amount must be greater than 0');
    }

    // Validate currency
    const supportedCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
    if (
      !paymentData.currancy ||
      !supportedCurrencies.includes(paymentData.currancy.toUpperCase())
    ) {
      errors.push(
        'Unsupported currency. Supported currencies: ' +
          supportedCurrencies.join(', ')
      );
    }

    // Validate description
    if (!paymentData.description || paymentData.description.trim() === '') {
      errors.push('Payment description is required');
    }

    // Validate order ID
    if (!paymentData.orderId) {
      errors.push('Order ID is required');
    }

    // Validate URLs
    if (!paymentData.returnUrl || !this.isValidUrl(paymentData.returnUrl)) {
      errors.push('Valid return URL is required');
    }

    if (!paymentData.cancelUrl || !this.isValidUrl(paymentData.cancelUrl)) {
      errors.push('Valid cancel URL is required');
    }

    // Amount warnings
    if (paymentData.amount > 10000) {
      warnings.push(
        'Large payment amount detected. Please verify the amount is correct.'
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if payment method is supported
   */
  isPaymentMethodSupported(paymentMethod: string): boolean {
    return Object.values(PaymentMethod).includes(
      paymentMethod as PaymentMethod
    );
  }

  /**
   * Get supported payment methods
   */
  getSupportedPaymentMethods(): PaymentMethod[] {
    return Object.values(PaymentMethod);
  }

  /**
   * Format payment amount for display
   */
  formatPaymentAmount(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  /**
   * Get payment status display text
   */
  getPaymentStatusText(status: PaymentStatus | string): string {
    const statusMap = {
      [PaymentStatus.Pending]: 'Pending',
      [PaymentStatus.Processing]: 'Processing',
      [PaymentStatus.Completed]: 'Completed',
      [PaymentStatus.Failed]: 'Failed',
      [PaymentStatus.Cancelled]: 'Cancelled',
      [PaymentStatus.Refunded]: 'Refunded',
    };
    return statusMap[status as PaymentStatus] || status;
  }

  /**
   * Get payment status color for UI
   */
  getPaymentStatusColor(status: PaymentStatus | string): string {
    const colorMap = {
      [PaymentStatus.Pending]: 'orange',
      [PaymentStatus.Processing]: 'blue',
      [PaymentStatus.Completed]: 'green',
      [PaymentStatus.Failed]: 'red',
      [PaymentStatus.Cancelled]: 'gray',
      [PaymentStatus.Refunded]: 'purple',
    };
    return colorMap[status as PaymentStatus] || 'gray';
  }

  /**
   * Check if payment can be refunded
   */
  canRefundPayment(payment: Payment): boolean {
    return (
      payment.paymentStatus === PaymentStatus.Completed &&
      payment.paymentMethod === PaymentMethod.PayPal
    );
  }

  /**
   * Generate PayPal return URL
   */
  generatePayPalReturnUrl(): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/checkout/paypal/success`;
  }

  /**
   * Generate PayPal cancel URL
   */
  generatePayPalCancelUrl(): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/checkout/paypal/cancel`;
  }

  /**
   * Redirect to PayPal for payment approval
   */
  redirectToPayPal(approvalUrl: string): void {
    window.location.href = approvalUrl;
  }

  /**
   * Extract PayPal parameters from URL
   */
  extractPayPalParamsFromUrl(url: string = window.location.href): {
    paymentId: string | null;
    payerId: string | null;
  } {
    const urlParams = new URLSearchParams(url.split('?')[1] || '');
    return {
      paymentId: urlParams.get('paymentId'),
      payerId: urlParams.get('PayerID'),
    };
  }

  /**
   * Clear current payment state
   */
  clearCurrentPayment(): void {
    this.currentPaymentSignal.set(null);
    this.isProcessingSignal.set(false);
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Error handler
   */
  private handleError = (error: any): Observable<never> => {
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
          errorMessage = 'Payment not found.';
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
  };
}
