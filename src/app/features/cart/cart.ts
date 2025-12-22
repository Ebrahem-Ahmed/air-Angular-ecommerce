import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, finalize } from 'rxjs';

import { CartService, CartItem } from './cart.service';
import { WishlistItem, WishlistService } from '../wishlist/wishlist.service';
import { VariantSelectorComponent } from '../../shared/components/variant-selector.component';
import { ToastService } from '../../core/services/toast.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, VariantSelectorComponent, TranslateModule],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class Cart implements OnInit, OnDestroy {
  // Services
  public cartService = inject(CartService);
  public wishlistService = inject(WishlistService);
  private router = inject(Router);
  public toastService = inject(ToastService);

  // Component state
  public destroy$ = new Subject<void>();
  public isUpdating = signal(new Set<string>());
  public isAddingToCart = signal(new Set<string>());
  public isCheckingOut = signal(false);
  public isValidating = signal(false);
  public appliedPromoCode = signal<string | null>(null);
  public validationErrors = signal<string[]>([]);

  // Wishlist variant selector state
  public showWishlistVariantSelector = signal(false);
  public selectedWishlistProduct = signal<WishlistItem | null>(null);

  // Computed properties
  public cartItems = this.cartService.cartItems;
  public cartSummary = this.cartService.cartSummary;
  public wishlistItems = this.wishlistService.wishlistItems;

  // Toast notification from wishlist service
  public currentToast = this.wishlistService.currentToast;

  ngOnInit() {
    this.validateCartPeriodically();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // TrackBy functions for performance
  trackByCartItem(index: number, item: CartItem): string {
    return item.id;
  }

  trackByWishlistItem(index: number, item: WishlistItem): string {
    return item.id;
  }

  // CART MANAGEMENT METHODS

  updateQuantity(cartItemId: string, event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newQuantity = parseInt(target.value);

    if (newQuantity === 0) {
      this.removeItem(cartItemId);
      return;
    }

    this.setUpdating(cartItemId, true);

    this.cartService
      .updateQuantity(cartItemId, newQuantity)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.setUpdating(cartItemId, false))
      )
      .subscribe({
        next: (success) => {
          this.toastService.success('Quantity updated');
          if (!success) {
            // Revert the select value if update failed
            target.value =
              this.cartService.getCartItem(cartItemId)?.quantity.toString() ||
              '1';
          }
        },
        error: (error: any) => {
          this.toastService.error('Error updating quantity');
          console.error('Error updating quantity:', error);
          // Revert the select value
          target.value =
            this.cartService.getCartItem(cartItemId)?.quantity.toString() ||
            '1';
          this.showError('Failed to update quantity: ' + error.message);
        },
      });
  }

  onQuantityChange(cartItemId: string, newQuantity: number): void {
    if (newQuantity === 0) {
      this.removeItem(cartItemId);
      return;
    }

    this.setUpdating(cartItemId, true);

    this.cartService
      .updateQuantity(cartItemId, newQuantity)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.setUpdating(cartItemId, false))
      )
      .subscribe({
        next: (success) => {
          this.toastService.success('Quantity updated');
          if (!success) {
            this.showError('Failed to update quantity');
          }
          // The service will automatically update the signal,
          // and ngModel will sync with the current value
        },
        error: (error: any) => {
          this.toastService.error('Error updating quantity');
          console.error('Error updating quantity:', error);
          this.showError('Failed to update quantity: ' + error.message);
          // ngModel will automatically revert to the service's current value
        },
      });
  }

  removeItem(cartItemId: string): void {
    {
      this.setUpdating(cartItemId, true);

      this.cartService
        .removeItem(cartItemId)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => this.setUpdating(cartItemId, false))
        )
        .subscribe({
          next: () => {
            // Item removed successfully
            this.toastService.success('Item removed from bag');
          },
          error: (error: any) => {
            this.toastService.error('Error removing item');
            console.error('Error removing item:', error);
            this.showError('Failed to remove item: ' + error.message);
          },
        });
    }
  }

  editItem(event: Event, item: CartItem): void {
    event.preventDefault();
    // Navigate to product page or open edit modal
    this.router.navigate(['/products', item.productId], {
      queryParams: { variant: item.variantId },
    });
  }

  getQuantityOptions(item: CartItem): number[] {
    const maxQty = Math.min(item.maxStock || 10, 10);
    return Array.from({ length: maxQty }, (_, i) => i + 1);
  }

  // CHECKOUT FUNCTIONALITY

  proceedToCheckout(): void {
    this.isCheckingOut.set(true);

    // Validate cart before checkout
    this.cartService
      .validateCart()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isCheckingOut.set(false))
      )
      .subscribe({
        next: (validation) => {
          if (validation.isValid) {
            // Navigate to checkout
            this.router.navigate(['/checkout']);
          } else {
            this.validationErrors.set(validation.errors);
            this.showError('Please resolve cart issues before checkout');
          }
        },
        error: (error: any) => {
          this.toastService.error('Error validating cart');
          console.error('Checkout validation failed:', error);
          this.showError('Checkout validation failed. Please try again.');
        },
      });
  }

  // WISHLIST FUNCTIONALITY

  getWishlistPreview(): WishlistItem[] {
    return this.wishlistItems().slice(0, 4); // Show first 4 items
  }

  toggleProductWishlist(product: any): void {
    const isInWishlist = this.isInWishlist(product.id);
    this.wishlistService
      .toggleWishlist(product)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const message = isInWishlist
            ? 'Removed from wishlist'
            : 'Added to wishlist';
          this.showSuccess(message);
          this.toastService.success(message);
        },
        error: (error: any) => {
          this.toastService.error('Error updating wishlist');
          console.error('Error toggling wishlist:', error);
          this.showError('Failed to update wishlist');
        },
      });
  }

  isInWishlist(productId: string): boolean {
    return this.wishlistService.isInWishlist(productId);
  }

  // WISHLIST VARIANT SELECTOR METHODS

  /**
   * Open variant selector for wishlist item with multiple variants
   */
  openWishlistVariantSelector(item: WishlistItem, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    if (!this.hasAvailableVariants(item)) {
      this.showError('No variants available for this product');
      return;
    }
    // Multiple variants - open selector
    this.selectedWishlistProduct.set(item);
    this.showWishlistVariantSelector.set(true);
  }

  /**
   * Close variant selector modal
   */
  onWishlistVariantSelectorClose(): void {
    this.showWishlistVariantSelector.set(false);
    this.selectedWishlistProduct.set(null);
  }

  /**
   * Handle variant addition result from variant selector
   */
  onWishlistVariantAdded(result: { success: boolean; message: string }): void {
    if (result.success) {
      this.toastService.success(result.message);
      this.showSuccess(result.message);
    } else {
      this.toastService.error(result.message);
      this.showError(result.message);
    }

    // Close the variant selector
    this.onWishlistVariantSelectorClose();
  }

  /**
   * Updated addWishlistItemToCart method to use variant selector
   */
  addWishlistItemToCart(item: WishlistItem, event?: Event): void {
    // Use the new openWishlistVariantSelector method
    this.openWishlistVariantSelector(item, event);
  }

  // WISHLIST VARIANT UTILITY METHODS

  /**
   * Check if wishlist item has available variants
   */
  hasAvailableVariants(item: WishlistItem): boolean {
    return this.getAvailableVariants(item).length > 0;
  }

  /**
   * Get available variants for a wishlist item
   */
  getAvailableVariants(item: WishlistItem): any[] {
    return (
      item.variants?.filter((v) => v.isAvailable && v.stockQuantity > 0) || []
    );
  }

  /**
   * Get available variant count for display
   */
  getAvailableVariantCount(item: WishlistItem): number {
    return this.getAvailableVariants(item).length;
  }

  /**
   * Get stock status text for wishlist items
   */
  getStockStatus(item: WishlistItem): string {
    if (!item.isAvailable) return 'Out of Stock';

    const availableVariants = this.getAvailableVariants(item);

    if (availableVariants.length === 0) return 'Out of Stock';

    const totalStock = availableVariants.reduce(
      (sum, v) => sum + v.stockQuantity,
      0
    );

    if (totalStock === 0) return 'Out of Stock';
    if (totalStock < 5) return 'Low Stock';
    return 'In Stock';
  }

  /**
   * Get stock status CSS class
   */
  getStockStatusClass(item: WishlistItem): string {
    const status = this.getStockStatus(item);
    if (status === 'Out of Stock') return 'text-danger';
    if (status === 'Low Stock') return 'text-warning';
    return 'text-success';
  }

  /**
   * Navigate to product page
   */
  navigateToProduct(item: WishlistItem): void {
    this.router.navigate(['/products', item.productId]);
  }

  /**
   * Navigate to full wishlist page
   */
  navigateToWishlist(): void {
    this.router.navigate(['/wishlist']);
  }

  /**
   * Enhanced toggle wishlist method with event handling
   */
  toggleWishlist(item: WishlistItem, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    this.wishlistService
      .removeFromWishlist(item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result.success) {
            this.showSuccess(`"${item.productName}" removed from wishlist`);
            this.toastService.success(
              `"${item.productName}" removed from wishlist`
            );
          } else {
            this.toastService.error(result.message);
            this.showError(result.message || 'Failed to remove from wishlist');
          }
        },
        error: (error: any) => {
          this.toastService.error('Error removing from wishlist');
          console.error('Error removing from wishlist:', error);
          this.showError('Failed to remove from wishlist');
        },
      });
  }

  // UTILITY FUNCTIONS

  formatPrice(price: number): string {
    return `EGP ${price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  getDiscountPercentage(currentPrice: number, originalPrice: number): number {
    return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
  }

  continueShopping(): void {
    this.router.navigate(['/home']);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    this.toastService.error('Error loading image, using placeholder');
    img.src =
                  '/Icons/info.jpg'
  }

  // PRIVATE HELPER METHODS

  public validateCartPeriodically(): void {
    // Validate cart every 5 minutes
    setInterval(() => {
      if (!this.cartService.isEmpty()) {
        this.validateCart();
      }
    }, 5 * 60 * 1000);

    // Initial validation
    if (!this.cartService.isEmpty()) {
      this.validateCart();
    }
  }

  public validateCart(): void {
    this.isValidating.set(true);

    this.cartService
      .validateCart()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isValidating.set(false))
      )
      .subscribe({
        next: (validation) => {
          this.validationErrors.set(validation.errors);
          if (validation.errors.length > 0) {
            console.warn('Cart validation issues:', validation.errors);
          }
        },
        error: (error: any) => {
          console.error('Cart validation error:', error);
        },
      });
  }

  public setUpdating(itemId: string, isUpdating: boolean): void {
    const current = new Set(this.isUpdating());
    if (isUpdating) {
      current.add(itemId);
    } else {
      current.delete(itemId);
    }
    this.isUpdating.set(current);
  }

  public setAddingToCart(itemId: string, isAdding: boolean): void {
    const current = new Set(this.isAddingToCart());
    if (isAdding) {
      current.add(itemId);
    } else {
      current.delete(itemId);
    }
    this.isAddingToCart.set(current);
  }

  public showSuccess(message: string): void {
    // Use wishlist service toast notification system
    this.wishlistService.showToast({
      message,
      type: 'success',
    });
  }

  public showError(message: string): void {
    // Use wishlist service toast notification system
    this.wishlistService.showToast({
      message,
      type: 'error',
    });
  }
}
