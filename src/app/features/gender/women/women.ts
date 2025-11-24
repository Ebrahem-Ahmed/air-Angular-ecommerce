// women.component.ts
import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductSliderComponent } from '../../../shared/components/product-slider-component/product-slider-component';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { Product, ProductService } from '../../product/product.service';
import { CategoryService } from '../../category/category.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

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
  selector: 'app-women',
  standalone: true,
  imports: [CommonModule, TranslateModule, ProductSliderComponent, RouterLink],
  template: `
    <!-- Hero Section 1 -->
    <section
      class="women-hero-section margin-bottom px-lg-3 d-flex align-items-end pb-lg-5 text-white mb-5"
    >
      <div class="container-fluid">
        <div class="row">
          <div class="col-md-8 mb-4 col-lg-6">
            <h1 class="fw-bold display-5">
              {{ 'WOMEN.HERO1.TITLE' | translate }}
            </h1>
            <p class="lead">{{ 'WOMEN.HERO1.DESCRIPTION' | translate }}</p>
            <div class="d-flex flex-column align-items-start gap-3 mt-4">
              <a
                routerLink="/category/71a88428-fcde-4d2f-82d6-2ff99da7a9fb"
                class="btn btn-light fancy-btn btn-lg rounded-0 text-start"
              >
                {{ 'WOMEN.HERO1.SHOP_TSHIRTS' | translate }}
                <svg width="16" height="16" viewBox="0 0 16 16" class="ms-2">
                  <path
                    d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"
                    fill="black"
                  />
                </svg>
              </a>
              <a
                routerLink="/category/2dac50d5-b01a-4774-b85e-0b08ae7d1a54"
                class="btn btn-light fancy-btn btn-lg rounded-0 text-start"
              >
                {{ 'WOMEN.HERO1.SHOP_SKIRTS' | translate }}
                <svg width="16" height="16" viewBox="0 0 16 16" class="ms-2">
                  <path
                    d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"
                    fill="black"
                  />
                </svg>
              </a>
              <a
                routerLink="/category/71a88428-fcde-4d2f-82d6-2ff99da7a9fb"
                class="btn btn-light fancy-btn btn-lg rounded-0 text-start"
              >
                {{ 'WOMEN.HERO1.SHOP_SNEAKERS' | translate }}
                <svg width="16" height="16" viewBox="0 0 16 16" class="ms-2">
                  <path
                    d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"
                    fill="black"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Hero Section 2 -->
    <section
      class="women-hero-section-2 margin-bottom px-lg-3 d-flex align-items-end pb-lg-5 text-white mb-5"
    >
      <div class="container-fluid">
        <div class="row">
          <div class="col-md-8 mb-4 col-lg-6">
            <h1 class="fw-bold display-5">
              {{ 'WOMEN.HERO2.TITLE' | translate }}
            </h1>
            <p
              class="lead"
              [innerHTML]="'WOMEN.HERO2.DESCRIPTION' | translate"
            ></p>
            <div class="d-flex flex-column align-items-start gap-3 mt-4">
              <a
                routerLink="/category/71a88428-fcde-4d2f-82d6-2ff99da7a9fb"
                class="btn btn-light fancy-btn btn-lg rounded-0 text-start"
              >
                {{ 'WOMEN.HERO2.SHOP_NOW' | translate }}
                <svg width="16" height="16" viewBox="0 0 16 16" class="ms-2">
                  <path
                    d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"
                    fill="black"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Women Category Navigation Section -->
    <section class="category-navigation margin-bottom mb-5 mt-5">
      <div class="container-fluid">
        <h2 class=" mb-4 fw-bold">
          {{ 'WOMEN.CATEGORY_TITLE' | translate }}
        </h2>

        <div class="row g-3">
          <!-- Bras -->
          <div class="col-lg-3 col-md-6">
            <div
              class="category-card rounded-0 women-bras-card d-flex flex-column align-items-center justify-content-end pb-4 text-center"
            >
              <a
                routerLink="/category/71a88428-fcde-4d2f-82d6-2ff99da7a9fb"
                class="btn btn-light fancy-btn btn-lg rounded-0"
              >
                {{ 'WOMEN.CATEGORIES.BRAS' | translate }}
                <svg width="16" height="16" viewBox="0 0 16 16" class="ms-2">
                  <path
                    d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"
                    fill="black"
                  />
                </svg>
              </a>
            </div>
          </div>

          <!-- Tights -->
          <div class="col-lg-3 col-md-6">
            <div
              class="category-card rounded-0 women-tights-card d-flex flex-column align-items-center justify-content-end pb-4 text-center"
            >
              <a
                routerLink="/category/71a88428-fcde-4d2f-82d6-2ff99da7a9fb"
                class="btn btn-light fancy-btn btn-lg rounded-0"
              >
                {{ 'WOMEN.CATEGORIES.TIGHTS' | translate }}
                <svg width="16" height="16" viewBox="0 0 16 16" class="ms-2">
                  <path
                    d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"
                    fill="black"
                  />
                </svg>
              </a>
            </div>
          </div>

          <!-- Hoodies & Track Tops -->
          <div class="col-lg-3 col-md-6">
            <div
              class="category-card rounded-0 women-hoodies-card d-flex flex-column align-items-center justify-content-end pb-4 text-center"
            >
              <a
                routerLink="/category/7e0ec88b-27cb-4111-9719-4e8f4e548cb3"
                class="btn btn-light fancy-btn btn-lg rounded-0"
              >
                {{ 'WOMEN.CATEGORIES.HOODIES' | translate }}
                <svg width="16" height="16" viewBox="0 0 16 16" class="ms-2">
                  <path
                    d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"
                    fill="black"
                  />
                </svg>
              </a>
            </div>
          </div>

          <!-- Training -->
          <div class="col-lg-3 col-md-6">
            <div
              class="category-card rounded-0 women-training-card d-flex flex-column align-items-center justify-content-end pb-4 text-center"
            >
              <a
                routerLink="/category/71a88428-fcde-4d2f-82d6-2ff99da7a9fb"
                class="btn btn-light fancy-btn btn-lg rounded-0"
              >
                {{ 'WOMEN.CATEGORIES.TRAINING' | translate }}
                <svg width="16" height="16" viewBox="0 0 16 16" class="ms-2">
                  <path
                    d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"
                    fill="black"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Product Slider Section -->
    <div class="product-slider-section">
      <!-- Loading State -->
      <div *ngIf="isLoading" class="text-center py-5">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">{{
            'LOADING.WOMEN_PRODUCTS' | translate
          }}</span>
        </div>
        <p class="mt-3">{{ 'LOADING.WOMEN_PRODUCTS' | translate }}</p>
      </div>

      <!-- Error State -->
      <div
        *ngIf="error && !isLoading"
        class="alert alert-warning text-center mx-3"
      >
        <h5>{{ 'ERROR.TITLE' | translate }}</h5>
        <p>{{ 'ERROR.FAILED_LOAD_WOMEN' | translate }}</p>
        <button class="btn btn-primary" (click)="retryLoadProducts()">
          <svg width="16" height="16" viewBox="0 0 16 16" class="me-2">
            <path
              d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"
            />
            <path
              d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"
            />
          </svg>
          {{ 'ERROR.TRY_AGAIN' | translate }}
        </button>
      </div>
      <h2 class=" mb-4">{{ 'WOMEN.SLIDER_TITLE' | translate }}</h2>

      <!-- Product Slider Component -->
      <app-product-slider
        *ngIf="!isLoading && !error"
        [products]="products"
        [categories]="categories"
        (categorySelected)="onCategoryFilter($event)"
      >
      </app-product-slider>

      <!-- Empty State -->
      <div
        *ngIf="!isLoading && !error && products.length === 0"
        class="text-center py-5"
      >
        <svg width="64" height="64" viewBox="0 0 16 16" class="mb-3 text-muted">
          <path
            d="M8 1a2.5 2.5 0 0 1 2.5 2.5V4h-5v-.5A2.5 2.5 0 0 1 8 1zm3.5 3v-.5a3.5 3.5 0 1 0-7 0V4H1v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4h-3.5zM2 5h12v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5z"
          />
        </svg>
        <h5>{{ 'EMPTY_STATE.NO_WOMEN_PRODUCTS' | translate }}</h5>
        <p class="text-muted">
          {{ 'EMPTY_STATE.UPDATING_WOMEN_INVENTORY' | translate }}
        </p>
        <button class="btn btn-primary" (click)="retryLoadProducts()">
          {{ 'EMPTY_STATE.REFRESH' | translate }}
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .women-hero-section {
        min-height: 100vh;
        background: url('/Images/gender/women/women-hero-1.png') no-repeat
          center;
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
      }
      .women-hero-section-2 {
        min-height: 100vh;
        background: url('/Images/gender/women/women-hero-2.png') no-repeat
          center;
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
      }

      .category-card {
        position: relative;
        height: 350px;
        border-radius: 12px;
        color: #fff;
        background-size: cover;
        background-position: center;
        overflow: hidden;
        display: flex;
      }

      .women-bras-card {
        background: url('/Images/gender/women/bras.jpg') round;
      }

      .women-tights-card {
        background: url('/Images/gender/women/tights.jpg') round;
      }

      .women-hoodies-card {
        background: url('/Images/gender/women/hoddies.jpg') round;
      }

      .women-training-card {
        background: url('/Images/gender/women/training.jpg') round;
      }

      .fancy-btn::before {
        border: 2px solid #ffffff; /* red border (you can change color) */
      }
      .fancy-btn:hover {
        background-color: #ffffff !important; /* Change background color on hover */
        color: #797979; /* Change text color on hover */
        transition: 0.1s ease-in-out; /* Change text color on hover */
      }

      .margin-bottom {
        margin-bottom: 6rem;
      }

      @media (max-width: 768px) {
        .women-hero-section {
          min-height: 50vh;
        }

        .women-hero-section-2 {
          min-height: 50vh;
        }

        .category-card {
          height: 250px;
        }

        .fancy-btn {
          font-size: 0.8rem;
          padding: 10px 20px;
        }
      }
    `,
  ],
})
export class Women implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private router = inject(Router);
  private translateService = inject(TranslateService);

  // Separate arrays for different product types
  private allWomenProductsData: SliderProduct[] = [];
  private newWomenProductsData: SliderProduct[] = [];
  private saleWomenProductsData: SliderProduct[] = [];
  private originalsWomenProductsData: SliderProduct[] = [];
  private sportswearWomenProductsData: SliderProduct[] = [];

  // Display products (what's currently shown)
  products: SliderProduct[] = [];
  categories: string[] = []; // مش هنحط قيم جاهزة
  currentActiveCategory = 'ALL';
  isLoading = false;
  error: string | null = null;
  private langChangeSubscription?: Subscription;

  ngOnInit(): void {
    this.loadWomenProducts();
    this.translateService
      .get(['COMMON.ALL', 'PRODUCT_SLIDER.CATEGORIES.NEW'])
      .subscribe(() => {
        this.initializeCategories();
      });
    this.langChangeSubscription = this.translateService.onLangChange.subscribe(
      () => {
        this.initializeCategories(); // نحديث الفئات لما اللغة تتغير
      }
    );
  }
  ngOnDestroy(): void {
    if (this.langChangeSubscription) {
      this.langChangeSubscription.unsubscribe(); // نقفل الـ subscription
    }
  }
  private initializeCategories(): void {
    this.categories = [
      this.translateService.instant('COMMON.ALL'), // "الكل" أو "ALL"
      this.translateService.instant('PRODUCT_SLIDER.CATEGORIES.NEW'), // "جديد" أو "New"
      this.translateService.instant('PRODUCT_SLIDER.CATEGORIES.SALE'), // "تخفيضات" أو "Sale"
    ];

    this.currentActiveCategory = this.translateService.instant('COMMON.ALL');
  }
  private loadWomenProducts(): void {
    this.isLoading = true;
    this.error = null;

    // Fetch women's categories and products
    const requests$ = forkJoin({
      womenCategories: this.categoryService
        .getMainCategoriesByType('Women')
        .pipe(catchError(() => of([]))),
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
        // Get women's category IDs
        const womenCategoryIds = this.extractWomenCategoryIds(
          data.womenCategories
        );

        // Filter products to women's categories only
        const womenProducts = this.filterProductsByGender(
          data.allProducts,
          womenCategoryIds
        );
        const womenNewProducts = this.filterProductsByGender(
          data.newProducts,
          womenCategoryIds
        );
        const womenSaleProducts = this.filterProductsByGender(
          data.saleProducts,
          womenCategoryIds
        );

        // Process and store each type of women's products separately
        this.processWomenProductsData({
          allProducts: womenProducts,
          newProducts: womenNewProducts,
          saleProducts: womenSaleProducts,
        });

        // Set initial display to all women's products
        this.currentActiveCategory = 'ALL';
        this.products = [...this.allWomenProductsData];
      },
      error: (error) => {
        console.error("Error loading women's products:", error);
        this.error = "Failed to load women's products. Please try again later.";
        this.products = [];
      },
    });
  }

  private extractWomenCategoryIds(womenCategories: any[]): string[] {
    const categoryIds: string[] = [];

    womenCategories.forEach((category) => {
      categoryIds.push(category.id);

      // Add subcategory IDs if they exist
      if (category.subCategories && category.subCategories.length > 0) {
        category.subCategories.forEach((subCat: any) => {
          categoryIds.push(subCat.id);
        });
      }
    });

    return categoryIds;
  }

  private filterProductsByGender(
    products: Product[],
    categoryIds: string[]
  ): Product[] {
    return products.filter((product) =>
      categoryIds.includes(product.categoryId)
    );
  }

  private processWomenProductsData(data: {
    allProducts: Product[];
    newProducts: Product[];
    saleProducts: Product[];
  }): void {
    // Process all women's products (limit to 10)
    this.allWomenProductsData = this.transformToSliderProducts(
      data.allProducts.slice(0, 10)
    );

    // Process new women's products (limit to 10)
    this.newWomenProductsData = this.transformToSliderProducts(
      data.newProducts
        .slice(0, 10)
        .map((product) => ({ ...product, isNew: true }))
    );

    // Process sale women's products (limit to 10)
    this.saleWomenProductsData = this.transformToSliderProducts(
      data.saleProducts.slice(0, 10)
    );

    // Filter by category type for ORIGINALS and SPORTSWEAR (limit to 10 each)
    this.originalsWomenProductsData = this.allWomenProductsData
      .filter(
        (product) =>
          product.category.toLowerCase().includes('originals') ||
          product.category.toLowerCase().includes('original')
      )
      .slice(0, 10);

    this.sportswearWomenProductsData = this.allWomenProductsData
      .filter(
        (product) =>
          product.category.toLowerCase().includes('sportswear') ||
          product.category.toLowerCase().includes('sport')
      )
      .slice(0, 10);

    console.log("Women's products processed (max 10 each):", {
      all: this.allWomenProductsData.length,
      new: this.newWomenProductsData.length,
      sale: this.saleWomenProductsData.length,
      originals: this.originalsWomenProductsData.length,
      sportswear: this.sportswearWomenProductsData.length,
    });
  }

  private transformToSliderProducts(products: Product[]): SliderProduct[] {
    return products.map((product) => {
      const sliderProduct: SliderProduct = {
        id: product.id,
        name: product.name,
        price: this.productService.getEffectivePrice(product),
        category: this.getCategoryName(product.categoryId),
        imageUrl: this.getProductImageUrl(product),
        isNew: (product as any).isNew || false,
        onSale: product.isOnSale,
      };

      // Add original price and discount for sale items
      if (
        product.isOnSale &&
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
    // You might want to enhance this with actual category names from CategoryService
    const categoryMap: Record<string, string> = {
      // Add your women's category mappings here
    };

    return categoryMap[categoryId] || "Women's Category";
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
    console.log("Filtering women's products by category:", category);

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
      this.products = [...this.allWomenProductsData];
    } else if (category === newCategory) {
      this.products = [...this.newWomenProductsData];
    } else if (category === saleCategory) {
      this.products = [...this.saleWomenProductsData];
    } else {
      this.products = [...this.allWomenProductsData];
    }

    console.log(
      `Filtered women's products for ${category}:`,
      this.products.length
    );
  }

  // Method to retry loading products
  retryLoadProducts(): void {
    this.loadWomenProducts();
  }

  // Method to handle product click and navigate to product detail
  onProductClick(productId: string): void {
    console.log('Navigating to product:', productId);
    this.router.navigate(['/product', productId]);
  }
}
