import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize, map } from 'rxjs/operators';

import {
  ProductService,
  Product,
  ProductVariant,
  ProductWithVariants,
  ProductImage,
} from './product.service';
import { CartService } from '../cart/cart.service';
import { WishlistService } from '../wishlist/wishlist.service';
import {
  ProductSliderComponent,
  Product as SliderProduct,
} from '../../shared/components/product-slider-component/product-slider-component';

// Import the new smaller components
import { ProductImageGalleryComponent } from './product-image-gallery.component';
import { ProductImageModalComponent } from './product-image-modal.component';
import { ProductSelectionComponent } from './product-selection.component';
import { ProductAccordionComponent } from './product-accordion.component';
import { Category, CategoryService } from '../category/category.service';
import { RecentlyViewedService } from '../../core/services/recently-viewed.service';
import { ToastService } from '../../core/services/toast.service';
import { TranslateModule } from '@ngx-translate/core';

interface BreadcrumbItem {
  label: string;
  link?: string; // Make link optional with ?
  isActive: boolean;
}
interface SizeInfo {
  size: string;
  stockQuantity: number;
  variantId: string;
  inStock: boolean;
}

interface ColorInfo {
  color: string;
  available: boolean;
  variants: ProductVariant[];
}

interface Alert {
  id: string;
  message: string;
  type: 'success' | 'danger' | 'warning' | 'info';
}

@Component({
  selector: 'app-product',
  standalone: true,
  imports: [
    CommonModule,
    ProductSliderComponent,
    ProductImageGalleryComponent,
    ProductImageModalComponent,
    ProductSelectionComponent,
    ProductAccordionComponent,
    TranslateModule,
  ],
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.scss'],
})
export class ProductComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public productService = inject(ProductService);
  private cartService = inject(CartService);
  private wishlistService = inject(WishlistService);
  private categoryService = inject(CategoryService);
  private recentlyViewedService = inject(RecentlyViewedService);
  private toastService = inject(ToastService);

  // Reactive state
  currentProduct = signal<ProductWithVariants | null>(null);
  currentVariant = signal<ProductVariant | null>(null);
  selectedSize = signal<string | null>(null);
  selectedColor = signal<string | null>(null);
  availableSizes = signal<SizeInfo[]>([]);
  availableColors = signal<ColorInfo[]>([]);
  allVariants = signal<ProductVariant[]>([]);
  isLoading = signal<boolean>(false);
  isAddingToCart = signal<boolean>(false);
  isTogglingWishlist = signal<boolean>(false);
  alerts = signal<Alert[]>([]);
  breadcrumbItems = signal<BreadcrumbItem[]>([]);
  isLoadingBreadcrumb = signal<boolean>(false);

  // Image gallery state
  selectedModalImage = signal<ProductImage | null>(null);
  currentModalIndex = signal<number>(0);

  // Product slider states
  completeTheLookProducts = signal<SliderProduct[]>([]);
  othersAlsoBoughtProducts = signal<SliderProduct[]>([]);
  recentlyViewedProducts = signal<SliderProduct[]>([]);
  isLoadingCompleteTheLook = signal<boolean>(false);
  isLoadingOthersAlsoBought = signal<boolean>(false);
  isLoadingRecentlyViewed = signal<boolean>(false);
isNumericSizing = computed(() => false);
  // Size chart state
 /*  isNumericSizing = computed(() => {
    const sizes = this.getAllSizes();
    return sizes.some((size) => !isNaN(Number(size)));
  });
 */
  // Computed values
  isInWishlist = computed(() => {
    const product = this.currentProduct();
    return product ? this.wishlistService.isInWishlist(product.id) : false;
  });
/*
  canAddToCart = computed(() => {
    if (this.selectedSize() && this.selectedColor() && !this.isAddingToCart()) {
      return true;
    } else {
      return false;
    }
  }); */
  canAddToCart = computed(() => {
  return true;
});

  effectivePrice = computed(() => {
    const product = this.currentProduct();
    return product ? this.productService.getEffectivePrice(product) : 0;
  });

  discountPercentage = computed(() => {
    const product = this.currentProduct();
    return product ? this.productService.getDiscountPercentage(product) : 0;
  });

  primaryImage = computed(() => {
    const images = this.getDisplayImages();
    if (!images || images.length === 0) return null;
    return images.find((img) => img.isPrimary) || images[0];
  });

  // NEW: Computed property for display images based on selected variant
  displayImages = computed(() => {
    return this.getDisplayImages();
  });

  ngOnInit() {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const productId = params['id'];
      if (!productId) {
        this.router.navigate(['/']);
        return;
      }

      this.loadProduct(productId);
      console.log('Current Product:', this.currentProduct()); // Debug log
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProduct(productId: string) {
    this.isLoading.set(true);

    this.productService
      .getProductWithVariants(productId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (product) => {
          this.currentProduct.set(product);
          console.log('Current Product:', this.currentProduct(), product);

          this.allVariants.set(product.variants || []);
          this.currentVariant.set(this.allVariants()[0] || null);
          this.initializeProductOptions();

          // Add product to recently viewed
          this.addToRecentlyViewed(product);

          // Load product sections
          this.loadCompleteTheLookProducts(product.id);

          // Use the delayed version with the actual product ID
          this.loadOthersAlsoBoughtProductsDelayed(product.id);

          // Load recently viewed products
          this.loadRecentlyViewedProducts(product.id);

          // Load breadcrumb after product is loaded
          this.loadProductBreadcrumb(product);
        },
        error: (error) => {
          console.error('Error loading product:', error);
          this.toastService.error(
            'Failed to load product. Redirecting to home page.'
          );

          this.setFallbackBreadcrumb();
        },
      });
  }

  /**
   * NEW: Get display images based on selected variant color or fallback to product images
   */
  getDisplayImages(): ProductImage[] {
    const selectedColor = this.selectedColor();
    const variants = this.allVariants();
    const product = this.currentProduct();

    // If no color is selected, use product images
    if (!selectedColor || !variants.length) {
      return product?.images || [];
    }

    // Find variants with the selected color
    const colorVariants = variants.filter((v) => v.color === selectedColor);

    // Collect all images from variants with the selected color
    const variantImages: ProductImage[] = [];
    colorVariants.forEach((variant) => {
      if (variant.images && variant.images.length > 0) {
        // Add variant images with a flag to identify them
        variant.images.forEach((img, index) => {
          variantImages.push({
            ...img,
            id: `variant-${variant.id}-${img.id || index}`,
            isPrimary: index === 0 && variantImages.length === 0, // Make first image of first variant primary
          });
        });
      }
    });

    // If variant has images, use them; otherwise fallback to product images
    if (variantImages.length > 0) {
      console.log(
        `Using ${variantImages.length} variant images for color: ${selectedColor}`
      );
      return variantImages;
    } else {
      console.log(
        `No variant images found for color: ${selectedColor}, using product images`
      );
      return product?.images || [];
    }
  }

  /**
   * Add current product to recently viewed
   */
  private addToRecentlyViewed(product: ProductWithVariants): void {
    try {
      const recentlyViewedProduct = {
        id: product.id,
        name: product.name,
        price: product.price,
        salePrice: product.salePrice,
        isOnSale: product.isOnSale || false,
        imageUrl: this.primaryImage()?.imageUrl || '',
        categoryId: product.categoryId || '',
      };

      this.recentlyViewedService.addProduct(recentlyViewedProduct);
      console.log('Product added to recently viewed:', product.name);
    } catch (error) {
      console.error('Error adding product to recently viewed:', error);
    }
  }

  /**
   * Load recently viewed products for display
   */
  private loadRecentlyViewedProducts(currentProductId: string): void {
    this.isLoadingRecentlyViewed.set(true);

    try {
      // Get recently viewed products excluding current product
      const recentlyViewed =
        this.recentlyViewedService.getRecentlyViewedExcluding(currentProductId);

      console.log('Recently viewed products:', recentlyViewed);

      // Convert to slider format
      const sliderProducts: SliderProduct[] = recentlyViewed.map((product) => ({
        id: product.id,
        name: product.name,
        price: product.salePrice || product.price,
        originalPrice: product.isOnSale ? product.price : undefined,
        discount: product.isOnSale
          ? `${Math.round(
              ((product.price - (product.salePrice || 0)) / product.price) * 100
            )}% OFF`
          : undefined,
        category: '',
        imageUrl: product.imageUrl,
        isNew: this.isRecentlyViewed(product.viewedAt),
        onSale: product.isOnSale || false,
      }));

      this.recentlyViewedProducts.set(sliderProducts);
      this.isLoadingRecentlyViewed.set(false);
    } catch (error) {
      console.error('Error loading recently viewed products:', error);
      this.recentlyViewedProducts.set([]);
      this.isLoadingRecentlyViewed.set(false);
    }
  }

  /**
   * Check if product was viewed recently (within last 7 days) to mark as "new"
   */
  private isRecentlyViewed(viewedAt: number): boolean {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return viewedAt > sevenDaysAgo;
  }

  private loadCompleteTheLookProducts(productId: string) {
    this.isLoadingCompleteTheLook.set(true);

    this.productService
      .getRecommendations(productId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoadingCompleteTheLook.set(false))
      )
      .subscribe({
        next: (recommendations) => {
          const sliderProducts = this.convertToSliderProducts(recommendations);
          this.completeTheLookProducts.set(sliderProducts);
        },
        error: (error) => {
          console.error('Error loading complete the look products:', error);
          this.completeTheLookProducts.set([]);
        },
      });
  }

  // Alternative method to load after product is ready
  private loadOthersAlsoBoughtProductsDelayed(productId: string) {
    this.isLoadingOthersAlsoBought.set(true);

    this.productService
      .getPreviouslyPurchasedProducts()
      .pipe(
        takeUntil(this.destroy$),
        map((products) => {
          console.log('Delayed load - Raw products:', products);

          if (!Array.isArray(products) || products.length === 0) {
            return [];
          }

          // Filter out current product
          return products
            .filter((p) => p?.id && p.id !== productId)
            .slice(0, 8);
        }),
        finalize(() => this.isLoadingOthersAlsoBought.set(false))
      )
      .subscribe({
        next: (filteredProducts) => {
          console.log('Delayed load - filtered products:', filteredProducts);
          const sliderProducts = this.convertToSliderProducts(filteredProducts);
          this.othersAlsoBoughtProducts.set(sliderProducts);
        },
        error: (error) => {
          console.error('Error in delayed load:', error);
          this.othersAlsoBoughtProducts.set([]);
        },
      });
  }

  private convertToSliderProducts(products: Product[]): SliderProduct[] {
    return products.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.salePrice || product.price,
      originalPrice: product.isOnSale ? product.price : undefined,
      discount: product.isOnSale
        ? `${Math.round(
            ((product.price - (product.salePrice || 0)) / product.price) * 100
          )}% OFF`
        : undefined,
      category: '',
      imageUrl: this.getProductImageUrl(product),
      isNew: this.isNewProduct(product),
      onSale: product.isOnSale || false,
    }));
  }

  private getProductImageUrl(product: Product): string {
    // If product has images array (from ProductWithVariants)
    if ('images' in product && product.images && product.images.length > 0) {
      const primaryImage = product.images.find((img) => img.isPrimary);
      return primaryImage?.imageUrl || product.images[0].imageUrl || '';
    }

    // Fallback for basic Product type with imageUrl property
    return (product as any).imageUrl || '';
  }

  private getCategoryDisplayName(categoryId: string): string {
    // Format categoryId to display name

    return categoryId
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  private isNewProduct(product: Product): boolean {
    // Define logic for what constitutes a "new" product
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return product.createdAt > thirtyDaysAgo;
  }

  private initializeProductOptions() {
    const product = this.currentProduct();
    if (!product || !product.variants) return;
    this.generateColorOptions();
    this.generateSizeOptions();
  }

  private generateColorOptions() {
    const variants = this.allVariants();
    if (!variants.length) return;

    const colorMap = new Map<string, ProductVariant[]>();
    variants.forEach((variant) => {
      if (!colorMap.has(variant.color)) {
        colorMap.set(variant.color, []);
      }
      colorMap.get(variant.color)!.push(variant);
    });

    const colors: ColorInfo[] = Array.from(colorMap.entries()).map(
      ([color, variantsForColor]) => ({
        color,
        available: variantsForColor.some((v) =>
          this.productService.isVariantInStock(v)
        ),
        variants: variantsForColor,
      })
    );

    this.availableColors.set(colors);

    if (!this.selectedColor() && colors.length > 0) {
      const firstAvailableColor = colors.find((c) => c.available);
      if (firstAvailableColor) {
        this.selectedColor.set(firstAvailableColor.color);
      }
    }
  }

  private generateSizeOptions() {
    const selectedColor = this.selectedColor();
    const variants = this.allVariants();

    if (!selectedColor || !variants.length) {
      this.availableSizes.set([]);
      return;
    }

    const colorVariants = variants.filter((v) => v.color === selectedColor);
    const sizes: SizeInfo[] = colorVariants
      .map((variant) => ({
        size: variant.size,
        stockQuantity: variant.stockQuantity,
        variantId: variant.id,
        inStock: this.productService.isVariantInStock(variant),
      }))
      .sort((a, b) => {
        const aNum = parseFloat(a.size);
        const bNum = parseFloat(b.size);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        return a.size.localeCompare(b.size);
      });

    this.availableSizes.set(sizes);

    const currentSize = this.selectedSize();
    if (
      currentSize &&
      !sizes.some((s) => s.size === currentSize && s.inStock)
    ) {
      this.selectedSize.set(null);
      this.currentVariant.set(null);
    }
  }

  getAllSizes(): string[] {
    const variants = this.allVariants();
    const allActualSizes = [...new Set(variants.map((v) => v.size))];
    const standardNumericSizes = Array.from({ length: 14 }, (_, i) =>
      (36 + i).toString()
    );
    const standardLetterSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

    const hasNumeric = allActualSizes.some((size) => !isNaN(Number(size)));
    const hasLetters = allActualSizes.some((size) =>
      /^[A-Z]{1,3}$/.test(size.toUpperCase())
    );

    let baseSizes: string[] = [];
    if (hasNumeric) {
      baseSizes = [...standardNumericSizes];
    } else if (hasLetters) {
      baseSizes = [...standardLetterSizes];
    }

    const specialSizes = allActualSizes.filter((size) => {
      if (hasNumeric) {
        const numSize = Number(size);
        return isNaN(numSize) || numSize < 36 || numSize > 49;
      } else if (hasLetters) {
        return !standardLetterSizes.includes(size.toUpperCase());
      }
      return true;
    });

    const allSizes = [...new Set([...baseSizes, ...specialSizes])];
    return allSizes.sort((a, b) => {
      const aNum = parseFloat(a);
      const bNum = parseFloat(b);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      if (!isNaN(aNum) && isNaN(bNum)) return -1;
      if (isNaN(aNum) && !isNaN(bNum)) return 1;

      const letterOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
      const aIndex = letterOrder.indexOf(a.toUpperCase());
      const bIndex = letterOrder.indexOf(b.toUpperCase());

      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      if (aIndex !== -1 && bIndex === -1) return -1;
      if (aIndex === -1 && bIndex !== -1) return 1;

      return a.localeCompare(b);
    });
  }

  // Event handlers for child components
  openImageModal(index: number): void {
    const images = this.getDisplayImages();
    if (images[index]) {
      this.selectedModalImage.set(images[index]);
      this.currentModalIndex.set(index);

      if (typeof window !== 'undefined' && (window as any).bootstrap) {
        const modalElement = document.getElementById('imageModal');
        if (modalElement) {
          const modal = new (window as any).bootstrap.Modal(modalElement);
          modal.show();
        }
      }
    }
  }

  previousImage(): void {
    const currentIndex = this.currentModalIndex();
    const images = this.getDisplayImages();
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      this.currentModalIndex.set(newIndex);
      this.selectedModalImage.set(images[newIndex]);
    }
  }

  nextImage(): void {
    const currentIndex = this.currentModalIndex();
    const images = this.getDisplayImages();
    if (currentIndex < images.length - 1) {
      const newIndex = currentIndex + 1;
      this.currentModalIndex.set(newIndex);
      this.selectedModalImage.set(images[newIndex]);
    }
  }

  selectColor(color: string) {
    const colorInfo = this.availableColors().find((c) => c.color === color);
    if (!colorInfo || !colorInfo.available) return;

    this.selectedColor.set(color);
    this.selectedSize.set(null);
    this.currentVariant.set(null);
    this.generateSizeOptions();

    // Log for debugging
    console.log(
      `Color selected: ${color}. Images updated:`,
      this.getDisplayImages().length
    );
  }

  selectSize(size: string) {
    const selectedColor = this.selectedColor();
    if (!selectedColor) {
      this.toastService.warning('Please select a color first.');
      return;
    }

    this.selectedSize.set(size);
    const variant = this.getCurrentVariantByColorAndSize(selectedColor, size);
    this.currentVariant.set(variant);
  }

  addToCart() {
    const variant = this.currentVariant();
    const product = this.currentProduct();

    if (!variant || !product) {
      this.toastService.warning('Please select color and size.');
      return;
    }

    if (!this.productService.isVariantInStock(variant)) {
      this.toastService.warning('Selected variant is out of stock.');
      return;
    }

    this.isAddingToCart.set(true);

    const cartVariant = {
      ...variant,
      product: {
        name: product.name,
        price: product.salePrice || product.price,
        imageUrl: this.primaryImage()?.imageUrl || '',
      },
    };

    this.cartService
      .addToCart(cartVariant, 1)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isAddingToCart.set(false))
      )
      .subscribe({
        next: (success) => {
          if (success) {
            this.toastService.success(
              `${product.name} (${variant.color}/${variant.size}) added to cart successfully!`
            );
          }
        },
        error: (error) => {
          console.error('Error adding to cart:', error);

          this.toastService.error(
            'Failed to add product to cart. Please try again.'
          );
        },
      });
  }

  toggleWishlist() {
    const product = this.currentProduct();
    if (!product) return;

    this.isTogglingWishlist.set(true);

    const wishlistProduct = {
      id: product.id,
      name: product.name,
      price: product.price,
      salePrice: product.salePrice,
      isOnSale: product.isOnSale,
      imageUrl: this.primaryImage()?.imageUrl || '',
      isAvailable: this.allVariants().some((v) =>
        this.productService.isVariantInStock(v)
      ),
      category: product.categoryId,
      brand: 'adidas',
      description: product.description,
      variants: this.allVariants().map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        imageUrl: variant.imageUrl || this.primaryImage()?.imageUrl,
        priceAdjustment: variant.priceAdjustment || 0,
        stockQuantity: variant.stockQuantity,
        isAvailable: this.productService.isVariantInStock(variant),
      })),
    };

    this.wishlistService
      .toggleWishlist(wishlistProduct)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isTogglingWishlist.set(false))
      )
      .subscribe({
        next: (result) => {
          if (result.success) {
            console.log('Wishlist toggle result:', result.message);
            this.toastService.success(result.message);
          }
        },
        error: (error) => {
          console.error('Error toggling wishlist:', error);

          this.toastService.error(
            'Failed to update wishlist. Please try again.'
          );
        },
      });
  }

  openSizeChartModal() {
    if (typeof window !== 'undefined' && (window as any).bootstrap) {
      const modalElement = document.getElementById('sizeChartModal');
      if (modalElement) {
        const modal = new (window as any).bootstrap.Modal(modalElement);
        modal.show();
      }
    }
  }

  // Product slider event handlers
  onCompleteTheLookCategorySelected(category: string) {
    console.log('Complete the look category selected:', category);
    // You can implement category filtering here if needed
  }

  onOthersAlsoBoughtCategorySelected(category: string) {
    console.log('Others also bought category selected:', category);
    // You can implement category filtering here if needed
  }

  /**
   * Handle recently viewed category selection
   */
  onRecentlyViewedCategorySelected(category: string): void {
    console.log('Recently viewed category selected:', category);
    // You can implement category filtering here if needed
  }

  /**
   * Get recently viewed products count
   */
  getRecentlyViewedCount(): number {
    return this.recentlyViewedService.getCount();
  }

  // Utility methods
  getCurrentVariantByColorAndSize(
    color: string,
    size: string
  ): ProductVariant | null {
    const variants = this.allVariants();
    return variants.find((v) => v.color === color && v.size === size) || null;
  }

  // Navigation methods
  navigateToCategory(categoryId: string) {
    this.router.navigate(['/category', categoryId]);
  }

  navigateToHome() {
    this.router.navigate(['/']);
  }

  // Product detail methods - UPDATED: Now uses getDisplayImages instead of direct product images
  getProductImages(): ProductImage[] {
    return this.getDisplayImages();
  }

  private loadProductBreadcrumb(product: ProductWithVariants) {
    this.isLoadingBreadcrumb.set(true);

    if (!product.categoryId) {
      this.setFallbackBreadcrumb();
      this.isLoadingBreadcrumb.set(false);
      return;
    }

    this.categoryService
      .getCategoryBreadcrumb(product.categoryId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoadingBreadcrumb.set(false))
      )
      .subscribe({
        next: (categoryPath) => {
          this.buildBreadcrumbFromCategories(categoryPath, product);
        },
        error: (error) => {
          console.error('Error loading breadcrumb:', error);
          this.setFallbackBreadcrumb();
        },
      });
  }

  // Build breadcrumb from category path
  private buildBreadcrumbFromCategories(
    categoryPath: Category[],
    product: ProductWithVariants
  ) {
    const breadcrumbItems: BreadcrumbItem[] = [
      {
        label: 'HOME',
        link: '/',
        isActive: false,
      },
    ];

    // Add category breadcrumb items
    categoryPath.forEach((category, index) => {
      const isLast = index === categoryPath.length - 1;

      breadcrumbItems.push({
        label: category.name.toUpperCase(),
        link: isLast ? undefined : this.getCategoryLink(category), // This can now be undefined
        isActive: isLast,
      });
    });

    this.breadcrumbItems.set(breadcrumbItems);
  }

  // Get appropriate link for category
  private getCategoryLink(category: Category): string {
    // If category has a parent, it's a subcategory - use the category route
    if (category.parentCategoryId) {
      return `/category/${category.slug || category.id}`;
    }

    // For main categories, check the type and route accordingly
    const categoryType = category.type?.toLowerCase();

    switch (categoryType) {
      case 'men':
        return '/men';
      case 'women':
        return '/women';
      case 'kids':
        return '/kids';
      case 'sports':
        return '/sports';
      default:
        return `/category/${category.slug || category.id}`;
    }
  }

  // Fallback breadcrumb when category info is not available
  private setFallbackBreadcrumb() {
    const product = this.currentProduct();

    this.breadcrumbItems.set([
      {
        label: 'HOME',
        link: '/',
        isActive: false,
      },
      {
        label: 'PRODUCTS',
        link: undefined,
        isActive: false,
      },
      {
        label: product?.name?.toUpperCase() || 'PRODUCT',
        link: undefined,
        isActive: true,
      },
    ]);
  }

  // Navigation method for breadcrumb clicks
  navigateToBreadcrumbItem(item: {
    label: string;
    link?: string;
    isActive: boolean;
  }) {
    if (item.link && !item.isActive) {
      this.router.navigate([item.link]);
    }
  }
}
