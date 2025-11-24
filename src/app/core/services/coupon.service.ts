import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from './api.service.ts.service';

// Response interfaces
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

// Coupon DTOs
export interface CouponDto {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumOrderAmount?: number;
  maxDiscountAmount?: number;
  startDate: Date;
  endDate: Date;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  createdAt: Date;
}

export interface CouponListResult {
  coupons: CouponDto[];
  totalCount: number;
}

export interface CouponDetailsDTO {
  couponDto: CouponDto;
  usageStatistics: {
    totalUsages: number;
    totalDiscountApplied: number;
    averageDiscountPerUse: number;
    uniqueOrdersCount: number;
  };
}

export interface CouponCreateDto {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumOrderAmount?: number;
  maxDiscountAmount?: number;
  startDate: Date;
  endDate: Date;
  usageLimit?: number;
  isActive: boolean;
}

export interface CouponUpdateDto {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumOrderAmount?: number;
  maxDiscountAmount?: number;
  startDate: Date;
  endDate: Date;
  usageLimit?: number;
  isActive: boolean;
}

// Application DTOs
export interface ApplyCouponToCartRequest {
  couponCode: string;
  cartTotal: number;
}

export interface ApplyCouponRequestDto {
  orderId: string;
  couponCode: string;
}

export interface CouponApplicationResult {
  success: boolean;
  message: string;
  discountApplied?: number;
  newTotal?: number;
}

// Order Coupon DTOs
export interface OrderCouponDto {
  id: string;
  orderId: string;
  couponId: string;
  coupon?: CouponDto;
  discountApplied: number;
  appliedAt: Date;
}

export interface OrderCouponCreateDto {
  orderId: string;
  couponId: string;
  discountApplied: number;
}

export interface OrderCouponUpdateDto {
  id: string;
  orderId: string;
  couponId: string;
  discountApplied: number;
}

export interface CouponStatistics {
  totalApplications: number;
  totalDiscountAmount: number;
  averageDiscountPerApplication: number;
  uniqueOrdersCount: number;
  uniqueCouponsUsed: number;
  couponId?: string;
  topCoupons?: Array<{
    couponId: string;
    usageCount: number;
    totalDiscount: number;
    couponCode: string;
  }>;
}

@Injectable({
  providedIn: 'root',
})
export class CouponService {
  private apiService = inject(ApiService);

  // Main Coupon Operations

  /**
   * Get filtered and paginated coupons
   */
  getCoupons(
    search?: string,
    status: string = 'all',
    page: number = 1,
    pageSize: number = 10
  ): Observable<PaginatedResponse<CouponListResult>> {
    const params: any = {
      page: page.toString(),
      pageSize: pageSize.toString(),
      status: status,
    };

    if (search) {
      params.search = search;
    }

    return this.apiService.get<PaginatedResponse<CouponListResult>>(
      'coupon/order-coupons',
      params
    );
  }

  /**
   * Get coupon details by ID
   */
  getCouponDetails(id: string): Observable<ApiResponse<CouponDetailsDTO>> {
    return this.apiService.get<ApiResponse<CouponDetailsDTO>>(`coupon/${id}`);
  }

  /**
   * Get coupon for editing
   */
  getCouponForEdit(id: string): Observable<ApiResponse<CouponUpdateDto>> {
    return this.apiService.get<ApiResponse<CouponUpdateDto>>(
      `coupon/${id}/edit`
    );
  }

  /**
   * Create a new coupon
   */
  createCoupon(coupon: CouponCreateDto): Observable<ApiResponse<void>> {
    return this.apiService.post<ApiResponse<void>>('coupon', coupon);
  }

  /**
   * Update an existing coupon
   */
  updateCoupon(
    id: string,
    coupon: CouponUpdateDto
  ): Observable<ApiResponse<void>> {
    return this.apiService.put<ApiResponse<void>>(`coupon/${id}`, coupon);
  }

  /**
   * Toggle coupon active status
   */
  toggleCouponStatus(id: string): Observable<ApiResponse<void>> {
    return this.apiService.patch<ApiResponse<void>>(
      `coupon/${id}/toggle-status`,
      {}
    );
  }

  /**
   * Soft delete a coupon
   */
  deleteCoupon(id: string): Observable<ApiResponse<void>> {
    return this.apiService.delete<ApiResponse<void>>(`coupon/${id}`);
  }

  // Coupon Application Operations

  /**
   * Apply coupon to cart (for validation before order creation)
   */
  applyCouponToCart(
    request: ApplyCouponToCartRequest
  ): Observable<ApiResponse<CouponApplicationResult>> {
    return this.apiService.post<ApiResponse<CouponApplicationResult>>(
      'coupon/apply-to-cart',
      request
    );
  }

  /**
   * Apply coupon to an existing order
   */
  applyCouponToOrder(
    request: ApplyCouponRequestDto
  ): Observable<ApiResponse<CouponApplicationResult>> {
    return this.apiService.post<ApiResponse<CouponApplicationResult>>(
      'coupon/apply-to-order',
      request
    );
  }

  /**
   * Calculate coupon discount amount for a given order amount
   */
  calculateCouponDiscount(
    code: string,
    orderAmount: number | string
  ): Observable<
    ApiResponse<{
      couponCode: string;
      orderAmount: number;
      discountAmount: number;
      finalAmount: number;
    }>
  > {
    // Ensure orderAmount is a clean number without currency symbols
    let cleanAmount: number;

    if (typeof orderAmount === 'number') {
      cleanAmount = orderAmount;
    } else {
      // Handle string input by removing currency symbols and parsing
      const cleanString = orderAmount.toString().replace(/[^0-9.]/g, '');
      cleanAmount = parseFloat(cleanString);
    }

    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      return throwError(() => new Error('Invalid order amount'));
    }

    const params = {
      code: code.trim().toUpperCase(),
      orderAmount: cleanAmount.toString()
    };

    return this.apiService
      .get<
        ApiResponse<{
          couponCode: string;
          orderAmount: number;
          discountAmount: number;
          finalAmount: number;
        }>
      >('coupon/calculate-discount', params)
      .pipe(
        catchError((error: any) => {
          console.error('Calculate coupon discount API error:', error);
          console.error('Error status:', error.status);
          console.error('Error response body:', error.error);
          console.error('Error URL:', error.url);

          // Check if response body is HTML (indicating API routing issue)
          if (error.error && typeof error.error === 'string') {
            if (error.error.includes('<!DOCTYPE') || error.error.includes('<html')) {
              console.error('API returned HTML instead of JSON - possible routing issue');
              return throwError(
                () =>
                  new Error(
                    'API configuration error - endpoint returned HTML page instead of JSON data'
                  )
              );
            }
          }

          // Handle different error scenarios
          if (error.status === 0) {
            return throwError(() => new Error('Unable to connect to server - check if backend is running'));
          } else if (error.status === 404) {
            return throwError(() => new Error('Coupon API endpoint not found - check backend routes'));
          } else if (error.status === 400) {
            return throwError(
              () => new Error(error.error?.message || 'Invalid coupon code')
            );
          } else if (error.status === 200) {
            // Status 200 but parsing error - likely HTML response
            return throwError(
              () => new Error('API endpoint exists but returned invalid response format')
            );
          } else {
            return throwError(
              () => new Error(`Server error (${error.status}): ${error.error?.message || error.message}`)
            );
          }
        })
      );
  }

  // Order Coupon Operations

  /**
   * Get all order coupons with related data
   */
  getAllOrderCoupons(): Observable<ApiResponse<OrderCouponDto[]>> {
    return this.apiService.get<ApiResponse<OrderCouponDto[]>>(
      'coupon/GetAllOrderCoupons'
    );
  }

  /**
   * Get order coupon by ID
   */
  getOrderCouponById(id: string): Observable<ApiResponse<OrderCouponDto>> {
    return this.apiService.get<ApiResponse<OrderCouponDto>>(
      `coupon/GetOrderCouponById/${id}`
    );
  }

  /**
   * Get all coupons applied to a specific order
   */
  getCouponsByOrderId(orderId: string): Observable<
    ApiResponse<{
      data: OrderCouponDto[];
      orderId: string;
      count: number;
      totalDiscount: number;
    }>
  > {
    return this.apiService.get<
      ApiResponse<{
        data: OrderCouponDto[];
        orderId: string;
        count: number;
        totalDiscount: number;
      }>
    >(`coupon/GetCouponsByOrderId/${orderId}`);
  }

  /**
   * Get order coupon by order ID and coupon ID
   */
  getOrderCouponByOrderAndCouponId(
    orderId: string,
    couponId: string
  ): Observable<ApiResponse<OrderCouponDto>> {
    return this.apiService.get<ApiResponse<OrderCouponDto>>(
      `coupon/order/${orderId}/coupon/${couponId}`
    );
  }

  /**
   * Get total discount applied by a specific coupon across all orders
   */
  getTotalDiscountByCoupon(couponId: string): Observable<
    ApiResponse<{
      couponId: string;
      totalDiscountApplied: number;
    }>
  > {
    return this.apiService.get<
      ApiResponse<{
        couponId: string;
        totalDiscountApplied: number;
      }>
    >(`coupon/coupon/${couponId}/total-discount`);
  }

  /**
   * Get usage count for a specific coupon
   */
  getCouponUsageCount(couponId: string): Observable<
    ApiResponse<{
      couponId: string;
      usageCount: number;
    }>
  > {
    return this.apiService.get<
      ApiResponse<{
        couponId: string;
        usageCount: number;
      }>
    >(`coupon/coupon/${couponId}/usage-count`);
  }

  /**
   * Create a new order coupon record
   */
  createOrderCoupon(
    orderCoupon: OrderCouponCreateDto
  ): Observable<ApiResponse<OrderCouponDto>> {
    return this.apiService.post<ApiResponse<OrderCouponDto>>(
      'coupon/CreateOrderCoupon',
      orderCoupon
    );
  }

  /**
   * Update an existing order coupon
   */
  updateOrderCoupon(
    id: string,
    orderCoupon: OrderCouponUpdateDto
  ): Observable<ApiResponse<OrderCouponDto>> {
    return this.apiService.put<ApiResponse<OrderCouponDto>>(
      `coupon/UpdateOrderCoupon/${id}`,
      orderCoupon
    );
  }

  /**
   * Delete an order coupon record
   */
  deleteOrderCoupon(id: string): Observable<ApiResponse<void>> {
    return this.apiService.delete<ApiResponse<void>>(
      `coupon/DeleteOrderCoupon/${id}`
    );
  }

  /**
   * Get coupon statistics and analytics
   */
  getCouponStatistics(
    couponId?: string
  ): Observable<ApiResponse<CouponStatistics>> {
    const params = couponId ? { couponId } : {};

    return this.apiService.get<ApiResponse<CouponStatistics>>(
      'coupon/statistics',
      params
    );
  }

  // Utility Methods for Checkout Flow

  /**
   * Validate and apply coupon during checkout process
   * This method combines validation and application for the checkout flow
   */
  validateAndApplyCouponForCheckout(
    couponCode: string,
    cartTotal: number
  ): Observable<ApiResponse<CouponApplicationResult>> {
    const request: ApplyCouponToCartRequest = {
      couponCode,
      cartTotal,
    };

    return this.applyCouponToCart(request);
  }

  /**
   * Apply coupon to order after order creation
   * Use this method after the order is created but before payment processing
   */
  applyValidatedCouponToOrder(
    orderId: string,
    couponCode: string
  ): Observable<ApiResponse<CouponApplicationResult>> {
    const request: ApplyCouponRequestDto = {
      orderId,
      couponCode,
    };

    return this.applyCouponToOrder(request);
  }

  /**
   * Get final order total with coupon applied
   * Useful for displaying the final amount before payment
   */
  getFinalOrderTotalWithCoupon(
    originalTotal: number,
    couponCode: string
  ): Observable<number> {
    return new Observable((observer) => {
      this.calculateCouponDiscount(couponCode, originalTotal).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            observer.next(response.data.finalAmount);
          } else {
            observer.next(originalTotal); // Return original if coupon invalid
          }
          observer.complete();
        },
        error: () => {
          observer.next(originalTotal); // Return original on error
          observer.complete();
        },
      });
    });
  }

  /**
   * Validate coupon before applying (without applying)
   */
  validateCoupon(couponCode: string, orderAmount: number): Observable<boolean> {
    return new Observable((observer) => {
      this.calculateCouponDiscount(couponCode, orderAmount).subscribe({
        next: (response) => {
          observer.next(
            response.success && (response.data?.discountAmount || 0) > 0
          );
          observer.complete();
        },
        error: () => {
          observer.next(false);
          observer.complete();
        },
      });
    });
  }
}
