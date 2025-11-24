// services/cart.service.ts - ENHANCED VERSION for Guest User Support (Frontend Only)
import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service.ts.service';
import { AuthService } from '../../core/services/auth.service.ts.service';
import { GuestUserService } from '../../core/services/guestuser.service';

// Interfaces for Cart functionality
export interface CartItem {
  id: string; // Local unique ID for cart item
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  size: string;
  color: string;
  imageUrl?: string;
  unitPrice: number; // This should be the final price (sale price if exists, otherwise regular price)
  originalPrice?: number; // Store original price for reference
  salePrice?: number; // Store sale price if exists
  quantity: number;
  totalPrice: number;
  variantDetails?: string;
  maxStock?: number;
}

export interface CartSummary {
  subtotal: number;
  itemCount: number;
  totalItems: number;
  currency: string;
}

export interface ApiCartResponse {
  success: boolean;
  message?: string;
  data?: any;
  guestUserId?: string; // Added for guest user responses
}

// Interface for guest cart synchronization (for future backend implementation)
export interface GuestCartSyncRequest {
  guestUserId: string;
  cartItems: GuestCartItem[];
}

export interface GuestCartItem {
  id: string;
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

@Injectable({ providedIn: 'root' })
export class CartService {
  private api = inject(ApiService);
  private authService = inject(AuthService);
  private guestUserService = inject(GuestUserService); // Added guest user service

  private readonly CART_STORAGE_KEY = 'adidas_cart';
  private readonly CURRENCY = 'USD';

  // Reactive state management
  private cartItemsSubject = new BehaviorSubject<CartItem[]>(
    this.getCartFromStorage()
  );
  public cartItems$ = this.cartItemsSubject.asObservable();

  // Signals for modern Angular approach
  private cartItemsSignal = signal<CartItem[]>(this.getCartFromStorage());

  // Computed signals
  public cartItems = this.cartItemsSignal.asReadonly();
  public itemCount = computed(() => this.cartItemsSignal().length);
  public totalItems = computed(() =>
    this.cartItemsSignal().reduce((total, item) => total + item.quantity, 0)
  );
  public subtotal = computed(() =>
    this.cartItemsSignal().reduce((total, item) => total + item.totalPrice, 0)
  );
  public cartSummary = computed<CartSummary>(() => ({
    subtotal: this.subtotal(),
    itemCount: this.itemCount(),
    totalItems: this.totalItems(),
    currency: this.CURRENCY,
  }));
  public isEmpty = computed(() => this.cartItemsSignal().length === 0);

  constructor() {
    // Listen to auth state changes to sync cart
    this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.syncCartOnLogin();
      } else {
        // User logged out - ensure guest user ID is available
        this.guestUserService.getOrCreateGuestUserId();
      }
    });

    // Initialize cart from storage
    this.initializeCart();
  }

  private initializeCart(): void {
    const items = this.getCartFromStorage();
    this.updateCartState(items);

    // Ensure guest user has an ID if not authenticated
    if (!this.authService.isLoggedIn()) {
      this.guestUserService.getOrCreateGuestUserId();
    }
  }

  private getCartFromStorage(): CartItem[] {
    try {
      const cartData = localStorage.getItem(this.CART_STORAGE_KEY);
      return cartData ? JSON.parse(cartData) : [];
    } catch (error) {
      console.error('Error parsing cart from localStorage:', error);
      return [];
    }
  }

  private saveCartToStorage(items: CartItem[]): void {
    try {
      localStorage.setItem(this.CART_STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }

  private updateCartState(items: CartItem[]): void {
    this.cartItemsSignal.set(items);
    this.cartItemsSubject.next(items);
    this.saveCartToStorage(items);
  }

  private generateCartItemId(): string {
    return `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Calculate correct unit price (sale price if exists, otherwise regular price)
  private calculateUnitPrice(productVariant: any): {
    unitPrice: number;
    originalPrice: number;
    salePrice?: number;
  } {
    const basePrice = productVariant.product?.price || 0;
    const variantAdjustment = productVariant.priceAdjustment || 0;
    const originalPrice = basePrice + variantAdjustment;

    // Check if there's a sale price
    const salePrice =
      productVariant.product?.salePrice || productVariant.salePrice;

    // If sale price exists and is lower than original price, use sale price
    let finalUnitPrice = originalPrice;
    if (salePrice && salePrice < originalPrice) {
      finalUnitPrice = salePrice + variantAdjustment; // Apply variant adjustment to sale price too
    }

    return {
      unitPrice: finalUnitPrice,
      originalPrice: originalPrice,
      salePrice: salePrice ? salePrice + variantAdjustment : undefined,
    };
  }

  // Add item to cart with correct pricing
  addToCart(productVariant: any, quantity: number = 1): Observable<boolean> {
    try {
      const currentItems = [...this.cartItemsSignal()];

      // Calculate correct pricing
      const pricing = this.calculateUnitPrice(productVariant);

      // Check if item already exists in cart
      const existingItemIndex = currentItems.findIndex(
        (item) => item.variantId === productVariant.id
      );

      if (existingItemIndex >= 0) {
        // Update quantity of existing item
        const existingItem = currentItems[existingItemIndex];
        const newQuantity = existingItem.quantity + quantity;

        // Check stock availability
        if (
          productVariant.stockQuantity &&
          newQuantity > productVariant.stockQuantity
        ) {
          return throwError(() => new Error('Insufficient stock available'));
        }

        // Update the item with new pricing (in case prices changed)
        currentItems[existingItemIndex] = {
          ...existingItem,
          unitPrice: pricing.unitPrice,
          originalPrice: pricing.originalPrice,
          salePrice: pricing.salePrice,
          quantity: newQuantity,
          totalPrice: newQuantity * pricing.unitPrice,
        };
      } else {
        // Add new item to cart
        const cartItem: CartItem = {
          id: this.generateCartItemId(),
          variantId: productVariant.id,
          productId: productVariant.productId,
          productName: productVariant.product?.name || 'Unknown Product',
          sku: productVariant.sku,
          size: productVariant.size,
          color: productVariant.color,
          imageUrl: productVariant.imageUrl || productVariant.product?.imageUrl,
          unitPrice: pricing.unitPrice,
          originalPrice: pricing.originalPrice,
          salePrice: pricing.salePrice,
          quantity: quantity,
          totalPrice: pricing.unitPrice * quantity,
          variantDetails: `${productVariant.size} - ${productVariant.color}`,
          maxStock: productVariant.stockQuantity,
        };

        currentItems.push(cartItem);
      }

      this.updateCartState(currentItems);

      // Sync with server based on user type
      return this.syncCartWithServer();
    } catch (error) {
      return throwError(() => error);
    }
  }

  // Update item quantity with correct total calculation
  updateQuantity(cartItemId: string, newQuantity: number): Observable<boolean> {
    if (newQuantity < 1) {
      return this.removeItem(cartItemId);
    }

    try {
      const currentItems = [...this.cartItemsSignal()];
      const itemIndex = currentItems.findIndex(
        (item) => item.id === cartItemId
      );

      if (itemIndex === -1) {
        return throwError(() => new Error('Item not found in cart'));
      }

      const item = currentItems[itemIndex];

      // Check stock availability
      if (item.maxStock && newQuantity > item.maxStock) {
        return throwError(() => new Error('Insufficient stock available'));
      }

      currentItems[itemIndex] = {
        ...item,
        quantity: newQuantity,
        totalPrice: newQuantity * item.unitPrice,
      };

      this.updateCartState(currentItems);

      // Sync with server
      return this.syncCartWithServer();
    } catch (error) {
      return throwError(() => error);
    }
  }

  // Remove item from cart
  removeItem(cartItemId: string): Observable<boolean> {
    try {
      const currentItems = this.cartItemsSignal().filter(
        (item) => item.id !== cartItemId
      );
      this.updateCartState(currentItems);

      // Sync with server
      return this.syncCartWithServer();
    } catch (error) {
      return throwError(() => error);
    }
  }

  // Clear entire cart with guest/auth user handling
  clearCart(): Observable<boolean> {
    try {
      this.updateCartState([]);

      // Clear from server for authenticated users only
      if (this.authService.isLoggedIn()) {
        return this.api.delete<ApiCartResponse>('cart/clear').pipe(
          map((response) => response.success),
          catchError(() => of(true)) // Continue even if server call fails
        );
      } else {
        // For guest users, only clear local storage
        console.log('Guest user cart cleared from local storage');
        return of(true);
      }
    } catch (error) {
      return throwError(() => error);
    }
  }

  // Get cart item by ID
  getCartItem(cartItemId: string): CartItem | undefined {
    return this.cartItemsSignal().find((item) => item.id === cartItemId);
  }

  // Check if product variant is in cart
  isInCart(variantId: string): boolean {
    return this.cartItemsSignal().some((item) => item.variantId === variantId);
  }

  // Get quantity of specific variant in cart
  getQuantityInCart(variantId: string): number {
    const item = this.cartItemsSignal().find(
      (item) => item.variantId === variantId
    );
    return item ? item.quantity : 0;
  }

  // Sync cart with server for authenticated users, local storage for guests
  private syncCartWithServer(): Observable<boolean> {
    if (this.authService.isLoggedIn()) {
      // Authenticated user sync
      const cartItems = this.cartItemsSignal().map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }));

      return this.api
        .post<ApiCartResponse>('cart/sync', { items: cartItems })
        .pipe(
          map((response) => response.success),
          catchError((error) => {
            console.error('Failed to sync authenticated user cart:', error);
            return of(false);
          })
        );
    } else {
      // Guest user - only store locally
      console.log('Guest user cart stored locally only');
      const guestUserId = this.guestUserService.getOrCreateGuestUserId();
      console.log('Guest User ID:', guestUserId);

      // Save to local storage with guest ID reference
      try {
        const guestCartData = {
          guestUserId,
          items: this.cartItemsSignal(),
          lastUpdated: new Date().toISOString(),
        };
        localStorage.setItem(
          `${this.CART_STORAGE_KEY}_guest_${guestUserId}`,
          JSON.stringify(guestCartData)
        );
      } catch (error) {
        console.error('Error saving guest cart data:', error);
      }

      // Return success for local storage
      return of(true);
    }
  }

  // Convert CartItem[] to GuestCartItem[] format (for future backend integration)
  private convertToGuestCartItems(cartItems: CartItem[]): GuestCartItem[] {
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
      variantDetails: item.variantDetails || `${item.size} - ${item.color}`,
      maxStock: item.maxStock || 99,
    }));
  }

  // Sync cart when user logs in
  private syncCartOnLogin(): void {
    const localCart = this.cartItemsSignal();
    if (localCart.length > 0) {
      this.syncCartWithServer().subscribe({
        next: (success) => {
          if (success) {
            console.log('Cart synced successfully on login');
            // Clear guest data after successful sync to authenticated account
            this.cleanupGuestCartData();
          }
        },
        error: (error) => {
          console.error('Failed to sync cart on login:', error);
        },
      });
    } else {
      // Load cart from server if local cart is empty
      this.loadCartFromServer().subscribe();
    }
  }

  // Load cart from server for authenticated users, local storage for guests
  private loadCartFromServer(): Observable<CartItem[]> {
    if (!this.authService.isLoggedIn()) {
      // For guest users, load from local storage only
      console.log('Guest user - loading from local storage only');
      const guestUserId = this.guestUserService.getGuestUserId();

      if (guestUserId) {
        try {
          const guestCartData = localStorage.getItem(
            `${this.CART_STORAGE_KEY}_guest_${guestUserId}`
          );
          if (guestCartData) {
            const parsedData = JSON.parse(guestCartData);
            if (parsedData.items && Array.isArray(parsedData.items)) {
              this.updateCartState(parsedData.items);
              return of(parsedData.items);
            }
          }
        } catch (error) {
          console.error('Error loading guest cart from local storage:', error);
        }
      }

      return of(this.getCartFromStorage());
    }

    // Authenticated user - load from server
    return this.api.get<{ success: boolean; data: any[] }>('cart').pipe(
      map((response) => {
        if (response.success && response.data) {
          const serverCartItems: CartItem[] =
            this.convertServerItemsToCartItems(response.data);
          this.updateCartState(serverCartItems);
          return serverCartItems;
        }
        return [];
      }),
      catchError((error) => {
        console.error('Failed to load cart from server:', error);
        return of([]);
      })
    );
  }

  // Convert server cart items to local CartItem format
  private convertServerItemsToCartItems(serverItems: any[]): CartItem[] {
    return serverItems.map((item: any) => {
      // Calculate proper pricing for server items too
      const pricing = this.calculateUnitPrice(item.variant || {});

      return {
        id: this.generateCartItemId(),
        variantId: item.variantId,
        productId: item.variant?.productId || '',
        productName: item.variant?.product?.name || 'Unknown Product',
        sku: item.variant?.sku || '',
        size: item.variant?.size || '',
        color: item.variant?.color || '',
        imageUrl: item.variant?.imageUrl || item.variant?.product?.imageUrl,
        unitPrice: item.unitPrice || pricing.unitPrice,
        originalPrice: pricing.originalPrice,
        salePrice: pricing.salePrice,
        quantity: item.quantity,
        totalPrice: (item.unitPrice || pricing.unitPrice) * item.quantity,
        variantDetails:
          item.variantDetails ||
          `${item.variant?.size} - ${item.variant?.color}`,
        maxStock: item.variant?.stockQuantity,
      };
    });
  }

  // Validate cart items with local validation for guests
  validateCart(): Observable<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const currentItems = this.cartItemsSignal();

    if (currentItems.length === 0) {
      return of({ isValid: true, errors: [] });
    }

    // For guest users, use local validation only
    if (!this.authService.isLoggedIn()) {
      console.log('Guest user - using local validation only');
      const localValidation = this.validateCartLocally(currentItems);
      return of(localValidation);
    }

    // Authenticated user - validate with server
    const variantIds = currentItems.map((item) => item.variantId);

    return this.api
      .post<{ success: boolean; data: any }>('cart/validate', { variantIds })
      .pipe(
        map((response) => {
          if (response.success && response.data) {
            const validationResults = response.data;
            const updatedItems = [...currentItems];
            let hasChanges = false;

            for (const item of updatedItems) {
              const validation = validationResults.find(
                (v: any) => v.variantId === item.variantId
              );
              if (validation) {
                if (!validation.isAvailable) {
                  errors.push(
                    `${item.productName} (${item.variantDetails}) is no longer available`
                  );
                } else if (validation.stockQuantity < item.quantity) {
                  errors.push(
                    `Only ${validation.stockQuantity} items available for ${item.productName} (${item.variantDetails})`
                  );
                  item.quantity = validation.stockQuantity;
                  item.totalPrice = item.quantity * item.unitPrice;
                  item.maxStock = validation.stockQuantity;
                  hasChanges = true;
                } else if (
                  validation.currentPrice &&
                  validation.currentPrice !== item.unitPrice
                ) {
                  errors.push(
                    `Price updated for ${item.productName} (${item.variantDetails})`
                  );
                  item.unitPrice = validation.currentPrice;
                  item.totalPrice = item.quantity * validation.currentPrice;
                  hasChanges = true;
                }
              }
            }

            if (hasChanges) {
              this.updateCartState(updatedItems);
            }

            return { isValid: errors.length === 0, errors };
          }
          return { isValid: true, errors: [] };
        }),
        catchError(() =>
          of({ isValid: true, errors: ['Failed to validate cart'] })
        )
      );
  }

  // Basic local validation for guest users
  private validateCartLocally(items: CartItem[]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Basic validation - check for required fields
    for (const item of items) {
      if (!item.variantId || !item.productId) {
        errors.push(
          `Invalid item found in cart: ${item.productName || 'Unknown item'}`
        );
      }
      if (item.quantity <= 0) {
        errors.push(`Invalid quantity for ${item.productName || 'item'}`);
      }
      if (item.unitPrice <= 0) {
        errors.push(`Invalid price for ${item.productName || 'item'}`);
      }
      // Basic stock check based on maxStock if available
      if (item.maxStock && item.quantity > item.maxStock) {
        errors.push(
          `Only ${item.maxStock} items available for ${item.productName} (${item.variantDetails})`
        );
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  // Convert cart to order items format with correct pricing
  getOrderItems(): any[] {
    return this.cartItemsSignal().map((item) => ({
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      productName: item.productName,
      variantDetails: item.variantDetails,
    }));
  }

  // Get cart items in guest format for future API calls
  getGuestCartItems(): GuestCartItem[] {
    return this.convertToGuestCartItems(this.cartItemsSignal());
  }

  // Helper method to get total savings if using sale prices
  getTotalSavings(): number {
    return this.cartItemsSignal().reduce((total, item) => {
      if (
        item.salePrice &&
        item.originalPrice &&
        item.salePrice < item.originalPrice
      ) {
        const savings = (item.originalPrice - item.unitPrice) * item.quantity;
        return total + savings;
      }
      return total;
    }, 0);
  }

  // Helper method to check if cart has any sale items
  hasSaleItems(): boolean {
    return this.cartItemsSignal().some(
      (item) => item.salePrice && item.salePrice < (item.originalPrice || 0)
    );
  }

  // Get current guest user ID if applicable
  getCurrentGuestUserId(): string | null {
    return this.authService.isLoggedIn()
      ? null
      : this.guestUserService.getOrCreateGuestUserId();
  }

  // Check if current session is guest user
  isGuestUser(): boolean {
    return !this.authService.isLoggedIn();
  }

  // Transfer guest cart to authenticated user account
  transferGuestCartToUser(): Observable<boolean> {
    if (this.authService.isLoggedIn()) {
      // Already authenticated, sync normally
      return this.syncCartWithServer();
    }
    return of(false);
  }

  // Cleanup guest cart data when no longer needed
  cleanupGuestCartData(): void {
    if (this.authService.isLoggedIn()) {
      // Clean up guest-specific cart data
      const guestUserId = this.guestUserService.getGuestUserId();
      if (guestUserId) {
        try {
          localStorage.removeItem(
            `${this.CART_STORAGE_KEY}_guest_${guestUserId}`
          );
        } catch (error) {
          console.error('Error cleaning up guest cart data:', error);
        }
      }

      // Clear guest user service data
      this.guestUserService.clearGuestData();
    }
  }

  // NEW: Method to merge guest cart with authenticated user cart on login
  mergeGuestCartWithUserCart(): Observable<boolean> {
    if (!this.authService.isLoggedIn()) {
      return of(false);
    }

    const guestCart = this.cartItemsSignal();
    if (guestCart.length === 0) {
      return of(true);
    }

    // Load user's existing cart from server and merge
    return this.api.get<{ success: boolean; data: any[] }>('cart').pipe(
      switchMap((response) => {
        let serverCartItems: CartItem[] = [];

        if (response.success && response.data) {
          serverCartItems = this.convertServerItemsToCartItems(response.data);
        }

        // Merge guest cart with server cart
        const mergedCart = this.mergeCartItems(guestCart, serverCartItems);
        this.updateCartState(mergedCart);

        // Sync merged cart to server
        return this.syncCartWithServer();
      }),
      catchError((error) => {
        console.error('Failed to merge guest cart with user cart:', error);
        // If server call fails, just keep guest cart and sync
        return this.syncCartWithServer();
      })
    );
  }

  // Helper method to merge two cart arrays
  private mergeCartItems(
    guestCart: CartItem[],
    serverCart: CartItem[]
  ): CartItem[] {
    const mergedCart = [...serverCart];

    for (const guestItem of guestCart) {
      const existingIndex = mergedCart.findIndex(
        (item) => item.variantId === guestItem.variantId
      );

      if (existingIndex >= 0) {
        // Item exists, combine quantities
        const existingItem = mergedCart[existingIndex];
        mergedCart[existingIndex] = {
          ...existingItem,
          quantity: existingItem.quantity + guestItem.quantity,
          totalPrice:
            (existingItem.quantity + guestItem.quantity) *
            existingItem.unitPrice,
        };
      } else {
        // New item, add to cart with new ID
        mergedCart.push({
          ...guestItem,
          id: this.generateCartItemId(),
        });
      }
    }

    return mergedCart;
  }
}
