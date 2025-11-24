// services/order.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { ApiService } from './api.service.ts.service';
import { AuthService } from './auth.service.ts.service';
import { CartService } from '../../features/cart/cart.service';

// Order Interfaces
export interface OrderItem {
  id?: string;
  variantId: string;
  productName: string;
  sku: string;
  size: string;
  color: string;
  imageUrl?: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  variantDetails: string;
}

export interface Order {
  id: string;
  userId: string;
  orderNumber: string;
  orderDate: string;
  orderStatus: OrderStatus;
  shippingAddress: string;
  billingAddress: string;
  currency: string;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  couponCode?: string;
  paymentMethod: string;
  notes?: string;
  orderItems: OrderItem[];
  createdAt: string;
  updatedAt: string;
  isGuestUser?: boolean;
  guestEmail?: string;
}

export interface OrderSummary {
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  itemCount: number;
  currency: string;
  couponApplied?: string;
  orderItems: OrderItem[];
  shippingAddress?: string;
  billingAddress?: string;
}

export interface BillingSummary {
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  couponCode?: string;
  orderItems: OrderItem[];
}

// Updated interface to match your API controller
export interface CreateOrderFromCartRequest {
  shippingAddress: string;
  billingAddress: string;
  currency: string; // Fixed typo from "currancy"
  couponCode?: string;
  paymentMethod: string;
  notes?: string;

  // Guest user properties
  guestUserId?: string;
  guestEmail?: string;
  cartItems?: GuestCartItem[]; // Cart items from localStorage for guest users
}

// Interface matching your API's GuestCartItemDto
export interface GuestCartItem {
  id: string; // cart_1756138522402_iwbmzvdxx
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  size: string;
  color: string;
  imageUrl: string;
  unitPrice: number;
  originalPrice: number;
  quantity: number;
  totalPrice: number;
  variantDetails: string;
  maxStock: number;
}

export interface UpdateOrderStatusRequest {
  status: string;
}

export interface CancelOrderRequest {
  cancellationReason?: string;
}

export interface OrderHistoryResponse {
  orders: Order[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
}

export interface OrderTrackingInfo {
  orderId: string;
  orderStatus: OrderStatus;
  trackingNumber?: string;
  estimatedDelivery?: string;
  trackingSteps: TrackingStep[];
}

export interface TrackingStep {
  status: string;
  description: string;
  timestamp: string;
  location?: string;
}

export enum OrderStatus {
  Pending = 'Pending',
  Processing = 'Processing',
  Shipped = 'Shipped',
  Delivered = 'Delivered',
  Cancelled = 'Cancelled',
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  guestUserId?: string; // For guest checkout responses
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private api = inject(ApiService);
  private authService = inject(AuthService);
  private cartService = inject(CartService);

  // Reactive state management
  private ordersSubject = new BehaviorSubject<Order[]>([]);
  private activeOrderSubject = new BehaviorSubject<Order | null>(null);

  public orders$ = this.ordersSubject.asObservable();
  public activeOrder$ = this.activeOrderSubject.asObservable();

  // Signals for modern Angular approach
  private ordersSignal = signal<Order[]>([]);
  private activeOrderSignal = signal<Order | null>(null);
  private isLoadingSignal = signal<boolean>(false);

  public orders = this.ordersSignal.asReadonly();
  public activeOrder = this.activeOrderSignal.asReadonly();
  public isLoading = this.isLoadingSignal.asReadonly();

  constructor() {
    // Load orders when user is authenticated
    this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.loadUserOrders();
      } else {
        this.clearOrderState();
      }
    });
  }

  /**
   * Get checkout summary with cart items and potential discounts
   */
  getCheckoutSummary(couponCode?: string): Observable<OrderSummary> {
    const params = couponCode ? { couponCode } : undefined;

    return this.api
      .get<ApiResponse<OrderSummary>>('checkout/summary', params)
      .pipe(
        map((response) => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.message || 'Failed to get checkout summary');
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Get billing summary for payment processing
   */
  getBillingSummary(promoCode?: string): Observable<BillingSummary> {
    const params = promoCode ? { promoCode } : undefined;

    return this.api
      .get<ApiResponse<BillingSummary>>('checkout/billing-summary', params)
      .pipe(
        map((response) => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.message || 'Failed to get billing summary');
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Get all orders for the current user
   */
  getAllOrdersByUserId(): Observable<Order[]> {
    this.isLoadingSignal.set(true);

    return this.api
      .get<ApiResponse<Order[]>>('order/GetAllOrdersByUserId')
      .pipe(
        map((response) => {
          if (response.success && response.data) {
            this.updateOrdersState(response.data);
            console.log('Orders fetched:', response.data);
            return response.data;
          }
          throw new Error(response.message || 'Failed to get orders');
        }),
        tap(() => this.isLoadingSignal.set(false)),
        catchError((error) => {
          this.isLoadingSignal.set(false);
          return this.handleError(error);
        })
      );
  }

  /**
   * Get the current active/pending order for the user
   */
  getActiveOrder(): Observable<Order | null> {
    return this.api.get<ApiResponse<Order>>('order/active').pipe(
      map((response) => {
        if (response.success && response.data) {
          this.activeOrderSignal.set(response.data);
          this.activeOrderSubject.next(response.data);
          return response.data;
        }
        return null;
      }),
      catchError((error) => {
        if (error.status === 404) {
          this.activeOrderSignal.set(null);
          this.activeOrderSubject.next(null);
          return throwError(() => new Error('No active order found'));
        }
        return this.handleError(error);
      })
    );
  }

  /**
   * Get order by ID (supports both authenticated and guest users)
   */
  getOrderById(orderId: string, guestEmail?: string): Observable<Order> {
    const params = guestEmail ? { guestEmail } : undefined;

    return this.api.get<ApiResponse<Order>>(`order/${orderId}`, params).pipe(
      map((response) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || 'Failed to get order');
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Create order from cart items (supports both authenticated and guest users)
   * This now intelligently handles cart items based on user type
   */
  createOrderFromCart(request: CreateOrderFromCartRequest): Observable<Order> {
    this.isLoadingSignal.set(true);

    // Enhanced request to handle both guest and authenticated users
    const orderRequest = this.prepareOrderRequest(request);

    return this.api
      .post<ApiResponse<Order>>('order/create-from-cart', orderRequest)
      .pipe(
        map((response) => {
          if (response.success && response.data) {
            // Update orders state with new order (only for authenticated users)
            if (this.authService.isLoggedIn()) {
              const currentOrders = this.ordersSignal();
              this.updateOrdersState([response.data, ...currentOrders]);
            }

            // Store guest user ID if provided (for future reference)
            if (response.guestUserId) {
              this.storeGuestUserId(response.guestUserId);
            }

            // Clear cart after successful order creation (for all users)
            this.cartService.clearCart();

            return response.data;
          }
          throw new Error(response.message || 'Failed to create order');
        }),
        tap(() => this.isLoadingSignal.set(false)),
        catchError((error) => {
          this.isLoadingSignal.set(false);
          return this.handleError(error);
        })
      );
  }

  /**
   * Prepare order request with appropriate data for authenticated/guest users
   */
  private prepareOrderRequest(
    request: CreateOrderFromCartRequest
  ): CreateOrderFromCartRequest {
    const isAuthenticated = this.authService.isLoggedIn();

    if (!isAuthenticated) {
      // For guest users, always include cart items from localStorage
      const cartItems = this.cartService.cartItems();

      if (!cartItems || cartItems.length === 0) {
        throw new Error('Cart is empty. Cannot create order.');
      }

      // Validate guest email
      if (!request.guestEmail || !this.isValidEmail(request.guestEmail)) {
        throw new Error('Valid email address is required for guest checkout.');
      }

      // Convert cart items to match API format
      const guestCartItems: GuestCartItem[] = cartItems.map((item) => ({
        id: item.id,
        variantId: item.variantId,
        productId: item.productId || '', // Ensure productId is available
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

      return {
        ...request,
        cartItems: guestCartItems,
        guestUserId:
          request.guestUserId ||
          this.getStoredGuestUserId() ||
          `guest_${Date.now()}`,
      };
    } else {
      // For authenticated users, we have two options:
      // 1. Let the API fetch cart items from database (legacy approach)
      // 2. Include cart items from frontend (unified approach)

      // Using unified approach - always send cart items
      const cartItems = this.cartService.cartItems();

      if (cartItems && cartItems.length > 0) {
        // Convert to guest format (API will handle the conversion)
        const authUserCartItems: GuestCartItem[] = cartItems.map((item) => ({
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

        return {
          shippingAddress: request.shippingAddress,
          billingAddress: request.billingAddress,
          currency: request.currency,
          couponCode: request.couponCode,
          paymentMethod: request.paymentMethod,
          notes: request.notes,
          cartItems: authUserCartItems, // Include for unified processing
        };
      } else {
        // Fallback to legacy approach (no cart items - API fetches from DB)
        return {
          shippingAddress: request.shippingAddress,
          billingAddress: request.billingAddress,
          currency: request.currency,
          couponCode: request.couponCode,
          paymentMethod: request.paymentMethod,
          notes: request.notes,
        };
      }
    }
  }

  /**
   * Email validation helper
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Store guest user ID in localStorage for future reference
   */
  private storeGuestUserId(guestUserId: string): void {
    try {
      localStorage.setItem('guestUserId', guestUserId);
    } catch (error) {
      console.warn('Unable to store guest user ID:', error);
    }
  }

  /**
   * Get stored guest user ID from localStorage
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
   * Clear stored guest user ID
   */
  clearGuestUserId(): void {
    try {
      localStorage.removeItem('guestUserId');
    } catch (error) {
      console.warn('Unable to clear guest user ID:', error);
    }
  }

  /**
   * Update order status
   */
  updateOrderStatus(orderId: string, status: OrderStatus): Observable<Order> {
    const request: UpdateOrderStatusRequest = { status };

    return this.api
      .patch<ApiResponse<Order>>(`order/${orderId}/status`, request)
      .pipe(
        map((response) => {
          if (response.success && response.data) {
            this.updateOrderInState(response.data);
            return response.data;
          }
          throw new Error(response.message || 'Failed to update order status');
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Cancel an order (only if it's in Pending status)
   */
  cancelOrder(orderId: string, cancellationReason?: string): Observable<Order> {
    const request: CancelOrderRequest = { cancellationReason };

    return this.api
      .patch<ApiResponse<Order>>(`order/${orderId}/cancel`, request)
      .pipe(
        map((response) => {
          if (response.success && response.data) {
            this.updateOrderInState(response.data);
            return response.data;
          }
          throw new Error(response.message || 'Failed to cancel order');
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Get order history with pagination
   */
  getOrderHistory(
    page: number = 1,
    pageSize: number = 10,
    status?: OrderStatus
  ): Observable<OrderHistoryResponse> {
    const params: any = { page, pageSize };
    if (status) {
      params.status = status;
    }

    return this.api
      .get<ApiResponse<OrderHistoryResponse>>('order/history', params)
      .pipe(
        map((response) => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.message || 'Failed to get order history');
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Get order tracking information (supports both authenticated and guest users)
   */
  getOrderTracking(
    orderId: string,
    guestEmail?: string
  ): Observable<OrderTrackingInfo> {
    const params = guestEmail ? { guestEmail } : undefined;

    return this.api
      .get<ApiResponse<OrderTrackingInfo>>(`order/${orderId}/tracking`, params)
      .pipe(
        map((response) => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.message || 'Failed to get order tracking');
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Delete an order (internal use)
   */
  deleteOrder(orderId: string): Observable<boolean> {
    return this.api.delete<ApiResponse>(`order/${orderId}`).pipe(
      map((response) => {
        if (response.success) {
          // Remove from state
          const currentOrders = this.ordersSignal().filter(
            (order) => order.id !== orderId
          );
          this.updateOrdersState(currentOrders);
          return true;
        }
        throw new Error(response.message || 'Failed to delete order');
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Load user orders on initialization
   */
  private loadUserOrders(): void {
    this.getAllOrdersByUserId().subscribe({
      next: (orders) => {
        console.log('Orders loaded successfully');
      },
      error: (error) => {
        console.error('Failed to load orders:', error);
      },
    });
  }

  /**
   * Update orders state
   */
  private updateOrdersState(orders: Order[]): void {
    this.ordersSignal.set(orders);
    this.ordersSubject.next(orders);
  }

  /**
   * Update specific order in state
   */
  private updateOrderInState(updatedOrder: Order): void {
    const currentOrders = this.ordersSignal().map((order) =>
      order.id === updatedOrder.id ? updatedOrder : order
    );
    this.updateOrdersState(currentOrders);

    // Update active order if it's the same order
    if (this.activeOrderSignal()?.id === updatedOrder.id) {
      this.activeOrderSignal.set(updatedOrder);
      this.activeOrderSubject.next(updatedOrder);
    }
  }

  /**
   * Clear order state on logout
   */
  private clearOrderState(): void {
    this.ordersSignal.set([]);
    this.activeOrderSignal.set(null);
    this.ordersSubject.next([]);
    this.activeOrderSubject.next(null);
  }

  /**
   * Check if order can be cancelled
   */
  canCancelOrder(order: Order): boolean {
    return order.orderStatus === OrderStatus.Pending;
  }

  /**
   * Check if order can be modified
   */
  canModifyOrder(order: Order): boolean {
    return order.orderStatus === OrderStatus.Pending;
  }

  /**
   * Get order status display text
   */
  getOrderStatusText(status: OrderStatus): string {
    const statusMap = {
      [OrderStatus.Pending]: 'Pending',
      [OrderStatus.Processing]: 'Processing',
      [OrderStatus.Shipped]: 'Shipped',
      [OrderStatus.Delivered]: 'Delivered',
      [OrderStatus.Cancelled]: 'Cancelled',
    };
    return statusMap[status] || status;
  }

  /**
   * Get order status color for UI
   */
  getOrderStatusColor(status: OrderStatus): string {
    const colorMap = {
      [OrderStatus.Pending]: 'orange',
      [OrderStatus.Processing]: 'blue',
      [OrderStatus.Shipped]: 'purple',
      [OrderStatus.Delivered]: 'green',
      [OrderStatus.Cancelled]: 'red',
    };
    return colorMap[status] || 'gray';
  }

  /**
   * Format order total for display
   */
  formatOrderTotal(order: Order): string {
    return `${order.currency} ${order.totalAmount.toFixed(2)}`;
  }

  /**
   * Get orders by status
   */
  getOrdersByStatus(status: OrderStatus): Order[] {
    return this.ordersSignal().filter((order) => order.orderStatus === status);
  }

  /**
   * Check if current session is guest user
   */
  isGuestUser(): boolean {
    return !this.authService.isLoggedIn();
  }

  /**
   * Get current guest user ID
   */
  getCurrentGuestUserId(): string | null {
    if (this.isGuestUser()) {
      return this.getStoredGuestUserId();
    }
    return null;
  }

  /**
   * Helper method to get cart items in the correct format for API
   */
  private getFormattedCartItems(): GuestCartItem[] {
    const cartItems = this.cartService.cartItems();

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
   * Error handler
   */
  private handleError = (error: any): Observable<never> => {
    let errorMessage = 'An error occurred';

    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.status) {
      switch (error.status) {
        case 400:
          errorMessage = 'Invalid request data';
          break;
        case 401:
          errorMessage = 'Authentication required';
          break;
        case 403:
          errorMessage = 'Access denied';
          break;
        case 404:
          errorMessage = 'Order not found';
          break;
        case 422:
          errorMessage =
            'Unable to process order. Please verify your information.';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later';
          break;
        default:
          errorMessage = `Error: ${error.status}`;
      }
    }

    console.error('Order Service Error:', error);
    return throwError(() => new Error(errorMessage));
  };
}
