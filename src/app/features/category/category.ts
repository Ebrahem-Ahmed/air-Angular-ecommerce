import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, combineLatest } from 'rxjs';

// Components
import { CategoryFilterComponent } from './category-filter/category-filter.component';
import { VariantSelectorComponent } from '../../shared/components/variant-selector.component';

// Services
import { Category } from './category.service';
import { CategoryDataService } from './category-data.service';
import {
  CategoryFilterService,
  FilterOptions,
} from './category-filter.service';
import { PaginationService, PaginationState } from './pagination.service';
import { SpecialCategoryService } from './special-category.service';
import { WishlistService } from '../wishlist/wishlist.service';

// Types
import { DisplayProduct } from './category.types';
import { VariantSelectorProduct } from '../../shared/Interfaces/product.interface';
import { ToastService } from '../../core/services/toast.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-category',
  imports: [
    CategoryFilterComponent,
    CommonModule,
    RouterModule,
    FormsModule,
    VariantSelectorComponent,
    TranslateModule,
  ],
  templateUrl: './category.html',
  styleUrl: './category.scss',
})
export class CategoryComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Injected Services
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private categoryDataService = inject(CategoryDataService);
  private categoryFilterService = inject(CategoryFilterService);
  private paginationService = inject(PaginationService);
  private specialCategoryService = inject(SpecialCategoryService);
  private wishlistService = inject(WishlistService);
  private toastService = inject(ToastService);

  // Component State
  products: DisplayProduct[] = [];
  allProducts: DisplayProduct[] = [];
  currentCategory: Category | null = null;
  breadcrumbPath: Category[] = [];
  isLoading = false;
  error: string | null = null;
  totalProducts = 0;

  // Filter and Pagination State
  currentFilters: FilterOptions = {};
  currentPage = 1;
  pageSize = 12;
  totalPages = 0;

  // Special Category State - UPDATED
  isSpecialCategoryActive = false;
  currentSpecialType: string | null = null;

  // Variant Selector State
  isVariantSelectorOpen = signal(false);
  selectedProductForVariants = signal<VariantSelectorProduct | null>(null);
  // Toast Notification State
  toastMessage = '';
  showToast = false;

  ngOnInit(): void {
    this.initializeSubscriptions();
    this.handleRouteChanges();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeSubscriptions(): void {
    // Subscribe to filter changes
    this.categoryFilterService.filters$
      .pipe(takeUntil(this.destroy$))
      .subscribe((filters) => {
        this.currentFilters = filters;
        this.applyFiltersAndPagination();
      });

    // Subscribe to pagination changes
    this.paginationService.pagination$
      .pipe(takeUntil(this.destroy$))
      .subscribe((paginationState) => {
        this.updatePaginationState(paginationState);
      });
  }

private handleRouteChanges(): void {
  this.route.params
    .pipe(takeUntil(this.destroy$))
    .subscribe((params) => {
      this.loadCategoryFromParams(params);
    });
}
private loadCategoryFromParams(params: any): void {
  const identifier =
    params['identifier'] || params['categorySlug'] || params['categoryId'];

  this.isSpecialCategoryActive = false;
  this.currentSpecialType = null;

  this.categoryFilterService.resetFilters();

  if (identifier) {
    this.loadCategoryByIdentifier(identifier);
  } else {
    this.loadAllProducts();
  }
}
  private handleRouteParams(params: any): void {
    const identifier =
      params['identifier'] || params['categorySlug'] || params['categoryId'];
    const categoryType = this.route.snapshot.data['categoryType'];

    // Reset special category state
    this.isSpecialCategoryActive = false;
    this.currentSpecialType = null;

    this.categoryFilterService.resetFilters();

    if (identifier) {
      this.loadCategoryByIdentifier(identifier);
    } else if (categoryType) {
      this.loadCategoryByType(categoryType);
    } else {
      this.loadAllProducts();
    }
  }

  private handleQueryParams(queryParams: any): void {
    // Parse query params for all categories (removed blocking logic)
    const filters = this.categoryFilterService.parseQueryParams(queryParams);
    this.categoryFilterService.updateFilters(filters);
    this.paginationService.parsePageFromQuery(queryParams);
  }

private loadCategoryByIdentifier(identifier: string): void {
  if (!identifier || identifier === 'undefined') {
    this.handleLoadError(new Error('Invalid identifier'), 'Category not found');
    return;
  }

  this.setLoadingState(true);
  console.log('Loading category with identifier:', identifier);

  if (this.specialCategoryService.isSpecialCategory(identifier)) {
    this.isSpecialCategoryActive = true;
    this.currentSpecialType = identifier.toLowerCase();
    this.loadSpecialCategory(identifier);
  } else {
    // دايمًا slug
    this.loadCategoryBySlug(identifier);
  }
}
  private loadSpecialCategory(slug: string): void {
    this.specialCategoryService
      .handleSpecialCategory(slug, this.destroy$)
      .subscribe({
        next: (result) => {
          this.handleCategoryLoadSuccess(
            result.category,
            result.products,
            result.breadcrumb
          );
          this.applySpecialCategoryDefaults(slug);
        },
        error: (error) =>
          this.handleLoadError(error, `Failed to load ${slug} category`),
      });
  }

  private loadCategoryById(categoryId: string): void {
    this.categoryDataService
      .loadCategoryById(categoryId, this.destroy$)
      .subscribe({
        next: (result) => {
          this.handleCategoryLoadSuccess(
            result.category,
            result.products,
            result.breadcrumb
          );
        },
        error: (error) =>
          this.handleLoadError(error, 'Failed to load category'),
      });
  }

  private loadCategoryBySlug(slug: string): void {
    this.categoryDataService.loadCategoryBySlug(slug, this.destroy$).subscribe({
      next: (result) => {
        this.handleCategoryLoadSuccess(
          result.category,
          result.products,
          result.breadcrumb
        );
      },
      error: (error) =>
        this.handleLoadError(error, `Category "${slug}" not found`),
    });
  }

  private loadCategoryByType(categoryType: string): void {
    this.categoryDataService
      .loadProductsByType(categoryType, this.destroy$)
      .subscribe({
        next: (result) => {
          this.handleCategoryLoadSuccess(result.category, result.products, []);
        },
        error: (error) =>
          this.handleLoadError(
            error,
            `Failed to load ${categoryType} products`
          ),
      });
  }

  private loadAllProducts(): void {
    this.setLoadingState(true);
    this.categoryDataService.loadAllProducts(this.destroy$).subscribe({
      next: (products) => {
        this.currentCategory = null;
        this.breadcrumbPath = [];
        this.handleProductsLoadSuccess(products);
      },
      error: (error) => this.handleLoadError(error, 'Failed to load products'),
    });
  }

  getProductCategoryName(product: DisplayProduct): string {
    // Use current category if we're viewing a specific category
    if (this.currentCategory && !this.isSpecialCategory()) {
      return this.currentCategory.name;
    }

    // For special categories or if no current category, try to determine
    if (product.category && product.category !== 'Men Sportswear') {
      return product.category;
    }

    // Fallback to current category or generic name
    return this.currentCategory?.name || 'Products';
  }

  private handleCategoryLoadSuccess(
    category: Category,
    products: DisplayProduct[],
    breadcrumb: Category[]
  ): void {
    this.currentCategory = category;
    this.breadcrumbPath = breadcrumb;
    this.handleProductsLoadSuccess(products);
  }

  private handleProductsLoadSuccess(products: DisplayProduct[]): void {
    this.allProducts = products;
    this.totalProducts = products.length;

    // Load variants for all products
    this.loadProductVariants(products);

    this.applyFiltersAndPagination();
    this.setLoadingState(false);
  }

  private loadProductVariants(products: DisplayProduct[]): void {
    // Load variants for each product to get sizes, colors, and availability
    products.forEach((product) => {
      this.categoryDataService
        .loadProductVariants(product, this.destroy$)
        .subscribe({
          next: (enhancedProduct) => {
            // Update the product in the array
            const index = this.allProducts.findIndex(
              (p) => p.id === enhancedProduct.id
            );
            if (index !== -1) {
              this.allProducts[index] = enhancedProduct;
              // Re-apply filters if this was the last product to load
              this.applyFiltersAndPagination();
            }
          },
          error: (error) => {
            console.error(
              `Error loading variants for product ${product.id}:`,
              error
            );
          },
        });
    });
  }

  private applySpecialCategoryDefaults(slug: string): void {
    const defaultSorting = this.categoryFilterService.getDefaultSorting(slug);
    if (defaultSorting) {
      const currentFilters = this.categoryFilterService.getCurrentFilters();
      this.categoryFilterService.updateFilters({
        ...currentFilters,
        sortBy: defaultSorting,
      });
    }

    // Apply special filters for sale category
    if (slug === 'sale') {
      const currentFilters = this.categoryFilterService.getCurrentFilters();
      this.categoryFilterService.updateFilters({
        ...currentFilters,
        onSale: true,
      });
    }
  }

  /**
   * FIXED: Now allows filtering for all categories with smart handling
   */
  private applyFiltersAndPagination(): void {
    if (this.allProducts.length === 0) return;

    let filteredProducts: DisplayProduct[];

    // Apply filters to all products - special categories can also be filtered
    filteredProducts = this.categoryFilterService.applyFilters(
      this.allProducts,
      this.currentFilters,
      this.currentSpecialType
    );

    // Apply sorting (this works for all categories)
    if (this.currentFilters.sortBy) {
      filteredProducts = this.categoryFilterService.sortProducts(
        filteredProducts,
        this.currentFilters.sortBy
      );
    }

    // Update pagination
    const paginationState =
      this.paginationService.updatePagination(filteredProducts);

    // Get paginated products
    this.products =
      this.paginationService.getPaginatedProducts(filteredProducts);

    // Update URL
    this.updateUrlParams();
  }

  private updatePaginationState(paginationState: PaginationState): void {
    this.currentPage = paginationState.currentPage;
    this.pageSize = paginationState.pageSize;
    this.totalPages = paginationState.totalPages;
    this.totalProducts = paginationState.totalProducts;
  }

  private setLoadingState(loading: boolean): void {
    this.isLoading = loading;
    if (loading) {
      this.error = null;
    }
  }

  private handleLoadError(error: any, message: string): void {
    console.error(message, error);
    this.error = message;
    this.setLoadingState(false);
    this.allProducts = [];
    this.products = [];
    this.totalProducts = 0;
  }

  // ============ PUBLIC METHODS FOR TEMPLATE ============

  /**
   * FIXED: Handle filter changes from filter component - removed blocking
   */
  onFiltersChange(filters: FilterOptions): void {
    // Allow filter changes for all categories
    this.categoryFilterService.updateFilters(filters);
  }

  /**
   * FIXED: Handle filter reset - removed blocking
   */
  onFiltersReset(): void {
    // Allow filter reset for all categories
    this.categoryFilterService.resetFilters();
    this.paginationService.resetToFirstPage();
  }

  /**
   * Handle page change
   */
  onPageChange(page: number): void {
    this.paginationService.changePage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Get category display name
   */
  getCategoryDisplayName(): string {
    if (this.currentCategory) {
      return this.currentCategory.name;
    }
    return 'All Products';
  }

  /**
   * Get category description
   */
  getCategoryDescription(): string {
    if (this.currentCategory?.description) {
      return this.currentCategory.description;
    }

    const identifier = this.route.snapshot.params['identifier'];
    if (
      identifier &&
      this.specialCategoryService.isSpecialCategory(identifier)
    ) {
      const display =
        this.specialCategoryService.getSpecialCategoryDisplay(identifier);
      return display.description;
    }

    return "Explore our wide range of products to find exactly what you're looking for.";
  }

  /**
   * Check if current category is special
   */
  isSpecialCategory(): boolean {
    return this.isSpecialCategoryActive;
  }

  /**
   * Get special category type
   */
  getSpecialCategoryType(): string | null {
    return this.currentSpecialType;
  }

  /**
   * Navigate to product details
   */
  navigateToProduct(product: DisplayProduct): void {
    this.router.navigate(['/product', product.id]);
  }

  /**
   * Track by function for ngFor performance
   */
  trackByProductId(index: number, product: DisplayProduct): string {
    return product.id;
  }

  // ============ WISHLIST FUNCTIONALITY ============

  /**
   * Check if product is in wishlist
   */
  isInWishlist(productId: string): boolean {
    return this.wishlistService.isInWishlist(productId);
  }

  /**
   * Toggle product wishlist status
   */
  toggleWishlist(product: DisplayProduct): void {
    this.wishlistService.toggleWishlist(product).subscribe({
      next: (success) => {
        if (success) {
          const action = this.isInWishlist(product.id)
            ? 'added to'
            : 'removed from';
          this.toastService.success(`Product ${action} wishlist`);
        }
      },
      error: (error) => {
        console.error('Error updating wishlist:', error);
        this.toastService.error('Failed to update wishlist');
      },
    });
  }

  // ============ CART/VARIANT SELECTOR FUNCTIONALITY ============

  /**
   * Open cart sidebar - now opens variant selector
   */
  openCartSidebar(product: DisplayProduct): void {
    this.selectedProductForVariants.set(
      this.convertToVariantSelectorProduct(product)
    );
    this.isVariantSelectorOpen.set(true);
  }

  /**
   * Convert DisplayProduct to VariantSelectorProduct
   */
  private convertToVariantSelectorProduct(
    product: DisplayProduct
  ): VariantSelectorProduct {
    return {
      id: product.id,
      productId: product.id,
      productName: product.name,
      imageUrl: product.imageUrl || 'Images/placeholder.png',
      price: product.effectivePrice || product.price,
      originalPrice: product.originalPrice,
      salePrice: product.salePrice,
      variants: (product.variants || []).map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        stockQuantity: variant.stockQuantity,
        isAvailable: variant.stockQuantity > 0,
        imageUrl: variant.images?.[0]?.imageUrl || product.imageUrl,
        // Fix: Use optional chaining and provide default value
        priceAdjustment: (variant as any).priceAdjustment || 0,
      })),
    };
  }

  /**
   * Close variant selector
   */
  closeVariantSelector(): void {
    this.isVariantSelectorOpen.set(false);
    this.selectedProductForVariants.set(null);
  }
  /**
   * Handle successful addition to cart from variant selector
   */
  onVariantAdded(event: { success: boolean; message: string }): void {
    if (event.success) {
      this.toastService.success('Product added to cart');
    } else {
      this.toastService.error(event.message || 'Failed to add product to cart');
    }
    this.closeVariantSelector();
  }

  // ============ TOAST NOTIFICATION SYSTEM ============

  hideToast(): void {
    this.showToast = false;
    this.toastMessage = '';
  }

  // ============ URL MANAGEMENT ============

  /**
   * FIXED: Update URL params for all categories
   */
  private updateUrlParams(): void {
    const filterParams = this.categoryFilterService.filtersToQueryParams(
      this.currentFilters
    );
    const pageParams = this.paginationService.getPageQueryParam();

    const queryParams = { ...filterParams, ...pageParams };

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  // ============ UTILITY METHODS ============

  /**
   * Format price for display
   */
  formatPrice(price: number): string {
    return `EGP ${price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  /**
   * Check if product has discount
   */
  hasDiscount(product: DisplayProduct): boolean {
    return !!(product.originalPrice && product.originalPrice > product.price);
  }

  /**
   * Get product stock status
   */
  getStockStatus(product: DisplayProduct): string {
    if (!product.isAvailable) return 'Out of Stock';
    if (product.variants && product.variants.length > 0) {
      const totalStock = product.variants.reduce(
        (sum, v) => sum + v.stockQuantity,
        0
      );
      if (totalStock <= 0) return 'Out of Stock';
      if (totalStock <= 5) return 'Low Stock';
      return 'In Stock';
    }
    return 'Available';
  }
}
