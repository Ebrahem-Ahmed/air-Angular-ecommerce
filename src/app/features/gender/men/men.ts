// men.component.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlahlyBannerComponent } from '../../../shared/components/alahly-banner-component/alahly-banner-component';
import { ProductSliderComponent } from '../../../shared/components/product-slider-component/product-slider-component';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { Product, ProductService } from '../../product/product.service';
import { CategoryService } from '../../category/category.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
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
  selector: 'app-men',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    AlahlyBannerComponent,
    ProductSliderComponent,
    RouterLink,
  ],
  template: `<!-- Hero Section -->
    <section
      class="men-hero-section margin-bottom px-lg-3 d-flex align-items-end pb-lg-5 text-white mb-5"
    >
      <div class="container-fluid">
        <div class="row">
          <div class="col-md-8 mb-4 col-lg-6">
            <h1 class="fw-bold display-5">
              {{ 'MEN.HERO.TITLE' | translate }}
            </h1>
            <p class="lead">
              {{ 'MEN.HERO.DESCRIPTION' | translate }}
            </p>
            <div class="d-flex flex-column align-items-start gap-3 mt-4">
              <a
                routerLink="/category/00c62b80-a9f4-4199-8220-5efd39d28bd0"
                class="btn btn-light fancy-btn btn-lg rounded-0"
              >
                {{ 'MEN.HERO.SHOP_TSHIRTS' | translate }}
                <svg width="16" height="16" viewBox="0 0 16 16" class="ms-2">
                  <path
                    d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"
                    fill="black"
                  />
                </svg>
              </a>
              <a
                routerLink="/category/f7b6871a-71a0-4b8e-9a18-1d152052922f"
                class="btn btn-light fancy-btn btn-lg rounded-0"
              >
                {{ 'MEN.HERO.SHOP_SHORTS' | translate }}
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

    <app-alahly-banner></app-alahly-banner>

    <!-- Category Navigation Section -->
    <section class="category-navigation margin-bottom mb-5 mt-5">
      <div class="container-fluid">
        <h2 class=" mb-4 fw-bold">
          {{ 'MEN.CATEGORY_TITLE' | translate }}
        </h2>

        <div class="row g-3">
          <!-- Shoes -->
          <div class="col-lg-3 col-md-6">
            <div
              class="category-card rounded-0 men-shoes-card d-flex flex-column align-items-center justify-content-end pb-4 text-center"
            >
              <a
                routerLink="/category/8f2cebea-a46b-42d0-8fde-7d10e99bc36b"
                class="btn btn-light fancy-btn btn-lg rounded-0"
              >
                {{ 'MEN.CATEGORIES.SHOES' | translate }}
                <svg width="16" height="16" viewBox="0 0 16 16" class="ms-2">
                  <path
                    d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"
                    fill="black"
                  />
                </svg>
              </a>
            </div>
          </div>

          <!-- Shorts -->
          <div class="col-lg-3 col-md-6">
            <div
              class="category-card rounded-0 men-shorts-card d-flex flex-column align-items-center justify-content-end pb-4 text-center"
            >
              <a
                routerLink="/category/f7b6871a-71a0-4b8e-9a18-1d152052922f"
                class="btn btn-light fancy-btn btn-lg rounded-0"
              >
                {{ 'MEN.CATEGORIES.SHORTS' | translate }}
                <svg width="16" height="16" viewBox="0 0 16 16" class="ms-2">
                  <path
                    d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"
                    fill="black"
                  />
                </svg>
              </a>
            </div>
          </div>

          <!-- T-Shirts -->
          <div class="col-lg-3 col-md-6">
            <div
              class="category-card rounded-0 men-tshirts-card d-flex flex-column align-items-center justify-content-end pb-4 text-center"
            >
              <a
                routerLink="/category/00c62b80-a9f4-4199-8220-5efd39d28bd0"
                class="btn btn-light fancy-btn btn-lg rounded-0"
              >
                {{ 'MEN.CATEGORIES.TSHIRTS' | translate }}
                <svg width="16" height="16" viewBox="0 0 16 16" class="ms-2">
                  <path
                    d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"
                    fill="black"
                  />
                </svg>
              </a>
            </div>
          </div>

          <!-- Hoodies -->
          <div class="col-lg-3 col-md-6">
            <div
              class="category-card rounded-0 men-hoodies-card d-flex flex-column align-items-center justify-content-end pb-4 text-center"
            >
              <a
                routerLink="/category/8bfa5784-c92b-43fd-9103-45e2271f981a"
                class="btn btn-light fancy-btn btn-lg rounded-0"
              >
                {{ 'MEN.CATEGORIES.HOODIES' | translate }}
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
            'LOADING.MEN_PRODUCTS' | translate
          }}</span>
        </div>
        <p class="my-3">{{ 'LOADING.MEN_PRODUCTS' | translate }}</p>
      </div>

      <!-- Error State -->
      <div
        *ngIf="error && !isLoading"
        class="alert alert-warning text-center mx-3"
      >
        <h5>{{ 'ERROR.TITLE' | translate }}</h5>
        <p>{{ 'ERROR.FAILED_LOAD_MEN' | translate }}</p>
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
      <h2 class=" mb-4" >{{ 'MEN.SLIDER_TITLE' | translate }}</h2>

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
        <h5>{{ 'EMPTY_STATE.NO_MEN_PRODUCTS' | translate }}</h5>
        <p class="text-muted">
          {{ 'EMPTY_STATE.UPDATING_MEN_INVENTORY' | translate }}
        </p>
        <button class="btn btn-primary" (click)="retryLoadProducts()">
          {{ 'EMPTY_STATE.REFRESH' | translate }}
        </button>
      </div>
    </div>`,
  styles: [
    `
      .men-hero-section {
        background: url('/Images/gender/men/men-hero.png') no-repeat center
          center/cover;
        min-height: 100vh;
        position: relative;
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

      .men-shoes-card {
        background: url('/Images/gender/men/shoes.jpg') round;
      }

      .men-shorts-card {
        background: url('/Images/gender/men/shorts.jpg') round;
      }

      .men-tshirts-card {
        background: url('/Images/gender/men/sports.jpg') round;
      }

      .men-hoodies-card {
        background: url('/Images/gender/men/hoddies.jpg') round;
      }

      .fancy-btn::before {
        border: 2px solid #ffffff;
      }

      .fancy-btn:hover {
        background-color: #ffffff !important;
        color: #797979;
        transition: 0.1s ease-in-out;
      }

      .margin-bottom {
        margin-bottom: 6rem;
      }

      @media (max-width: 768px) {
        .men-hero-section {
          min-height: 50vh;
        }

        .category-card {
          height: 250px;
        }
      }
    `,
  ],
})
export class Men implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private router = inject(Router);
  private translateService = inject(TranslateService);

  // Separate arrays for different product types
  private allMenProductsData: SliderProduct[] = [];
  private newMenProductsData: SliderProduct[] = [];
  private saleMenProductsData: SliderProduct[] = [];
  private originalsMenProductsData: SliderProduct[] = [];
  private sportswearMenProductsData: SliderProduct[] = [];
  private langChangeSubscription?: Subscription;

  // Display products (what's currently shown)
  products: SliderProduct[] = [];
  categories: string[] = []; // مش هنحط قيم جاهزة
  currentActiveCategory = 'ALL';
  isLoading = false;
  error: string | null = null;

  ngOnInit(): void {
    this.loadMenProducts();
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
  private loadMenProducts(): void {
    this.isLoading = true;
    this.error = null;

    // Fetch men's categories and products
    const requests$ = forkJoin({
      menCategories: this.categoryService
        .getMainCategoriesByType('Men')
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
        // Get men's category IDs
        const menCategoryIds = this.extractMenCategoryIds(data.menCategories);

        // Filter products to men's categories only
        const menProducts = this.filterProductsByGender(
          data.allProducts,
          menCategoryIds
        );
        const menNewProducts = this.filterProductsByGender(
          data.newProducts,
          menCategoryIds
        );
        const menSaleProducts = this.filterProductsByGender(
          data.saleProducts,
          menCategoryIds
        );

        // Process and store each type of men's products separately
        this.processMenProductsData({
          allProducts: menProducts,
          newProducts: menNewProducts,
          saleProducts: menSaleProducts,
        });

        // Set initial display to all men's products
        this.currentActiveCategory = 'ALL';
        this.products = [...this.allMenProductsData];
      },
      error: (error) => {
        console.error("Error loading men's products:", error);
        this.error = "Failed to load men's products. Please try again later.";
        this.products = [];
      },
    });
  }

  private extractMenCategoryIds(menCategories: any[]): string[] {
    const categoryIds: string[] = [];

    menCategories.forEach((category) => {
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

  private processMenProductsData(data: {
    allProducts: Product[];
    newProducts: Product[];
    saleProducts: Product[];
  }): void {
    // Process all men's products (limit to 10)
    this.allMenProductsData = this.transformToSliderProducts(
      data.allProducts.slice(0, 10)
    );

    // Process new men's products (limit to 10)
    this.newMenProductsData = this.transformToSliderProducts(
      data.newProducts
        .slice(0, 10)
        .map((product) => ({ ...product, isNew: true }))
    );

    // Process sale men's products (limit to 10)
    this.saleMenProductsData = this.transformToSliderProducts(
      data.saleProducts.slice(0, 10)
    );

    // Filter by category type for ORIGINALS and SPORTSWEAR (limit to 10 each)
    this.originalsMenProductsData = this.allMenProductsData
      .filter(
        (product) =>
          product.category.toLowerCase().includes('originals') ||
          product.category.toLowerCase().includes('original')
      )
      .slice(0, 10);

    this.sportswearMenProductsData = this.allMenProductsData
      .filter(
        (product) =>
          product.category.toLowerCase().includes('sportswear') ||
          product.category.toLowerCase().includes('sport')
      )
      .slice(0, 10);

    console.log("Men's products processed (max 10 each):", {
      all: this.allMenProductsData.length,
      new: this.newMenProductsData.length,
      sale: this.saleMenProductsData.length,
      originals: this.originalsMenProductsData.length,
      sportswear: this.sportswearMenProductsData.length,
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
      // Add your men's category mappings here
    };

    return categoryMap[categoryId] || "Men's Category";
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
    console.log("Filtering men's products by category:", category);

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
      this.products = [...this.allMenProductsData];
    } else if (category === newCategory) {
      this.products = [...this.newMenProductsData];
    } else if (category === saleCategory) {
      this.products = [...this.saleMenProductsData];
    } else {
      this.products = [...this.allMenProductsData];
    }

    console.log(
      `Filtered men's products for ${category}:`,
      this.products.length
    );
  }

  // Method to retry loading products
  retryLoadProducts(): void {
    this.loadMenProducts();
  }

  // Method to handle product click and navigate to product detail
  onProductClick(productId: string): void {
    console.log('Navigating to product:', productId);
    this.router.navigate(['/product', productId]);
  }
}
