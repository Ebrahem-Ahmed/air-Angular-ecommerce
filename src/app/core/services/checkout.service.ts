// services/checkout.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { Observable, throwError, forkJoin, of } from 'rxjs';
import {
  map,
  catchError,
  tap,
  switchMap,
  timeout,
  finalize,
} from 'rxjs/operators';
import {
  OrderService,
  Order,
  OrderSummary,
  CreateOrderFromCartRequest,
  BillingSummary,
} from './order.service';
import {
  PaymentService,
  PaymentCreateRequest,
  PayPalCreatePaymentRequest,
  PayPalCreatePaymentResponse,
  PayPalExecutePaymentRequest,
  PaymentMethod,
} from './payment.service';
import { ApiService } from './api.service.ts.service';
import { CartService, GuestCartItem } from '../../features/cart/cart.service';
import { AuthService } from './auth.service.ts.service';

// Checkout Interfaces - UPDATED with guest email
export interface CheckoutRequest {
  currency: string;
  billingAddress: string;
  shippingAddress: string;
  paymentMethod: string;
  notes?: string;
  couponCode?: string;

  // Guest user properties
  guestUserId?: string;
  guestEmail?: string;
  cartItems?: GuestCartItem[];
}

// Update your CheckoutProcessResponse interface in your service file
export interface CheckoutProcessResponse {
  success: boolean;
  orderId: string;
  paymentId: string;
  paymentMethod?: string;
  message?: string;
  guestUserId?: string;

  // PayPal URL properties - cover all possible variations
  approvalUrl?: string;
  approval_url?: string;
  redirectUrl?: string;
  redirect_url?: string;
  paypalUrl?: string;
  paymentUrl?: string;

  // Additional properties that might be returned
  amount?: number;
  currency?: string;
  error?: string;

  // Index signature to allow for additional dynamic properties
  [key: string]: any;
}

export interface CompleteCheckoutRequest {
  orderId: string;
  paymentId: string;
  guestEmail?: string; // Added for guest orders
}

export interface CompleteCheckoutResponse {
  success: boolean;
  message: string;
  orderId: string;
  paymentId: string;
}

export interface ApplyCouponRequest {
  orderId: string;
  couponCode: string;
}

export interface CouponAppliedResponse {
  discountApplied: number;
  totalAmount: number;
}

// UPDATED CheckoutState interface to store guest email
export interface CheckoutState {
  step: CheckoutStep;
  isProcessing: boolean;
  currentOrder: Order | null;
  shippingAddress: string;
  billingAddress: string;
  couponCode?: string;
  paymentMethod: string;
  notes?: string;
  error?: string;
  guestEmail?: string; // Added field
}
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// Enhanced error response interface
export interface CheckoutErrorResponse {
  success: false;
  message: string;
  error?: string;
  orderId?: string;
  validationErrors?: string[];
  statusCode?: number;
}
export enum CheckoutStep {
  Cart = 'cart',
  Shipping = 'shipping',
  Payment = 'payment',
  Review = 'review',
  Processing = 'processing',
  Success = 'success',
  Failed = 'failed',
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  guestUserId?: string; // Added for API responses
}

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private api = inject(ApiService);
  private authService = inject(AuthService);
  private cartService = inject(CartService);
  private orderService = inject(OrderService);
  private paymentService = inject(PaymentService);

  // Checkout state management
  private checkoutStateSignal = signal<CheckoutState>({
    step: CheckoutStep.Cart,
    isProcessing: false,
    currentOrder: null,
    shippingAddress: '',
    billingAddress: '',
    paymentMethod: PaymentMethod.CashOnDelivery,
    notes: '',
  });

  public checkoutState = this.checkoutStateSignal.asReadonly();

  constructor() {
    this.initializeCheckoutState();
  }

  /**
   * Initialize checkout state
   */
  private initializeCheckoutState(): void {
    this.authService.currentUser$.subscribe((user) => {
      if (!user) {
        this.resetCheckoutState();
      }
    });
  }

  /**
   * Start checkout process - validate cart and get summary
   */
  startCheckout(): Observable<OrderSummary> {
    const cartItems = this.cartService.cartItems();
    if (cartItems.length === 0) {
      return throwError(
        () => new Error('Cart is empty. Please add items before checkout.')
      );
    }

    return this.cartService.validateCart().pipe(
      switchMap((validation) => {
        if (!validation.isValid) {
          return throwError(
            () =>
              new Error(
                'Cart validation failed: ' + validation.errors.join(', ')
              )
          );
        }

        return this.getCheckoutSummary();
      }),
      tap(() => {
        this.updateCheckoutState({ step: CheckoutStep.Shipping });
      })
    );
  }

  /**
   * UPDATED: Get checkout summary with guest user support - uses POST and handles guest cart items
   */
  getCheckoutSummary(couponCode?: string): Observable<OrderSummary> {
    const isAuthenticated = this.authService.isLoggedIn();

    if (!isAuthenticated) {
      // Guest user - send cart items in request body
      const cartItems = this.cartService.cartItems();
      if (!cartItems || cartItems.length === 0) {
        return throwError(() => new Error('Cart is empty'));
      }

      const request = {
        couponCode,
        guestUserId: this.getStoredGuestUserId(),
        guestEmail: this.getGuestEmail(),
        cartItems: this.convertCartItemsToGuestFormat(cartItems),
      };

      return this.api
        .post<ApiResponse<OrderSummary>>('checkout/summary', request)
        .pipe(
          map((response) => {
            if (response.success && response.data) {
              return response.data;
            }
            throw new Error(
              response.message || 'Failed to get checkout summary'
            );
          }),
          catchError(this.handleError)
        );
    } else {
      // Authenticated user - can still use existing approach or switch to POST
      const request = { couponCode };
      return this.api
        .post<ApiResponse<OrderSummary>>('checkout/summary', request)
        .pipe(
          map((response) => {
            if (response.success && response.data) {
              return response.data;
            }
            throw new Error(
              response.message || 'Failed to get checkout summary'
            );
          }),
          catchError(this.handleError)
        );
    }
  }

  /**
   * UPDATED: Get billing summary for payment processing - uses POST for consistency
   */
  getBillingSummary(promoCode?: string): Observable<BillingSummary> {
    const isAuthenticated = this.authService.isLoggedIn();

    if (!isAuthenticated) {
      // Guest user
      const cartItems = this.cartService.cartItems();
      if (!cartItems || cartItems.length === 0) {
        return throwError(() => new Error('Cart is empty'));
      }

      const request = {
        promoCode,
        guestUserId: this.getStoredGuestUserId(),
        cartItems: this.convertCartItemsToGuestFormat(cartItems),
      };

      return this.api
        .post<ApiResponse<BillingSummary>>('checkout/billing-summary', request)
        .pipe(
          map((response) => {
            if (response.success && response.data) {
              return response.data;
            }
            throw new Error(
              response.message || 'Failed to get billing summary'
            );
          }),
          catchError(this.handleError)
        );
    } else {
      // Authenticated user
      const request = { promoCode };
      return this.api
        .post<ApiResponse<BillingSummary>>('checkout/billing-summary', request)
        .pipe(
          map((response) => {
            if (response.success && response.data) {
              return response.data;
            }
            throw new Error(
              response.message || 'Failed to get billing summary'
            );
          }),
          catchError(this.handleError)
        );
    }
  }

  /**
   * Apply coupon to current cart/order
   */
  applyCoupon(request: ApplyCouponRequest): Observable<CouponAppliedResponse> {
    return this.api
      .post<ApiResponse<CouponAppliedResponse>>(
        'checkout/apply-coupon',
        request
      )
      .pipe(
        map((response) => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.message || 'Failed to apply coupon');
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Set shipping address
   */
  setShippingAddress(address: string): void {
    this.updateCheckoutState({
      shippingAddress: address,
      step: CheckoutStep.Payment,
    });
  }

  /**
   * Set billing address
   */
  setBillingAddress(address: string): void {
    this.updateCheckoutState({ billingAddress: address });
  }

  /**
   * Set payment method
   */
  setPaymentMethod(paymentMethod: string): void {
    this.updateCheckoutState({
      paymentMethod,
      step: CheckoutStep.Review,
    });
  }

  /**
   * Set coupon code
   */
  setCouponCode(couponCode: string): void {
    this.updateCheckoutState({ couponCode });
  }

  /**
   * Set order notes
   */
  setNotes(notes: string): void {
    this.updateCheckoutState({ notes });
  }

  /**
   * NEW: Set guest email
   */
  setGuestEmail(email: string): void {
    this.updateCheckoutState({ guestEmail: email });
  }

  /**
   * UPDATED: Process complete checkout - uses the new API endpoint
   */
  // In checkout.service.ts - Fix the processCheckout method

  /**
   * UPDATED: Process complete checkout - uses the new API endpoint
   */
  processCheckout(
    request?: CheckoutRequest
  ): Observable<CheckoutProcessResponse> {
    const checkoutData = request || this.getCheckoutRequestFromState();

    // Enhanced validation for guest users
    const validation = this.validateCheckoutData(checkoutData);
    if (!validation.isValid) {
      return throwError(
        () =>
          new Error(
            'Checkout validation failed: ' + validation.errors.join(', ')
          )
      );
    }

    this.updateCheckoutState({
      isProcessing: true,
      step: CheckoutStep.Processing,
      error: undefined,
    });

    // Prepare request for new API
    const apiRequest = this.prepareCheckoutApiRequest(checkoutData);

    return this.addTimeoutToOperation(
      this.api.post<ApiResponse<CheckoutProcessResponse>>(
        'checkout/process',
        apiRequest
      ),
      30000,
      'Checkout process timed out. Please try again.'
    ).pipe(
      map((response): CheckoutProcessResponse => {
        if (response.success) {
          // FIX: Ensure return type matches CheckoutProcessResponse interface
          if (response.data) {
            return response.data; // Return the actual data if it exists
          } else {
            // Create a proper CheckoutProcessResponse object with all required properties
            return {
              success: true,
              orderId: response.guestUserId || 'unknown', // Map guestUserId or provide fallback
              paymentId: 'pending', // ADD: Required paymentId property
              paymentMethod: checkoutData.paymentMethod,
              message: response.message || 'Checkout completed successfully.',
              // Optional properties that might be present
              guestUserId: response.guestUserId,
              approvalUrl:
                (response as any).approvalUrl ||
                (response as any).approval_url ||
                (response as any).redirectUrl ||
                (response as any).redirect_url ||
                (response as any).paypalUrl ||
                (response as any).paymentUrl,
              amount: (response as any).amount,
              currency: (response as any).currency,
              error: (response as any).error,
            } as CheckoutProcessResponse;
          }
        }
        throw new Error(response.message || 'Failed to process checkout');
      }),
      catchError((error) => {
        this.updateCheckoutState({
          isProcessing: false,
          step: CheckoutStep.Failed,
          error: error.message,
        });
        return this.handleError(error);
      })
    );
  }

  /**
   * Add timeout handling to prevent infinite loading
   */
  private addTimeoutToOperation<T>(
    operation: Observable<T>,
    timeoutMs: number = 30000,
    timeoutMessage: string = 'Operation timed out'
  ): Observable<T> {
    return operation.pipe(
      timeout(timeoutMs),
      catchError((error) => {
        if (error.name === 'TimeoutError') {
          console.error('Operation timed out:', timeoutMessage);
          this.updateCheckoutState({
            isProcessing: false,
            step: CheckoutStep.Failed,
            error: timeoutMessage,
          });
        }
        throw error;
      })
    );
  }

  /**
   * Process payment based on payment method
   */
  private processPayment(
    order: Order,
    checkoutData: CheckoutRequest
  ): Observable<CheckoutProcessResponse> {
    console.log('Processing payment for method:', checkoutData.paymentMethod);

    if (checkoutData.paymentMethod.toLowerCase() === 'paypal') {
      return this.processPayPalPayment(order, checkoutData);
    } else {
      return this.processCashOnDeliveryPayment(order, checkoutData);
    }
  }

  /**
   * Process Cash on Delivery payment - ENHANCED with timeout and error handling
   */
  private processCashOnDeliveryPayment(
    order: Order,
    checkoutData: CheckoutRequest
  ): Observable<CheckoutProcessResponse> {
    const paymentData: PaymentCreateRequest = {
      orderId: order.id,
      amount: order.totalAmount,
      paymentMethod: PaymentMethod.CashOnDelivery,
    };

    console.log('Processing COD payment:', paymentData);

    return this.addTimeoutToOperation(
      this.paymentService.processCashOnDeliveryPayment(paymentData),
      15000,
      'Cash on Delivery payment processing timed out'
    ).pipe(
      map((payment) => {
        console.log('COD payment processed successfully:', payment);

        this.updateCheckoutState({
          isProcessing: false,
          step: CheckoutStep.Success,
        });

        return {
          success: true,
          paymentMethod: 'Cash on Delivery',
          orderId: order.id,
          paymentId: payment.id,
          orderStatus: 'Confirmed',
          message: 'Cash on Delivery order confirmed successfully.',
        } as CheckoutProcessResponse;
      }),
      catchError((error) => {
        console.error('COD payment error:', error);
        this.cleanupFailedOrder(order.id).subscribe();
        throw error;
      })
    );
  }

  /**
   * Process PayPal payment
   */
  private processPayPalPayment(
    order: Order,
    checkoutData: CheckoutRequest
  ): Observable<CheckoutProcessResponse> {
    const paypalData: PayPalCreatePaymentRequest = {
      amount: order.totalAmount,
      currancy: order.currency || 'USD',
      description: `Order #${order.orderNumber || order.id}`,
      orderId: order.id,
      returnUrl: this.paymentService.generatePayPalReturnUrl(),
      cancelUrl: this.paymentService.generatePayPalCancelUrl(),
    };

    console.log('Creating PayPal payment:', paypalData);

    return this.paymentService.createPayPalPayment(paypalData).pipe(
      map((paymentResponse) => {
        console.log('PayPal payment created:', paymentResponse);

        this.updateCheckoutState({
          isProcessing: false,
          step: CheckoutStep.Payment,
        });

        return {
          success: true,
          paymentMethod: 'PayPal',
          orderId: order.id,
          paymentId: paymentResponse.paymentId,
          approvalUrl: paymentResponse.approvalUrl,
          message: 'PayPal payment created successfully.',
        } as CheckoutProcessResponse;
      }),
      catchError((error) => {
        console.error('PayPal payment creation error:', error);
        this.cleanupFailedOrder(order.id).subscribe();
        throw error;
      })
    );
  }

  /**
   * Execute PayPal payment after user approval - ENHANCED with better error handling
   */
  executePayPalPayment(
    paymentId: string,
    payerId: string
  ): Observable<CheckoutProcessResponse> {
    console.log('Executing PayPal payment:', { paymentId, payerId });

    this.updateCheckoutState({
      isProcessing: true,
      step: CheckoutStep.Processing,
    });

    const executeData: PayPalExecutePaymentRequest = { paymentId, payerId };

    return this.addTimeoutToOperation(
      this.paymentService.executePayPalPayment(executeData),
      20000,
      'PayPal payment execution timed out'
    ).pipe(
      switchMap((executionResult) => {
        console.log('PayPal execution result:', executionResult);

        return this.cartService.clearCart().pipe(
          map(() => {
            console.log('Cart cleared after successful PayPal payment');
            return executionResult;
          }),
          catchError((cartError) => {
            console.error(
              'Failed to clear cart, but payment was successful:',
              cartError
            );
            return of(executionResult);
          })
        );
      }),
      switchMap((executionResult) => {
        return this.completeCheckout({
          orderId: executionResult.orderId,
          paymentId: executionResult.id,
        }).pipe(
          catchError((completeError) => {
            console.warn(
              'Complete checkout failed but payment was successful:',
              completeError
            );
            return of({
              success: true,
              message: 'Payment successful',
              orderId: executionResult.orderId,
              paymentId: executionResult.id,
            } as CompleteCheckoutResponse);
          })
        );
      }),
      map((result) => {
        // CRITICAL: Always reset state on success
        this.updateCheckoutState({
          isProcessing: false,
          step: CheckoutStep.Success,
        });

        return {
          success: true,
          paymentMethod: 'PayPal',
          orderId: result.orderId,
          paymentId: result.paymentId,
          orderStatus: 'Processing',
          message: 'PayPal payment executed successfully',
        } as CheckoutProcessResponse;
      }),
      catchError((error) => {
        console.error('PayPal execution error:', error);

        // CRITICAL: Always reset processing state
        this.updateCheckoutState({
          isProcessing: false,
          step: CheckoutStep.Failed,
          error: error.message,
        });

        return this.handleError(error);
      })
    );
  }

  /**
   * UPDATED: Complete checkout to handle guest orders
   */
  completeCheckout(
    request: CompleteCheckoutRequest
  ): Observable<CompleteCheckoutResponse> {
    // Add guest email for guest orders
    const apiRequest = {
      ...request,
      guestEmail: this.authService.isLoggedIn()
        ? undefined
        : this.getGuestEmail(),
    };

    return this.api
      .post<ApiResponse<CompleteCheckoutResponse>>(
        'checkout/complete',
        apiRequest
      )
      .pipe(
        map((response) => {
          if (response.success && response.data) {
            // Clear cart for all users (authenticated and guest)
            this.cartService.clearCart().subscribe({
              next: () =>
                console.log('Cart cleared during checkout completion'),
              error: (error) => console.error('Failed to clear cart:', error),
            });

            this.resetCheckoutState();
            return response.data;
          }
          throw new Error(response.message || 'Failed to complete checkout');
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Handle PayPal success callback
   */
  handlePayPalSuccess(
    paymentId: string,
    payerId: string
  ): Observable<CheckoutProcessResponse> {
    return this.executePayPalPayment(paymentId, payerId);
  }

  /**
   * Handle PayPal cancellation
   */
  handlePayPalCancel(): void {
    const currentOrder = this.checkoutStateSignal().currentOrder;
    if (currentOrder) {
      this.cleanupFailedOrder(currentOrder.id).subscribe();
    }

    this.updateCheckoutState({
      isProcessing: false,
      step: CheckoutStep.Payment,
      error: 'PayPal payment was cancelled',
    });
  }

  /**
   * Create order from cart - FIXED currency field
   */
  private createOrderFromCart(
    checkoutData: CheckoutRequest
  ): Observable<Order> {
    const createOrderRequest: CreateOrderFromCartRequest = {
      shippingAddress: checkoutData.shippingAddress,
      billingAddress: checkoutData.billingAddress,
      currency: checkoutData.currency, // Maps to API expectation
      couponCode: checkoutData.couponCode,
      paymentMethod: checkoutData.paymentMethod,
      notes: checkoutData.notes,
    };

    // Add guest user data if present
    if (checkoutData.guestUserId) {
      createOrderRequest.guestUserId = checkoutData.guestUserId;
    }
    if (checkoutData.guestEmail) {
      createOrderRequest.guestEmail = checkoutData.guestEmail;
    }

    console.log('Creating order from cart:', createOrderRequest);
    return this.orderService.createOrderFromCart(createOrderRequest);
  }

  /**
   * Cleanup failed order
   */
  private cleanupFailedOrder(orderId: string): Observable<boolean> {
    console.log('Cleaning up failed order:', orderId);
    return this.orderService.deleteOrder(orderId).pipe(
      catchError((error) => {
        console.error('Failed to cleanup order:', error);
        return of(false);
      })
    );
  }

  /**
   * Get checkout request from current state - FIXED currency field
   */
  private getCheckoutRequestFromState(): CheckoutRequest {
    const state = this.checkoutStateSignal();
    return {
      currency: 'EGY', // FIXED: was "currancy"
      shippingAddress: state.shippingAddress,
      billingAddress: state.billingAddress,
      couponCode: state.couponCode,
      paymentMethod: state.paymentMethod,
      notes: state.notes,
      guestEmail: state.guestEmail, // Added guest email from state
    };
  }

  /**
   * NEW: Prepare checkout API request for new endpoint
   */
  private prepareCheckoutApiRequest(checkoutData: CheckoutRequest): any {
    const isAuthenticated = this.authService.isLoggedIn();

    if (!isAuthenticated) {
      // Guest user - include cart items and email
      const cartItems = this.cartService.cartItems();
      return {
        shippingAddress: checkoutData.shippingAddress,
        billingAddress: checkoutData.billingAddress,
        currency: checkoutData.currency, // Note: still using "currancy" to match interface
        couponCode: checkoutData.couponCode,
        paymentMethod: checkoutData.paymentMethod,
        notes: checkoutData.notes,
        guestUserId: checkoutData.guestUserId || this.getStoredGuestUserId(),
        guestEmail: checkoutData.guestEmail,
        cartItems: this.convertCartItemsToGuestFormat(cartItems),
      };
    } else {
      // Authenticated user - simpler request
      return {
        shippingAddress: checkoutData.shippingAddress,
        billingAddress: checkoutData.billingAddress,
        currency: checkoutData.currency,
        couponCode: checkoutData.couponCode,
        paymentMethod: checkoutData.paymentMethod,
        notes: checkoutData.notes,
      };
    }
  }

  /**
   * NEW: Convert cart items to guest format
   */
  private convertCartItemsToGuestFormat(cartItems: any[]): any[] {
    return cartItems.map((item) => ({
      id: item.id,
      variantId: item.variantId,
      productId: item.productId || '',
      productName: item.productName,
      sku: item.sku,
      size: item.size,
      color: item.color,
      imageUrl: item.imageUrl || '',
      unitPrice: item.unitPrice,
      originalPrice: item.originalPrice || item.unitPrice,
      quantity: item.quantity,
      totalPrice: item.totalPrice,
      variantDetails:
        item.variantDetails || `Size: ${item.size}, Color: ${item.color}`,
      maxStock: item.maxStock || 99,
    }));
  }

  /**
   * NEW: Get guest email from state
   */
  private getGuestEmail(): string | null {
    const state = this.checkoutStateSignal();
    return (state as any).guestEmail || null;
  }

  /**
   * NEW: Store guest user ID
   */
  private storeGuestUserId(guestUserId: string): void {
    try {
      localStorage.setItem('guestUserId', guestUserId);
    } catch (error) {
      console.warn('Unable to store guest user ID:', error);
    }
  }

  /**
   * NEW: Get stored guest user ID
   */
  private getStoredGuestUserId(): string | null {
    try {
      return localStorage.getItem('guestUserId');
    } catch (error) {
      console.warn('Unable to retrieve guest user ID:', error);
      return null;
    }
  }

  /**
   * UPDATED: Validate checkout data with guest email validation
   */
  private validateCheckoutData(checkoutData: CheckoutRequest): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!checkoutData.shippingAddress?.trim()) {
      errors.push('Shipping address is required');
    }

    if (!checkoutData.billingAddress?.trim()) {
      errors.push('Billing address is required');
    }

    if (!checkoutData.paymentMethod?.trim()) {
      errors.push('Payment method is required');
    }

    if (this.cartService.isEmpty()) {
      errors.push('Cart is empty');
    }

    // For guest users, validate email
    if (!this.authService.isLoggedIn()) {
      const guestEmail = checkoutData.guestEmail || this.getGuestEmail();
      if (!guestEmail || !this.isValidEmail(guestEmail)) {
        errors.push('Valid email address is required for guest checkout');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Update checkout state
   */
  private updateCheckoutState(updates: Partial<CheckoutState>): void {
    const currentState = this.checkoutStateSignal();
    this.checkoutStateSignal.set({
      ...currentState,
      ...updates,
    });
  }

  /**
   * Reset checkout state
   */
  resetCheckoutState(): void {
    this.checkoutStateSignal.set({
      step: CheckoutStep.Cart,
      isProcessing: false,
      currentOrder: null,
      shippingAddress: '',
      billingAddress: '',
      paymentMethod: PaymentMethod.CashOnDelivery,
      notes: '',
    });
  }

  /**
   * Navigation methods
   */
  navigateToStep(step: CheckoutStep): void {
    this.updateCheckoutState({ step });
  }

  goToPreviousStep(): void {
    const currentStep = this.checkoutStateSignal().step;
    let previousStep: CheckoutStep;

    switch (currentStep) {
      case CheckoutStep.Shipping:
        previousStep = CheckoutStep.Cart;
        break;
      case CheckoutStep.Payment:
        previousStep = CheckoutStep.Shipping;
        break;
      case CheckoutStep.Review:
        previousStep = CheckoutStep.Payment;
        break;
      default:
        return;
    }

    this.updateCheckoutState({ step: previousStep });
  }

  goToNextStep(): void {
    const currentStep = this.checkoutStateSignal().step;
    let nextStep: CheckoutStep;

    switch (currentStep) {
      case CheckoutStep.Cart:
        nextStep = CheckoutStep.Shipping;
        break;
      case CheckoutStep.Shipping:
        nextStep = CheckoutStep.Payment;
        break;
      case CheckoutStep.Payment:
        nextStep = CheckoutStep.Review;
        break;
      default:
        return;
    }

    this.updateCheckoutState({ step: nextStep });
  }

  canProceedToNextStep(): boolean {
    const state = this.checkoutStateSignal();

    switch (state.step) {
      case CheckoutStep.Cart:
        return !this.cartService.isEmpty();
      case CheckoutStep.Shipping:
        return !!state.shippingAddress && !!state.billingAddress;
      case CheckoutStep.Payment:
        return !!state.paymentMethod;
      case CheckoutStep.Review:
        return true;
      default:
        return false;
    }
  }

  getCheckoutProgress(): number {
    const step = this.checkoutStateSignal().step;
    const stepMap = {
      [CheckoutStep.Cart]: 0,
      [CheckoutStep.Shipping]: 25,
      [CheckoutStep.Payment]: 50,
      [CheckoutStep.Review]: 75,
      [CheckoutStep.Processing]: 85,
      [CheckoutStep.Success]: 100,
      [CheckoutStep.Failed]: 75,
    };
    return stepMap[step] || 0;
  }

  getStepDisplayText(step: CheckoutStep): string {
    const textMap = {
      [CheckoutStep.Cart]: 'Cart',
      [CheckoutStep.Shipping]: 'Shipping & Billing',
      [CheckoutStep.Payment]: 'Payment Method',
      [CheckoutStep.Review]: 'Review Order',
      [CheckoutStep.Processing]: 'Processing...',
      [CheckoutStep.Success]: 'Order Complete',
      [CheckoutStep.Failed]: 'Order Failed',
    };
    return textMap[step] || step;
  }

  /**
   * Enhanced error handler
   */
  private handleError = (error: any): Observable<never> => {
    let errorMessage = 'An error occurred during checkout';

    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.status) {
      switch (error.status) {
        case 400:
          errorMessage =
            'Invalid checkout data. Please check your information.';
          break;
        case 401:
          errorMessage = 'Please log in to continue with checkout.';
          break;
        case 403:
          errorMessage = 'Checkout not authorized. Please contact support.';
          break;
        case 404:
          errorMessage = 'Checkout resource not found.';
          break;
        case 422:
          errorMessage =
            'Unable to process checkout. Please verify your details.';
          break;
        case 500:
          errorMessage = 'Checkout service unavailable. Please try again.';
          break;
        default:
          errorMessage = `Checkout error: ${error.status}`;
      }
    }

    console.error('Checkout Service Error:', error);
    return throwError(() => new Error(errorMessage));
  };
}
