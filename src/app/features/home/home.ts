// home.component.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AlahlyBannerComponent } from '../../shared/components/alahly-banner-component/alahly-banner-component';
import { ProductSliderComponent } from '../../shared/components/product-slider-component/product-slider-component';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { Product, ProductService } from '../product/product.service';

// Local interface for slider compatibility (if needed)
export interface SliderProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: string;
  category: string;
  imageUrl: string;
  isNew?: boolean;
  onSale?: boolean;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    AlahlyBannerComponent,
    TranslateModule,
    ProductSliderComponent,
    RouterLink,
  ],
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
})
export class Home implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private router = inject(Router);
  private translateService = inject(TranslateService);

  // Subscription for language changes
  private langChangeSubscription?: Subscription;

  // Maximum items to display per category
  private readonly MAX_ITEMS_PER_CATEGORY = 10;

  // Store raw product data separately to prevent contamination
  private rawAllProducts: Product[] = [];
  private rawNewProducts: Product[] = [];
  private rawSaleProducts: Product[] = [];

  // Separate arrays for different product types
  private allProductsData: SliderProduct[] = [];
  private newProductsData: SliderProduct[] = [];
  private saleProductsData: SliderProduct[] = [];
  private originalsProductsData: SliderProduct[] = [];
  private sportswearProductsData: SliderProduct[] = [];

  // Display products (what's currently shown)
  products: SliderProduct[] = [];
  categories: string[] = []; // This will now hold localized category names
  currentActiveCategory = 'ALL'; // Track active category
  isLoading = false;
  error: string | null = null;

  constructor() {}

  ngOnInit(): void {
    // Wait for translations to load, then initialize categories
    this.translateService
      .get([
        'COMMON.ALL',
        'PRODUCT_SLIDER.CATEGORIES.NEW',
        'PRODUCT_SLIDER.CATEGORIES.SALE',
      ])
      .subscribe(() => {
        this.initializeCategories();
      });

    // Subscribe to language changes to update categories
    this.langChangeSubscription = this.translateService.onLangChange.subscribe(
      () => {
        this.initializeCategories();
      }
    );

    this.loadProducts();
  }

  ngOnDestroy(): void {
    if (this.langChangeSubscription) {
      this.langChangeSubscription.unsubscribe();
    }
  }

  private initializeCategories(): void {
    // Get localized category names
    this.categories = [
      this.translateService.instant('COMMON.ALL'),
      this.translateService.instant('PRODUCT_SLIDER.CATEGORIES.NEW'),
      this.translateService.instant('PRODUCT_SLIDER.CATEGORIES.SALE'),
    ];

    // Set initial active category to localized "ALL"
    this.currentActiveCategory = this.translateService.instant('COMMON.ALL');
  }

  private loadProducts(): void {
    this.isLoading = true;
    this.error = null;

    // Fetch different types of products
    const requests$ = forkJoin({
      allProducts: this.productService
        .getAllProducts()
        .pipe(catchError(() => of([]))),
      newProducts: this.productService
        .getLastAddedProducts()
        .pipe(catchError(() => of([]))),
      saleProducts: this.productService
        .getSalesProducts()
        .pipe(catchError(() => of([]))),
    });

    requests$.pipe(finalize(() => (this.isLoading = false))).subscribe({
      next: (data) => {
        // Store raw data separately
        this.rawAllProducts = data.allProducts;
        this.rawNewProducts = data.newProducts;
        this.rawSaleProducts = data.saleProducts;

        // Process and store each type of products separately
        this.processProductsData();

        // Set initial display to all products
        this.currentActiveCategory =
          this.translateService.instant('COMMON.ALL');
        this.products = [...this.allProductsData];
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.error = 'Failed to load products. Please try again later.';
        this.products = [];
      },
    });
  }

  private processProductsData(): void {
    // Process ALL products - clean, no special flags
    this.allProductsData = this.transformToSliderProducts(
      this.rawAllProducts.slice(0, this.MAX_ITEMS_PER_CATEGORY),
      'all' // category type for clean processing
    );

    // Process NEW products - from dedicated API endpoint with isNew flag
    this.newProductsData = this.transformToSliderProducts(
      this.rawNewProducts.slice(0, this.MAX_ITEMS_PER_CATEGORY),
      'new' // category type for new products
    );

    // Process SALE products - from dedicated API endpoint
    this.saleProductsData = this.transformToSliderProducts(
      this.rawSaleProducts.slice(0, this.MAX_ITEMS_PER_CATEGORY),
      'sale' // category type for sale products
    );

    // Filter ORIGINALS and SPORTSWEAR from clean ALL products data
    // Use raw data to avoid contamination from processed data
    const originalsProducts = this.rawAllProducts
      .filter((product) => {
        const categoryName = this.getCategoryName(
          product.categoryId
        ).toLowerCase();
        return categoryName.includes('originals');
      })
      .slice(0, this.MAX_ITEMS_PER_CATEGORY);

    const sportswearProducts = this.rawAllProducts
      .filter((product) => {
        const categoryName = this.getCategoryName(
          product.categoryId
        ).toLowerCase();
        return (
          categoryName.includes('sportswear') || categoryName.includes('sport')
        );
      })
      .slice(0, this.MAX_ITEMS_PER_CATEGORY);

    // Transform filtered products without special flags
    this.originalsProductsData = this.transformToSliderProducts(
      originalsProducts,
      'originals'
    );

    this.sportswearProductsData = this.transformToSliderProducts(
      sportswearProducts,
      'sportswear'
    );

    console.log('Products processed (max 10 each):', {
      all: this.allProductsData.length,
      new: this.newProductsData.length,
      sale: this.saleProductsData.length,
      originals: this.originalsProductsData.length,
      sportswear: this.sportswearProductsData.length,
    });
  }

  private transformToSliderProducts(
    products: Product[],
    categoryType: 'all' | 'new' | 'sale' | 'originals' | 'sportswear' = 'all'
  ): SliderProduct[] {
    return products.map((product) => {
      const sliderProduct: SliderProduct = {
        id: product.id,
        name: product.name,
        price: this.productService.getEffectivePrice(product),
        category: this.getCategoryName(product.categoryId),
        imageUrl: this.getProductImageUrl(product),
        // Only set special flags based on category type to prevent contamination
        isNew: categoryType === 'new',
        onSale: categoryType === 'sale' || product.isOnSale,
      };

      // Add original price and discount for sale items
      // Check both category type and product sale status
      if (
        (categoryType === 'sale' || product.isOnSale) &&
        product.salePrice &&
        product.salePrice < product.price
      ) {
        sliderProduct.originalPrice = product.price;
        const discountPercent =
          this.productService.getDiscountPercentage(product);
        sliderProduct.discount = `${discountPercent}% Off`;
      }

      return sliderProduct;
    });
  }

  private getCategoryName(categoryId: string): string {
    // You might want to fetch category names from a CategoryService
    // For now, returning a default mapping or the categoryId itself
    const categoryMap: Record<string, string> = {
      // Add your category ID to name mappings here
      // '1': 'Men Sportswear',
      // '2': 'Men Originals',
      // etc.
    };

    return categoryMap[categoryId] || 'General';
  }

  private getProductImageUrl(product: Product): string {
    // Extract image URL from product images or variants
    if (product.images && product.images.length > 0) {
      const primaryImage = this.productService.getPrimaryImage(product.images);
      if (primaryImage) {
        return primaryImage.imageUrl;
      }
    }

    // If no images, try to get from first variant
    if (product.variants && product.variants.length > 0) {
      const firstVariant = product.variants[0];
      if (firstVariant.images && firstVariant.images.length > 0) {
        const primaryImage = this.productService.getPrimaryImage(
          firstVariant.images
        );
        if (primaryImage) {
          return primaryImage.imageUrl;
        }
      }
    }

    // Fallback to placeholder or default image
    return '/assets/images/placeholder-product.jpg';
  }

  onCategoryFilter(category: string): void {
    console.log('Filtering by category:', category);

    // Update current active category
    this.currentActiveCategory = category;

    // Get localized category names for comparison
    const allCategory = this.translateService.instant('COMMON.ALL');
    const newCategory = this.translateService.instant(
      'PRODUCT_SLIDER.CATEGORIES.NEW'
    );
    const saleCategory = this.translateService.instant(
      'PRODUCT_SLIDER.CATEGORIES.SALE'
    );

    // Switch to the appropriate pre-filtered dataset based on localized names
    if (category === allCategory) {
      this.products = [...this.allProductsData];
    } else if (category === newCategory) {
      this.products = [...this.newProductsData];
    } else if (category === saleCategory) {
      this.products = [...this.saleProductsData];
    } else {
      this.products = [...this.allProductsData];
    }

    console.log(`Filtered products for ${category}:`, this.products.length);
  }

  // Method to handle product click and navigate to product detail
  onProductClick(productId: string): void {
    console.log('Navigating to product:', productId);
    this.router.navigate(['/product', productId]);
  }

  // Method to get current active category (for child component)
  getCurrentActiveCategory(): string {
    return this.currentActiveCategory;
  }

  // Method to check if category has products
  hasCategoryProducts(category: string): boolean {
    const allCategory = this.translateService.instant('COMMON.ALL');
    const newCategory = this.translateService.instant(
      'PRODUCT_SLIDER.CATEGORIES.NEW'
    );
    const saleCategory = this.translateService.instant(
      'PRODUCT_SLIDER.CATEGORIES.SALE'
    );

    if (category === allCategory) {
      return this.allProductsData.length > 0;
    } else if (category === newCategory) {
      return this.newProductsData.length > 0;
    } else if (category === saleCategory) {
      return this.saleProductsData.length > 0;
    }
    return false;
  }

  // Method to get products count for each category
  getCategoryProductsCount(category: string): number {
    const allCategory = this.translateService.instant('COMMON.ALL');
    const newCategory = this.translateService.instant(
      'PRODUCT_SLIDER.CATEGORIES.NEW'
    );
    const saleCategory = this.translateService.instant(
      'PRODUCT_SLIDER.CATEGORIES.SALE'
    );
    const originalsCategory = this.translateService.instant(
      'PRODUCT_SLIDER.CATEGORIES.ORIGINALS'
    );
    const sportswearCategory = this.translateService.instant(
      'PRODUCT_SLIDER.CATEGORIES.SPORTSWEAR'
    );

    if (category === allCategory) {
      return this.allProductsData.length;
    } else if (category === newCategory) {
      return this.newProductsData.length;
    } else if (category === saleCategory) {
      return this.saleProductsData.length;
    } else if (category === originalsCategory) {
      return this.originalsProductsData.length;
    } else if (category === sportswearCategory) {
      return this.sportswearProductsData.length;
    }
    return 0;
  }

  // Method to retry loading products
  retryLoadProducts(): void {
    this.loadProducts();
  }

  // Method to refresh specific category data
  refreshCategoryData(category: string): void {
    this.isLoading = true;
    this.error = null;

    const newCategory = this.translateService.instant(
      'PRODUCT_SLIDER.CATEGORIES.NEW'
    );
    const saleCategory = this.translateService.instant(
      'PRODUCT_SLIDER.CATEGORIES.SALE'
    );

    if (category === newCategory) {
      this.productService
        .getLastAddedProducts()
        .pipe(finalize(() => (this.isLoading = false)))
        .subscribe({
          next: (products) => {
            this.rawNewProducts = products;
            this.newProductsData = this.transformToSliderProducts(
              products.slice(0, this.MAX_ITEMS_PER_CATEGORY),
              'new'
            );
            if (this.currentActiveCategory === newCategory) {
              this.products = [...this.newProductsData];
            }
          },
          error: (error) => {
            console.error('Error refreshing new products:', error);
            this.error = 'Failed to refresh new products.';
          },
        });
    } else if (category === saleCategory) {
      this.productService
        .getSalesProducts()
        .pipe(finalize(() => (this.isLoading = false)))
        .subscribe({
          next: (products) => {
            this.rawSaleProducts = products;
            this.saleProductsData = this.transformToSliderProducts(
              products.slice(0, this.MAX_ITEMS_PER_CATEGORY),
              'sale'
            );
            if (this.currentActiveCategory === saleCategory) {
              this.products = [...this.saleProductsData];
            }
          },
          error: (error) => {
            console.error('Error refreshing sale products:', error);
            this.error = 'Failed to refresh sale products.';
          },
        });
    } else {
      this.loadProducts();
    }
  }
}
