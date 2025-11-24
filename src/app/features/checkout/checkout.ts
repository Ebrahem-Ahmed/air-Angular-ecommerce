// checkout.component.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, of } from 'rxjs';
import { takeUntil, finalize, switchMap, map } from 'rxjs/operators';

// Services
import {
  CheckoutService,
  CheckoutRequest,
} from '../../core/services/checkout.service';
import { OrderService, OrderSummary } from '../../core/services/order.service';
import { CartService } from '../../features/cart/cart.service';
import { AuthService } from '../../core/services/auth.service.ts.service';
import { GuestUserService } from '../../core/services/guestuser.service';

// Checkout Services
import { CheckoutFormService } from './services/checkout-form.service';
import { CheckoutAddressService } from './services/checkout-address.service';
import { CheckoutCouponService } from './services/checkout-coupon.service';
import { CheckoutPaymentService } from './services/checkout-payment.service';

// Utils
import { CheckoutValidator } from './utils/checkout-validator';
import { AddressFormatter } from './utils/address-formatter';

// Interfaces
import { PaymentMethod } from '../../core/services/payment.service';
import { TranslateModule } from '@ngx-translate/core';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.scss'],
})
export class Checkout implements OnInit, OnDestroy {
  // Core Services
  private checkoutService = inject(CheckoutService);
  private orderService = inject(OrderService);
  private cartService = inject(CartService);
  private authService = inject(AuthService);
  private guestUserService = inject(GuestUserService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Checkout Services
  public formService = inject(CheckoutFormService);
  public addressService = inject(CheckoutAddressService);
  public couponService = inject(CheckoutCouponService);
  public paymentService = inject(CheckoutPaymentService);
  private toastService = inject(ToastService);

  private destroy$ = new Subject<void>();

  // State
  orderSummary: OrderSummary | null = null;
  sameAsBilling = true;
  validationErrors: string[] = [];

  // User & Authentication
  isUserAuthenticated = false;
  isGuestUser = false;
  guestUserId: string | null = null;
  guestEmail = '';

  // Constants
  PaymentMethod = PaymentMethod;

  ngOnInit(): void {
    this.setupAuthentication();
    this.validateAndLoadCart();
    this.handlePayPalCallback();
    this.initializeFormSynchronization();

    // Initialize coupon service with current cart state
    this.couponService.initializeCouponService();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.formService.destroy();
  }

  // ====================
  // INITIALIZATION
  // ====================

  private setupAuthentication(): void {
    this.isUserAuthenticated = this.authService.isLoggedIn();
    this.isGuestUser = !this.isUserAuthenticated;

    if (this.isUserAuthenticated) {
      this.addressService.loadUserAddresses().subscribe({
        next: (addresses) => {
          console.log('User addresses loaded:', addresses.length);
        },
        error: (error) => {
          console.error('Failed to load addresses:', error);
        },
      });
    } else {
      this.setupGuestCheckout();
    }
  }

  private setupGuestCheckout(): void {
    this.guestUserId = this.guestUserService.getOrCreateGuestUserId();
    this.addressService.setupGuestCheckout();
    console.log('Guest checkout setup - Guest User ID:', this.guestUserId);
  }

  private initializeFormSynchronization(): void {
    this.formService.synchronizeEmailFields(this.isGuestUser);
    this.formService.updateShippingFormValidators(this.sameAsBilling);
  }

  // ====================
  // CART & ORDER MANAGEMENT
  // ====================

  private validateAndLoadCart(): void {
    if (this.cartService.isEmpty()) {
      this.router.navigate(['/cart']);
      return;
    }

    this.cartService.validateCart().subscribe({
      next: (validation) => {
        if (!validation.isValid) {
          this.validationErrors = validation.errors;
        }
        this.loadCheckoutSummary();
      },
      error: (error) => {
        console.error('Cart validation failed:', error);
        this.addValidationErrors('Failed to validate cart items');
      },
    });
  }

  private loadCheckoutSummary(): void {
    const couponCode = this.couponService.getCouponCode();

    this.checkoutService.getCheckoutSummary(couponCode).subscribe({
      next: (summary) => {
        this.orderSummary = summary;
        this.updateCouponDiscount(summary, couponCode);
        console.log('Checkout summary loaded:', summary);
      },
      error: (error) => {
        console.error('Failed to load checkout summary:', error);
        this.createSummaryFromCart();
      },
    });
  }

  private updateCouponDiscount(
    summary: OrderSummary,
    couponCode?: string
  ): void {
    if (this.couponService.isCouponApplied() && couponCode) {
      const originalTotal = this.cartSummary.subtotal;
      const discount = Math.max(0, originalTotal - summary.totalAmount);
      this.couponService.couponDiscount = discount;
      this.couponService.discountAmount = discount;
    }
  }

  private createSummaryFromCart(): void {
    const cartItems = this.cartService.cartItems();
    const cartSummary = this.cartService.cartSummary();
    const discountAmount = this.couponService.getDiscountAmount();

    this.orderSummary = {
      subtotal: cartSummary.subtotal,
      discountAmount: discountAmount,
      totalAmount: cartSummary.subtotal - discountAmount,
      itemCount: cartItems.length,
      currency: cartSummary.currency,
      orderItems: cartItems.map((item) => ({
        id: item.id,
        variantId: item.variantId,
        productName: item.productName,
        sku: item.sku,
        size: item.size,
        color: item.color,
        imageUrl: item.imageUrl,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        variantDetails: item.variantDetails || `${item.size} - ${item.color}`,
      })),
    };
  }

  // ====================
  // ENHANCED BILLING CALCULATION METHODS WITH IMMEDIATE COUPON FEEDBACK
  // ====================

  /**
   * Get display values for the UI - uses original cart subtotal
   */
  getDisplaySubtotal(): number {
    return this.couponService.getOriginalTotal();
  }

  /**
   * Get current discount amount with immediate feedback
   */
  getDisplayDiscount(): number {
    return this.couponService.getCalculatedDiscount();
  }

  /**
   * Get display total with all calculations including immediate coupon feedback
   */
  getDisplayTotal(): number {
    return this.getFinalTotal();
  }

  /**
   * Calculate taxes and fees based on current subtotal (after discount)
   */
  getTaxesAndFees(): number {
    const currentTotal = this.couponService.getCurrentTotal();
    const taxRate = 0.05; // 5% tax rate
    const taxThreshold = 0; // EGP

    if (currentTotal >= taxThreshold) {
      return currentTotal * taxRate;
    }

    return 0;
  }

  /**
   * Get COD fee when Cash on Delivery is selected
   */
  getCODFee(): number {
    if (this.isCODSelected) {
      return 10; // 10 EGP COD fee
    }
    return 0;
  }

  /**
   * Check if there are any additional charges (taxes, fees, COD)
   */
  hasAdditionalCharges(): boolean {
    return this.getTaxesAndFees() > 0 || this.getCODFee() > 0;
  }

  /**
   * Calculate subtotal including taxes and fees but before final total
   */
  getSubtotalWithCharges(): number {
    const currentTotal = this.couponService.getCurrentTotal();
    const taxes = this.getTaxesAndFees();
    const codFee = this.getCODFee();

    return currentTotal + taxes + codFee;
  }

  /**
   * Calculate the final total with all charges and discounts including immediate coupon feedback
   */
  getFinalTotal(): number {
    // Start with current total (already includes coupon discount if applied)
    let currentTotal = this.couponService.getCurrentTotal();

    // Add taxes calculated on the discounted amount
    const taxes = this.getTaxesAndFees();

    // Add COD fee
    const codFee = this.getCODFee();

    // Final calculation: (Original Subtotal - Coupon Discount) + Taxes + COD Fee
    const finalTotal = currentTotal + taxes + codFee;

    return Math.max(0, finalTotal);
  }

  /**
   * Get total savings from applied coupons
   */
  getTotalSavings(): number {
    return this.couponService.getCalculatedDiscount();
  }

  /**
   * Get breakdown of all charges and fees with immediate coupon calculation
   */
  getBillingBreakdown() {
    const originalSubtotal = this.couponService.getOriginalTotal();
    const discount = this.couponService.getCalculatedDiscount();
    const subtotalAfterDiscount = originalSubtotal - discount;

    return {
      originalSubtotal: originalSubtotal,
      discount: discount,
      subtotalAfterDiscount: subtotalAfterDiscount,
      taxes: this.getTaxesAndFees(),
      codFee: this.getCODFee(),
      finalTotal: this.getFinalTotal(),
      savings: discount,
    };
  }

  // ====================
  // EVENT HANDLERS
  // ====================

  onBillingAddressChange(event: any): void {
    this.addressService.onBillingAddressChange(event.target.value);
  }

  onShippingAddressChange(event: any): void {
    this.addressService.onShippingAddressChange(event.target.value);
  }

  onSameAsBillingChange(event: any): void {
    this.sameAsBilling = event.target.checked;
    this.formService.updateShippingFormValidators(this.sameAsBilling);

    if (this.sameAsBilling) {
      this.addressService.selectedShippingAddressId =
        this.addressService.selectedBillingAddressId;
      this.formService.shippingForm.reset();
      this.addressService.showNewShippingForm = false;
    }
  }

  /**
   * Enhanced payment method change handler with billing recalculation
   */
  onPaymentMethodChange(method: PaymentMethod): void {
    const previousMethod = this.paymentService.selectedPaymentMethod;
    this.paymentService.onPaymentMethodSelected(method);

    // Log the change for analytics
    this.logPaymentMethodChange(previousMethod, method);

    // Refresh billing summary if COD fee changed (no need to call API, just UI update)
    if (this.hasCODFeeChanged(previousMethod, method)) {
      console.log('COD fee status changed, UI will auto-update');
    }
  }

  /**
   * Check if COD fee status changed
   */
  private hasCODFeeChanged(
    previousMethod: PaymentMethod,
    newMethod: PaymentMethod
  ): boolean {
    const wasCOD =
      previousMethod === PaymentMethod.CashOnDelivery ||
      previousMethod === PaymentMethod.COD;
    const isCOD =
      newMethod === PaymentMethod.CashOnDelivery ||
      newMethod === PaymentMethod.COD;

    return wasCOD !== isCOD;
  }

  /**
   * Log payment method change for analytics
   */
  private logPaymentMethodChange(
    previousMethod: PaymentMethod,
    newMethod: PaymentMethod
  ): void {
    const billingBreakdown = this.getBillingBreakdown();

    this.logCheckoutAnalytics('payment_method_changed', {
      previousMethod: previousMethod,
      newMethod: newMethod,
      codFeeApplied: this.getCODFee() > 0,
      totalWithFees: billingBreakdown.finalTotal,
      billingBreakdown: billingBreakdown,
    });
  }

  onGuestEmailChange(): void {
    const email = this.formService.guestForm.get('email')?.value;
    if (email) {
      this.guestEmail = email;
      this.checkoutService.setGuestEmail(email);
    }
  }

  onCreateAccountToggle(createAccount: boolean): void {
    this.formService.guestForm.patchValue({ createAccount });
    this.logCheckoutAnalytics('create_account_toggled', { createAccount });
  }

  // ====================
  // ENHANCED COUPON MANAGEMENT WITH IMMEDIATE FEEDBACK
  // ====================

  onTogglePromoSection(): void {
    this.couponService.togglePromoSection();
  }

  /**
   * Enhanced coupon application with immediate UI feedback
   */
  onApplyCoupon(): void {
    this.couponService.applyCoupon().subscribe({
      next: (result) => {
        console.log(
          'Coupon applied successfully with immediate feedback:',
          result
        );

        // The UI will automatically update due to the service state changes
        // No need to manually reload summary

        // Log analytics with immediate feedback data
        this.logCheckoutAnalytics('coupon_applied', {
          couponCode: result.couponCode,
          discountAmount: result.discountApplied,
          originalTotal: result.originalAmount,
          newTotal: result.totalAmount,
          billingBreakdown: this.getBillingBreakdown(),
          immediateUIUpdate: true,
        });
      },
      error: (error) => {
        console.error('Coupon application failed:', error);
      },
    });
  }

  /**
   * Enhanced coupon removal with immediate UI update
   */
  onRemoveCoupon(): void {
    this.couponService.removeCoupon();

    this.logCheckoutAnalytics('coupon_removed', {
      billingBreakdown: this.getBillingBreakdown(),
      immediateUIUpdate: true,
    });
  }

  // ====================
  // ENHANCED CHECKOUT PROCESSING WITH COUPON HANDLING
  // ====================

  onSubmitOrder(): void {
    if (this.paymentService.isProcessingPayment || this.cartService.isEmpty()) {
      return;
    }

    this.validationErrors = [];

    if (!this.validateForms()) {
      return;
    }

    this.processCheckout();
  }

  /**
   * Enhanced form validation including billing calculations
   */
  private validateForms(): boolean {
    const baseValidation = CheckoutValidator.validateForms(
      this.formService.billingForm,
      this.formService.shippingForm,
      this.formService.guestForm,
      this.isUserAuthenticated,
      this.isGuestUser,
      this.addressService.selectedBillingAddressId,
      this.addressService.selectedShippingAddressId,
      this.addressService.showNewBillingForm,
      this.addressService.showNewShippingForm,
      this.sameAsBilling,
      this.paymentService.selectedPaymentMethod,
      this.addressService.userAddresses,
      this.cartService.isEmpty()
    );

    this.validationErrors = baseValidation.errors;

    // Add enhanced validation
    if (baseValidation.isValid) {
      return this.validateOrderWithFees();
    }

    return false;
  }

  /**
   * Enhanced order validation including fee calculations
   */
  private validateOrderWithFees(): boolean {
    const billingBreakdown = this.getBillingBreakdown();

    // Check if total is reasonable
    if (billingBreakdown.finalTotal <= 0) {
      this.addValidationErrors('Order total must be greater than zero');
      this.toastService.error('Order total must be greater than zero');

      return false;
    }

    // Check if discount is not more than original subtotal
    if (billingBreakdown.discount > billingBreakdown.originalSubtotal) {
      this.addValidationErrors('Discount amount is invalid');
      this.toastService.error('Discount amount is invalid');

      return false;
    }

    // Validate COD fee consistency
    if (this.isCODSelected && this.getCODFee() !== 10) {
      this.addValidationErrors('COD fee calculation error');
      this.toastService.error('COD fee calculation error');

      return false;
    }

    return true;
  }

  /**
   * Enhanced checkout processing with coupon handling
   */
  private async processCheckout(): Promise<void> {
    try {
      await this.addressService.saveNewAddressesIfNeeded(
        this.sameAsBilling,
        this.isGuestUser
      );

      const checkoutRequest = this.prepareEnhancedCheckoutRequest();
      this.executeCheckoutWithCouponHandling(checkoutRequest);
    } catch (error) {
      console.error('Failed to save addresses:', error);
      this.addValidationErrors('Failed to save address information');
      this.toastService.error('Failed to save address information');
    }
  }

  /**
   * Enhanced checkout request preparation to include all fees
   */
  private prepareEnhancedCheckoutRequest(): CheckoutRequest {
    const billingData = this.formService.billingForm.value;
    const billingAddress = AddressFormatter.formatBillingAddress(billingData);

    let shippingAddress = billingAddress;
    if (!this.sameAsBilling) {
      const shippingData = this.formService.shippingForm.value;
      shippingAddress = AddressFormatter.formatShippingAddress(shippingData);
    }

    const billingBreakdown = this.getBillingBreakdown();

    const request: CheckoutRequest = {
      currency: 'EGY',
      billingAddress,
      shippingAddress,
      paymentMethod: this.paymentService.selectedPaymentMethod,
      notes: '',
      couponCode: this.couponService.getCouponCode() || undefined,
    };

    // Add expected total for validation
    (request as any).expectedTotal = billingBreakdown.finalTotal;

    // Enhanced guest user handling
    if (this.isGuestUser) {
      request.guestUserId =
        this.guestUserId || this.guestUserService.getOrCreateGuestUserId();
      request.guestEmail = this.guestEmail;

      const cartItems = this.cartService.cartItems();
      if (cartItems?.length > 0) {
        request.cartItems = cartItems.map((item) => ({
          id: item.id,
          variantId: item.variantId,
          productId: item.productId || '',
          productName: item.productName,
          sku: item.sku,
          size: item.size,
          color: item.color,
          imageUrl: item.imageUrl || '',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          originalPrice: item.originalPrice || item.unitPrice,
          variantDetails: item.variantDetails || `${item.size} - ${item.color}`,
          maxStock: item.maxStock || 999,
        }));
      }
    }

    return request;
  }

  /**
   * Execute checkout with proper coupon handling - apply coupon after order creation
   */
  private executeCheckoutWithCouponHandling(
    checkoutRequest: CheckoutRequest
  ): void {
    this.paymentService.isProcessingPayment = true;
    this.validationErrors = [];

    const validation = CheckoutValidator.validateCheckoutRequest(
      checkoutRequest,
      this.isGuestUser
    );

    if (!validation.isValid) {
      this.paymentService.isProcessingPayment = false;
      this.validationErrors = validation.errors;
      return;
    }

    this.checkoutService
      .processCheckout(checkoutRequest)
      .pipe(
        switchMap((checkoutResponse) => {
          // If coupon was applied in UI, apply it to the created order
          if (
            this.couponService.isCouponApplied() &&
            checkoutResponse.orderId
          ) {
            console.log(
              'Applying coupon to created order:',
              checkoutResponse.orderId
            );
            return this.couponService
              .applyCouponToOrder(checkoutResponse.orderId)
              .pipe(
                map((couponResponse) => ({
                  ...checkoutResponse,
                  couponApplied: !!couponResponse?.success,
                  couponResponse: couponResponse,
                }))
              );
          }
          return of({ ...checkoutResponse, couponApplied: false });
        }),
        takeUntil(this.destroy$),
        finalize(() => (this.paymentService.isProcessingPayment = false))
      )
      .subscribe({
        next: (response) => {
          try {
            // Log successful coupon application if it occurred
            if (response.couponApplied) {
              console.log(
                'Coupon successfully applied to order:',
                response.orderId
              );
              this.logCheckoutAnalytics('coupon_applied_to_order', {
                orderId: response.orderId,
                couponCode: this.couponService.getCouponCode(),
              });
            }

            this.paymentService.handleCheckoutSuccess(
              response,
              this.isGuestUser,
              this.guestUserId || undefined
            );
          } catch (error: any) {
            this.handleError('Checkout failed: ' + error.message);
          }
        },
        error: (error) => {
          const errorMessage = CheckoutValidator.getErrorMessage(error);
          this.handleError('Checkout failed: ' + errorMessage);
          this.logCheckoutAnalytics('checkout_failed', {
            error: errorMessage,
            paymentMethod: checkoutRequest.paymentMethod,
            isGuest: this.isGuestUser,
            billingBreakdown: this.getBillingBreakdown(),
            couponAttempted: this.couponService.isCouponApplied(),
          });
        },
      });
  }

  // ====================
  // PAYPAL HANDLING
  // ====================

  private handlePayPalCallback(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        if (params['paymentId'] && params['PayerID']) {
          console.log('Handling PayPal callback:', params);
          this.executePayPalPayment(params['paymentId'], params['PayerID']);
        }
      });
  }

  private executePayPalPayment(paymentId: string, payerId: string): void {
    this.paymentService
      .executePayPalPayment(paymentId, payerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('PayPal payment executed successfully');
          this.handlePostCheckoutAccountCreation();
          this.navigateToSuccess(response, 'PayPal');
        },
        error: (error) => {
          console.error('PayPal execution failed:', error);
          this.router.navigate(['/payment/failed'], {
            queryParams: {
              error: error.message,
              isGuest: this.isGuestUser,
            },
          });
        },
      });
  }

  private navigateToSuccess(response: any, method: string): void {
    this.router.navigate(['/payment/success'], {
      queryParams: {
        paymentId: response.paymentId,
        orderId: response.orderId,
        method,
        isGuest: this.isGuestUser,
        guestEmail: this.isGuestUser ? this.guestEmail : undefined,
      },
    });
  }

  private handlePostCheckoutAccountCreation(): void {
    const createAccount =
      this.formService.guestForm.get('createAccount')?.value;

    if (this.isGuestUser && createAccount && this.guestEmail) {
      const billingData = this.formService.billingForm.value;
      const registrationData = {
        email: this.guestEmail,
        firstName: billingData.firstName,
        lastName: billingData.lastName,
        phone: billingData.phone,
        fromCheckout: true,
      };

      try {
        sessionStorage.setItem(
          'checkout_registration_data',
          JSON.stringify(registrationData)
        );
        this.router.navigate(['/auth/register'], {
          queryParams: { fromCheckout: 'true' },
        });
      } catch (error) {
        console.warn('Failed to store registration data:', error);
      }
    }
  }

  // ====================
  // UTILITY METHODS
  // ====================

  private addValidationErrors(error: string): void {
    if (!this.validationErrors.includes(error)) {
      this.validationErrors.push(error);
    }
  }

  private handleError(error: string): void {
    this.validationErrors = [error];
    this.paymentService.isProcessingPayment = false;
    console.error('Checkout error:', error);
  }

  /**
   * Enhanced checkout analytics including billing breakdown with immediate coupon feedback
   */
  private logCheckoutAnalytics(event: string, data?: any): void {
    const billingBreakdown = this.getBillingBreakdown();

    const analyticsData = {
      event,
      timestamp: new Date().toISOString(),
      isGuest: this.isGuestUser,
      guestUserId: this.guestUserId,
      cartItemsCount: this.cartService.cartItems().length,
      paymentMethod: this.paymentService.selectedPaymentMethod,
      couponApplied: this.couponService.isCouponApplied(),
      couponCode: this.couponService.getCouponCode(),
      billingBreakdown: billingBreakdown,
      ...data,
    };

    console.log('Enhanced Checkout Analytics:', analyticsData);
  }

  /**
   * Track billing summary interactions
   */
  onBillingSummaryInteraction(action: string, details?: any): void {
    this.logCheckoutAnalytics('billing_summary_interaction', {
      action: action,
      details: details,
      currentBreakdown: this.getBillingBreakdown(),
    });
  }

  // ====================
  // TEMPLATE HELPERS
  // ====================

  getFieldError(formGroup: any, fieldName: string): string {
    return this.formService.getFieldError(formGroup, fieldName);
  }

  isFieldInvalid(formGroup: any, fieldName: string): boolean {
    return this.formService.isFieldInvalid(formGroup, fieldName);
  }

  getCheckoutProgress(): number {
    return CheckoutValidator.getCheckoutProgress(
      this.formService.billingForm.valid,
      this.formService.shippingForm.valid,
      this.sameAsBilling,
      this.paymentService.selectedPaymentMethod,
      this.isGuestEmailValid()
    );
  }

  // ====================
  // GETTERS
  // ====================

  get cartItems() {
    return this.cartService.cartItems();
  }

  get cartSummary() {
    return this.cartService.cartSummary();
  }

  get shouldShowGuestForm(): boolean {
    return this.isGuestUser;
  }

  get isPayPalSelected(): boolean {
    return this.paymentService.isPayPalSelected();
  }

  get isCODSelected(): boolean {
    return this.paymentService.isCODSelected();
  }

  private isGuestEmailValid(): boolean {
    return this.isGuestUser
      ? !!(this.guestEmail && CheckoutValidator.isValidEmail(this.guestEmail))
      : true;
  }
}
