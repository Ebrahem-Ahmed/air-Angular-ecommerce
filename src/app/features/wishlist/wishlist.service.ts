// services/wishlist.service.ts - Updated for Product-based Wishlist
import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service.ts.service';
import { AuthService } from '../../core/services/auth.service.ts.service';
import { CartService } from '../cart/cart.service';

// Updated interfaces for Product-based Wishlist
export interface WishlistItem {
  id: string; // Local unique ID for wishlist item
  productId: string; // Main product ID instead of variant
  productName: string;
  imageUrl?: string;
  price: number; // Base product price
  originalPrice?: number;
  salePrice?: number; // If product has sale
  isAvailable: boolean;
  variants?: ProductVariant[]; // All available variants
  dateAdded: Date;
  category?: string;
  brand?: string;
  description?: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  size: string;
  color: string;
  imageUrl?: string;
  priceAdjustment: number;
  stockQuantity: number;
  isAvailable: boolean;
}

export interface ApiWishlistResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export interface ToastNotification {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private api = inject(ApiService);
  private authService = inject(AuthService);
  private cartService = inject(CartService);

  private readonly WISHLIST_STORAGE_KEY = 'adidas_wishlist';

  // Reactive state management
  private wishlistItemsSubject = new BehaviorSubject<WishlistItem[]>(
    this.getWishlistFromStorage()
  );
  public wishlistItems$ = this.wishlistItemsSubject.asObservable();

  // Signals for modern Angular approach
  private wishlistItemsSignal = signal<WishlistItem[]>(
    this.getWishlistFromStorage()
  );

  // Toast notification signals
  private toastSignal = signal<ToastNotification | null>(null);
  public currentToast = this.toastSignal.asReadonly();

  // Computed signals
  public wishlistItems = this.wishlistItemsSignal.asReadonly();
  public itemCount = computed(() => this.wishlistItemsSignal().length);
  public isEmpty = computed(() => this.wishlistItemsSignal().length === 0);
  public availableItems = computed(() =>
    this.wishlistItemsSignal().filter((item) => item.isAvailable)
  );
  public unavailableItems = computed(() =>
    this.wishlistItemsSignal().filter((item) => !item.isAvailable)
  );

  constructor() {
    // Listen to auth state changes to sync wishlist
    this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.syncWishlistOnLogin();
      }
    });

    // Initialize wishlist from storage
    this.initializeWishlist();
  }

  private initializeWishlist(): void {
    const items = this.getWishlistFromStorage();
    this.updateWishlistState(items);
  }

  private getWishlistFromStorage(): WishlistItem[] {
    try {
      const wishlistData = localStorage.getItem(this.WISHLIST_STORAGE_KEY);
      const items = wishlistData ? JSON.parse(wishlistData) : [];
      // Convert dateAdded back to Date objects
      return items.map((item: any) => ({
        ...item,
        dateAdded: new Date(item.dateAdded),
      }));
    } catch (error) {
      console.error('Error parsing wishlist from localStorage:', error);
      return [];
    }
  }

  private saveWishlistToStorage(items: WishlistItem[]): void {
    try {
      localStorage.setItem(this.WISHLIST_STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Error saving wishlist to localStorage:', error);
    }
  }

  private updateWishlistState(items: WishlistItem[]): void {
    this.wishlistItemsSignal.set(items);
    this.wishlistItemsSubject.next(items);
    this.saveWishlistToStorage(items);
  }

  private generateWishlistItemId(): string {
    return `wishlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Toast notification methods
  showToast(notification: ToastNotification): void {
    this.toastSignal.set({
      ...notification,
      duration: notification.duration || 3000,
    });

    // Auto hide toast after duration
    setTimeout(() => {
      this.hideToast();
    }, notification.duration || 3000);
  }

  hideToast(): void {
    this.toastSignal.set(null);
  }

  // Add PRODUCT to wishlist (not variant-based)
  addToWishlist(
    product: any
  ): Observable<{ success: boolean; message: string }> {
    try {
      const currentItems = [...this.wishlistItemsSignal()];

      // Check if product already exists in wishlist
      const existingItem = currentItems.find(
        (item) => item.productId === product.id
      );

      if (existingItem) {
        this.showToast({
          message: 'Product is already in your wishlist',
          type: 'info',
        });
        return of({
          success: false,
          message: 'Product is already in your wishlist',
        });
      }

      // Map product variants to our format
      const variants: ProductVariant[] =
        product.variants?.map((v: any) => ({
          id: v.id,
          sku: v.sku || '',
          size: v.size || '',
          color: v.color || '',
          imageUrl: v.imageUrl,
          priceAdjustment: v.priceAdjustment || 0,
          stockQuantity: v.stockQuantity || 0,
          isAvailable: v.stockQuantity > 0,
        })) || [];

      // Calculate base pricing
      const basePrice = product.price || 0;
      const salePrice = product.salePrice;
      const finalPrice =
        salePrice && salePrice < basePrice ? salePrice : basePrice;

      // Add new item to wishlist
      const wishlistItem: WishlistItem = {
        id: this.generateWishlistItemId(),
        productId: product.id,
        productName: product.name || 'Unknown Product',
        imageUrl: product.imageUrl,
        price: finalPrice,
        originalPrice: basePrice,
        salePrice: salePrice,
        isAvailable: product.isAvailable && variants.some((v) => v.isAvailable),
        variants: variants,
        dateAdded: new Date(),
        category: product.category,
        brand: product.brand,
        description: product.description,
      };

      currentItems.unshift(wishlistItem); // Add to beginning of array
      this.updateWishlistState(currentItems);

      // Sync with server if user is logged in
      if (this.authService.isLoggedIn()) {
        this.addToServerWishlist(product.id).subscribe();
      }

      this.showToast({
        message: `"${product.name}" added to your wishlist`,
        type: 'success',
      });

      return of({
        success: true,
        message: `"${product.name}" added to your wishlist`,
      });
    } catch (error) {
      this.showToast({
        message: 'Failed to add item to wishlist',
        type: 'error',
      });
      return of({
        success: false,
        message: 'Failed to add item to wishlist',
      });
    }
  }

  // Remove item from wishlist
  removeFromWishlist(
    wishlistItemId?: string,
    productId?: string
  ): Observable<{ success: boolean; message: string }> {
    try {
      let currentItems = [...this.wishlistItemsSignal()];
      let removedItemName = '';

      if (wishlistItemId) {
        const itemToRemove = currentItems.find(
          (item) => item.id === wishlistItemId
        );
        if (itemToRemove) {
          removedItemName = itemToRemove.productName;
        }
        currentItems = currentItems.filter(
          (item) => item.id !== wishlistItemId
        );
      } else if (productId) {
        const itemToRemove = currentItems.find(
          (item) => item.productId === productId
        );
        if (itemToRemove) {
          removedItemName = itemToRemove.productName;
        }
        currentItems = currentItems.filter(
          (item) => item.productId !== productId
        );
      } else {
        return of({
          success: false,
          message: 'Invalid remove request',
        });
      }

      this.updateWishlistState(currentItems);

      // Sync with server if user is logged in
      if (this.authService.isLoggedIn() && productId) {
        this.removeFromServerWishlist(productId).subscribe();
      }

      const message = removedItemName
        ? `"${removedItemName}" removed from wishlist`
        : 'Item removed from wishlist';

      this.showToast({
        message,
        type: 'info',
      });

      return of({
        success: true,
        message,
      });
    } catch (error) {
      this.showToast({
        message: 'Failed to remove item from wishlist',
        type: 'error',
      });
      return of({
        success: false,
        message: 'Failed to remove item from wishlist',
      });
    }
  }

  // Clear entire wishlist
  clearWishlist(): Observable<{ success: boolean; message: string }> {
    try {
      this.updateWishlistState([]);

      // Clear from server if user is logged in
      if (this.authService.isLoggedIn()) {
        this.api.delete<ApiWishlistResponse>('wishlist/clear').subscribe();
      }

      this.showToast({
        message: 'Wishlist cleared successfully',
        type: 'info',
      });

      return of({
        success: true,
        message: 'Wishlist cleared successfully',
      });
    } catch (error) {
      this.showToast({
        message: 'Failed to clear wishlist',
        type: 'error',
      });
      return of({
        success: false,
        message: 'Failed to clear wishlist',
      });
    }
  }

  // Check if product is in wishlist
  isInWishlist(productId: string): boolean {
    return this.wishlistItemsSignal().some(
      (item) => item.productId === productId
    );
  }

  // Get wishlist item by product ID
  getWishlistItem(productId: string): WishlistItem | undefined {
    return this.wishlistItemsSignal().find(
      (item) => item.productId === productId
    );
  }

  // Toggle wishlist status (add/remove)
  toggleWishlist(
    product: any
  ): Observable<{ success: boolean; message: string }> {
    if (this.isInWishlist(product.id)) {
      return this.removeFromWishlist(undefined, product.id);
    } else {
      return this.addToWishlist(product);
    }
  }

  // Get available variants for a wishlist item
  getAvailableVariants(productId: string): ProductVariant[] {
    const item = this.getWishlistItem(productId);
    return item?.variants?.filter((v) => v.isAvailable) || [];
  }

  // Get all variants for a wishlist item
  getAllVariants(productId: string): ProductVariant[] {
    const item = this.getWishlistItem(productId);
    return item?.variants || [];
  }

  // Calculate final price for a variant
  getVariantPrice(productId: string, variantId: string): number {
    const item = this.getWishlistItem(productId);
    if (!item) return 0;

    const variant = item.variants?.find((v) => v.id === variantId);
    if (!variant) return item.price;

    return item.price + variant.priceAdjustment;
  }

  // Private methods for server sync
  private syncWishlistOnLogin(): void {
    const localWishlist = this.wishlistItemsSignal();
    if (localWishlist.length > 0) {
      this.syncWishlistWithServer().subscribe({
        next: (success) => {
          if (success) {
            console.log('Wishlist synced successfully on login');
          }
        },
        error: (error) => {
          console.error('Failed to sync wishlist on login:', error);
        },
      });
    } else {
      // Load wishlist from server if local wishlist is empty
      this.loadWishlistFromServer().subscribe();
    }
  }

  private syncWishlistWithServer(): Observable<boolean> {
    if (!this.authService.isLoggedIn()) {
      return of(false);
    }

    const productIds = this.wishlistItemsSignal().map((item) => item.productId);

    return this.api
      .post<ApiWishlistResponse>('wishlist/sync', { productIds })
      .pipe(
        map((response) => response.success),
        catchError((error) => {
          console.error('Failed to sync wishlist with server:', error);
          return of(false);
        })
      );
  }

  private loadWishlistFromServer(): Observable<WishlistItem[]> {
    if (!this.authService.isLoggedIn()) {
      return of([]);
    }

    return this.api.get<{ success: boolean; data: any[] }>('wishlist').pipe(
      map((response) => {
        if (response.success && response.data) {
          const serverWishlistItems: WishlistItem[] = response.data.map(
            (item: any) => {
              return {
                id: this.generateWishlistItemId(),
                productId: item.product?.id || item.productId,
                productName: item.product?.name || 'Unknown Product',
                imageUrl: item.product?.imageUrl,
                price: item.product?.salePrice || item.product?.price || 0,
                originalPrice: item.product?.price,
                salePrice: item.product?.salePrice,
                isAvailable: item.product?.isAvailable || false,
                variants:
                  item.product?.variants?.map((v: any) => ({
                    id: v.id,
                    sku: v.sku || '',
                    size: v.size || '',
                    color: v.color || '',
                    imageUrl: v.imageUrl,
                    priceAdjustment: v.priceAdjustment || 0,
                    stockQuantity: v.stockQuantity || 0,
                    isAvailable: v.stockQuantity > 0,
                  })) || [],
                dateAdded: new Date(
                  item.addedAt || item.createdAt || Date.now()
                ),
                category: item.product?.category,
                brand: item.product?.brand,
                description: item.product?.description,
              };
            }
          );

          this.updateWishlistState(serverWishlistItems);
          return serverWishlistItems;
        }
        return [];
      }),
      catchError((error) => {
        console.error('Failed to load wishlist from server:', error);
        return of([]);
      })
    );
  }

  private addToServerWishlist(productId: string): Observable<boolean> {
    return this.api
      .post<ApiWishlistResponse>('wishlist/add', { productId })
      .pipe(
        map((response) => response.success),
        catchError((error) => {
          console.error('Failed to add to server wishlist:', error);
          return of(true); // Continue even if server call fails
        })
      );
  }

  private removeFromServerWishlist(productId: string): Observable<boolean> {
    return this.api.delete<ApiWishlistResponse>(`wishlist/${productId}`).pipe(
      map((response) => response.success),
      catchError((error) => {
        console.error('Failed to remove from server wishlist:', error);
        return of(true); // Continue even if server call fails
      })
    );
  }

  // Get wishlist statistics
  getWishlistStats(): {
    totalItems: number;
    availableItems: number;
    unavailableItems: number;
    totalValue: number;
    averagePrice: number;
  } {
    const items = this.wishlistItemsSignal();
    const availableItems = items.filter((item) => item.isAvailable);
    const totalValue = availableItems.reduce(
      (sum, item) => sum + item.price,
      0
    );

    return {
      totalItems: items.length,
      availableItems: availableItems.length,
      unavailableItems: items.length - availableItems.length,
      totalValue,
      averagePrice:
        availableItems.length > 0 ? totalValue / availableItems.length : 0,
    };
  }
}
