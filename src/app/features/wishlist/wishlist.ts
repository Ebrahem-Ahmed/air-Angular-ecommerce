// wishlist.component.ts - Updated to remove local toast component
import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import {
  WishlistService,
  WishlistItem,
  ProductVariant,
} from './wishlist.service';
import { CartService } from '../cart/cart.service';
import { AuthService } from '../../core/services/auth.service.ts.service';
import {
  FilterOptions,
  SortOptions,
} from '../../shared/models/cart-wishlist.models';
import { VariantSelectorComponent } from '../../shared/components/variant-selector.component';
import { ToastService } from '../../core/services/toast.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    VariantSelectorComponent,
    TranslateModule,
  ],
  templateUrl: './wishlist.html',
  styleUrls: ['./wishlist.scss'],
})
export class Wishlist implements OnInit, OnDestroy {
  public wishlistService = inject(WishlistService);
  private cartService = inject(CartService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  private destroy$ = new Subject<void>();

  // Component state
  isLoading = signal(false);
  searchQuery = signal('');
  selectedSort = signal<SortOptions>(SortOptions.DATE_ADDED_DESC);
  selectedFilter = signal<FilterOptions>(FilterOptions.ALL);
  selectedItems = signal<string[]>([]);
  showBulkActions = computed(() => this.selectedItems().length > 0);
  isValidating = signal(false);

  // Variant selector state
  showVariantSelector = signal(false);
  selectedProduct = signal<WishlistItem | null>(null);

  // Wishlist data
  allWishlistItems = this.wishlistService.wishlistItems;
  itemCount = this.wishlistService.itemCount;
  isEmpty = this.wishlistService.isEmpty;
  wishlistStats = computed(() => this.wishlistService.getWishlistStats());

  // Filtered and sorted items
  filteredItems = computed(() => {
    let items = this.allWishlistItems();
    const query = this.searchQuery().toLowerCase().trim();

    // Apply search filter
    if (query) {
      items = items.filter(
        (item) =>
          item.productName.toLowerCase().includes(query) ||
          (item.category && item.category.toLowerCase().includes(query)) ||
          (item.brand && item.brand.toLowerCase().includes(query)) ||
          (item.description && item.description.toLowerCase().includes(query))
      );
    }

    // Apply availability filter
    switch (this.selectedFilter()) {
      case FilterOptions.AVAILABLE:
        items = items.filter((item) => item.isAvailable);
        break;
      case FilterOptions.UNAVAILABLE:
        items = items.filter((item) => !item.isAvailable);
        break;
      case FilterOptions.IN_STOCK:
        items = items.filter(
          (item) => item.isAvailable && this.hasStockAvailable(item)
        );
        break;
      case FilterOptions.LOW_STOCK:
        items = items.filter(
          (item) => item.isAvailable && this.hasLowStock(item)
        );
        break;
    }

    // Apply sorting
    const [sortBy, order] = this.selectedSort().split('_') as [
      string,
      'asc' | 'desc'
    ];
    items.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'dateAdded':
          comparison = a.dateAdded.getTime() - b.dateAdded.getTime();
          break;
        case 'name':
          comparison = a.productName.localeCompare(b.productName);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
      }

      return order === 'desc' ? -comparison : comparison;
    });

    return items;
  });

  // Enum references for template
  SortOptions = SortOptions;
  FilterOptions = FilterOptions;

  ngOnInit(): void {
    this.initializeComponent();
    this.setupSearchDebounce();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeComponent(): void {
    // Validate wishlist items on load
    this.validateWishlist();
  }

  private setupSearchDebounce(): void {
    // Debounce search input for better performance
    // This would be implemented with a separate search input observable if needed
  }

  // VARIANT HANDLING METHODS

  // Open variant selector for product
  openVariantSelector(item: WishlistItem, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    if (!this.hasAvailableVariants(item)) {
      this.toastService.error('No variants available for this product');
      return;
    }

    this.selectedProduct.set(item);
    this.showVariantSelector.set(true);
  }

  // Quick add for products with single variant
  quickAddSingleVariant(item: WishlistItem, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const availableVariants = this.getAvailableVariants(item);
    if (availableVariants.length === 1) {
      this.addVariantToCart(item, availableVariants[0]);
    }
  }

  // Check if product has available variants
  hasAvailableVariants(item: WishlistItem): boolean {
    return this.getAvailableVariants(item).length > 0;
  }

  // Get available variants for a product
  getAvailableVariants(item: WishlistItem): ProductVariant[] {
    return (
      item.variants?.filter((v) => v.isAvailable && v.stockQuantity > 0) || []
    );
  }

  // Get available sizes for a product
  getAvailableSizes(item: WishlistItem): string[] {
    const variants = this.getAvailableVariants(item);
    return [...new Set(variants.map((v) => v.size))].filter(Boolean);
  }

  // Get available colors for a product
  getAvailableColors(item: WishlistItem): string[] {
    const variants = this.getAvailableVariants(item);
    return [...new Set(variants.map((v) => v.color))].filter(Boolean);
  }

  // Get color hex value for display
  getColorHex(colorName: string): string {
    const colorMap: { [key: string]: string } = {
      black: '#000000',
      white: '#ffffff',
      red: '#ff0000',
      blue: '#0000ff',
      green: '#008000',
      yellow: '#ffff00',
      orange: '#ffa500',
      purple: '#800080',
      pink: '#ffc0cb',
      brown: '#a52a2a',
      gray: '#808080',
      grey: '#808080',
      navy: '#000080',
      maroon: '#800000',
      olive: '#808000',
      lime: '#00ff00',
      aqua: '#00ffff',
      teal: '#008080',
      silver: '#c0c0c0',
      fuchsia: '#ff00ff',
    };
    return colorMap[colorName.toLowerCase()] || '#cccccc';
  }

  // TrackBy function for colors
  trackByColorName(index: number, color: string): string {
    return color;
  }

  // WISHLIST ITEM ACTIONS

  // Remove item from wishlist
  removeFromWishlist(item: WishlistItem, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    this.isLoading.set(true);

    this.wishlistService
      .removeFromWishlist(item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result.success) {
            // Remove from selected items if it was selected
            this.selectedItems.update((items) =>
              items.filter((id) => id !== item.id)
            );
            this.toastService.success(
              `"${item.productName}" removed from wishlist`
            );
          } else {
            this.toastService.error(
              result.message || 'Failed to remove item from wishlist'
            );
          }
          this.isLoading.set(false);
        },
        error: (error) => {
          this.toastService.error(
            `Failed to remove item: ${error.message || 'Unknown error'}`
          );
          this.isLoading.set(false);
        },
      });
  }

  // Updated addToCart method - now uses openVariantSelector
  addToCart(item: WishlistItem, event?: Event): void {
    this.openVariantSelector(item, event);
  }

  private addVariantToCart(item: WishlistItem, variant: ProductVariant): void {
    const productVariant = {
      id: variant.id,
      productId: item.productId,
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
      imageUrl: variant.imageUrl || item.imageUrl,
      stockQuantity: variant.stockQuantity,
      priceAdjustment: variant.priceAdjustment,
      product: {
        id: item.productId,
        name: item.productName,
        price: item.originalPrice || item.price,
        salePrice: item.salePrice,
        imageUrl: item.imageUrl,
      },
    };

    this.isLoading.set(true);

    this.cartService
      .addToCart(productVariant, 1)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          this.isLoading.set(false);
          if (success) {
            this.toastService.success(`"${item.productName}" added to cart!`);
          }
        },
        error: (error) => {
          this.isLoading.set(false);
          this.toastService.error(
            `Failed to add to cart: ${error.message || 'Unknown error'}`
          );
        },
      });
  }

  // VARIANT SELECTOR EVENT HANDLERS

  onVariantSelectorClose(): void {
    this.showVariantSelector.set(false);
    this.selectedProduct.set(null);
  }

  onVariantAdded(result: { success: boolean; message: string }): void {
    if (result.success) {
      this.toastService.success(result.message);
    } else {
      this.toastService.error(result.message);
    }
  }

  quickView(item: WishlistItem, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    // Navigate to product detail
    this.router.navigate(['/products', item.productId]);
  }

  // BULK ACTIONS

  toggleItemSelection(itemId: string): void {
    this.selectedItems.update((items) => {
      const index = items.indexOf(itemId);
      if (index >= 0) {
        return items.filter((id) => id !== itemId);
      } else {
        return [...items, itemId];
      }
    });
  }

  selectAllItems(): void {
    this.selectedItems.set(this.filteredItems().map((item) => item.id));
  }

  clearSelection(): void {
    this.selectedItems.set([]);
  }

  removeSelectedItems(): void {
    const selectedCount = this.selectedItems().length;
    if (!selectedCount) return;

    this.isLoading.set(true);

    const removePromises = this.selectedItems().map((itemId) =>
      this.wishlistService.removeFromWishlist(itemId).toPromise()
    );

    Promise.allSettled(removePromises).then((results) => {
      const successCount = results.filter(
        (result) => result.status === 'fulfilled'
      ).length;
      const errorCount = results.length - successCount;

      if (successCount > 0) {
        this.toastService.success(
          `${successCount} item${
            successCount > 1 ? 's' : ''
          } removed from wishlist`
        );
      }

      if (errorCount > 0) {
        this.toastService.error(
          `Failed to remove ${errorCount} item${errorCount > 1 ? 's' : ''}`
        );
      }

      this.selectedItems.set([]);
      this.isLoading.set(false);
    });
  }

  // SORTING AND FILTERING

  onSortChange(sort: SortOptions): void {
    this.selectedSort.set(sort);
  }

  onFilterChange(filter: FilterOptions): void {
    this.selectedFilter.set(filter);
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  // UTILITY ACTIONS

  clearWishlist(): void {
    this.isLoading.set(true);

    this.wishlistService
      .clearWishlist()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result.success) {
            this.selectedItems.set([]);
            this.toastService.success('Wishlist cleared successfully');
          } else {
            this.toastService.error(
              result.message || 'Failed to clear wishlist'
            );
          }
          this.isLoading.set(false);
        },
        error: (error) => {
          this.toastService.error(
            `Failed to clear wishlist: ${error.message || 'Unknown error'}`
          );
          this.isLoading.set(false);
        },
      });
  }

  validateWishlist(): void {
    this.isValidating.set(true);
    // Add validation logic here if needed
    setTimeout(() => {
      this.isValidating.set(false);
    }, 1000);
  }

  navigateToShopping(): void {
    this.router.navigate(['/products']);
  }

  navigateToAccount(): void {
    this.router.navigate(['/profile']);
  }

  // HELPER METHODS FOR TEMPLATE

  isItemSelected(itemId: string): boolean {
    return this.selectedItems().includes(itemId);
  }

  formatPrice(price: number): string {
    return `EGP ${price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

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

  getStockStatusClass(item: WishlistItem): string {
    const status = this.getStockStatus(item);
    if (status === 'Out of Stock') return 'text-danger';
    if (status === 'Low Stock') return 'text-warning';
    return 'text-success';
  }

  hasStockAvailable(item: WishlistItem): boolean {
    return this.getAvailableVariants(item).length > 0;
  }

  hasLowStock(item: WishlistItem): boolean {
    const availableVariants = this.getAvailableVariants(item);
    const totalStock = availableVariants.reduce(
      (sum, v) => sum + v.stockQuantity,
      0
    );
    return totalStock > 0 && totalStock < 5;
  }

  // TrackBy function for better performance
  trackByItemId(index: number, item: WishlistItem): string {
    return item.id;
  }

  // Get available variant count for display
  getAvailableVariantCount(item: WishlistItem): number {
    return this.getAvailableVariants(item).length;
  }
}
