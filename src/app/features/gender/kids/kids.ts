// kids.component.ts
import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductSliderComponent } from '../../../shared/components/product-slider-component/product-slider-component';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
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
  selector: 'app-kids',
  standalone: true,
  imports: [CommonModule, TranslateModule, ProductSliderComponent],
  template: `
    <!-- Back to School Section -->
    <section
      class="home-section margin-bottom px-lg-3 d-flex align-items-end pb-lg-5 text-white mb-5"
    >
      <div class="container-fluid">
        <div class="row">
          <div class="col-md-8 mb-4 col-lg-6">
            <h1 class="fw-bold display-5">
              {{ 'KIDS.BACK_TO_SCHOOL.TITLE' | translate }}
            </h1>
            <p class="lead">
              {{ 'KIDS.BACK_TO_SCHOOL.DESCRIPTION' | translate }}
            </p>
            <a href="#" class="btn btn-light fancy-btn btn-lg rounded-0">
              {{ 'KIDS.BACK_TO_SCHOOL.BUTTON' | translate }}
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
    </section>

    <!-- Kids Hero Section -->
    <section
      class="kids-section margin-bottom px-lg-3 d-flex align-items-end pb-lg-5 text-white mb-5"
    >
      <div class="container-fluid">
        <div class="row">
          <div class="col-md-8 mb-4 col-lg-6">
            <h1 class="fw-bold display-5">
              {{ 'KIDS.HERO_TITLE' | translate }}
            </h1>
            <p class="lead">{{ 'KIDS.HERO_DESCRIPTION' | translate }}</p>
            <a href="#" class="btn btn-light fancy-btn btn-lg rounded-0">
              {{ 'HOME.SHOP_NOW' | translate }}
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
    </section>
    <!-- Kids Category Navigation Section -->
    <section class="category-navigation margin-bottom mb-5 mt-5">
      <div class="container-fluid">
        <h2 class=" mb-4 fw-bold">{{ 'KIDS.TITLE' | translate }}</h2>
        <div class="row g-3 mb-5">
          <!-- Ages 4-8 -->
          <div class="col-lg-4 col-md-6">
            <div
              class="category-card rounded-0 kids-4-8-card d-flex flex-column align-items-center justify-content-end pb-4 text-center"
            >
              <a href="#" class="btn btn-light fancy-btn btn-lg rounded-0">
                {{ 'KIDS.AGE_GROUPS.4_8' | translate }}
                <svg width="16" height="16" viewBox="0 0 16 16" class="ms-2">
                  <path
                    d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"
                    fill="black"
                  />
                </svg>
              </a>
            </div>
          </div>

          <!-- Ages 8-16 -->
          <div class="col-lg-4 col-md-6">
            <div
              class="category-card rounded-0 kids-8-16-card d-flex flex-column align-items-center justify-content-end pb-4 text-center"
            >
              <a href="#" class="btn btn-light fancy-btn btn-lg rounded-0">
                {{ 'KIDS.AGE_GROUPS.8_16' | translate }}
                <svg width="16" height="16" viewBox="0 0 16 16" class="ms-2">
                  <path
                    d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"
                    fill="black"
                  />
                </svg>
              </a>
            </div>
          </div>

          <!-- Ages 16+ -->
          <div class="col-lg-4 col-12">
            <div
              class="category-card rounded-0 kids-16-plus-card d-flex flex-column align-items-center justify-content-end pb-4 text-center"
            >
              <a href="#" class="btn btn-light fancy-btn btn-lg rounded-0">
                {{ 'KIDS.AGE_GROUPS.16_PLUS' | translate }}
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
          <span class="visually-hidden">Loading kids' products...</span>
        </div>
        <p class="mt-3">Loading amazing kids' products for you...</p>
      </div>

      <!-- Error State -->
      <div
        *ngIf="error && !isLoading"
        class="alert alert-warning text-center mx-3"
      >
        <h5>Oops! Something went wrong</h5>
        <p>{{ error }}</p>
        <button class="btn btn-primary" (click)="retryLoadProducts()">
          <svg width="16" height="16" viewBox="0 0 16 16" class="me-2">
            <path
              d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"
            />
            <path
              d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"
            />
          </svg>
          Try Again
        </button>
      </div>

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
        <h5>No kids' products found</h5>
        <p class="text-muted">
          We're currently updating our kids' inventory. Please check back soon!
        </p>
        <button class="btn btn-primary" (click)="retryLoadProducts()">
          Refresh
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .kids-section {
        min-height: 100vh;
        background: url('/Images/gender/kids/kids-hero.jpg');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
      }
      .margin-bottom {
        margin-bottom: 6rem !important;
      }
      .home-section {
        background: url('/Images/gender/kids/backtoschool.jpg') no-repeat center
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
      .fancy-btn::before {
        border: 2px solid #ffffff;
      }
      .fancy-btn:hover {
        background-color: #ffffff !important;
        color: #797979;
        transition: 0.1s ease-in-out;
      }

      .kids-4-8-card {
        background: url('/Images/gender/kids/0-4.jpg') round;
      }

      .kids-8-16-card {
        background: url('/Images/gender/kids/4-8.jpg') round;
      }

      .kids-16-plus-card {
        background: url('/Images/gender/kids/8-16.jpg') round;
      }

      @media (max-width: 768px) {
        .kids-section {
          min-height: 50vh;
        }

        .category-card {
          height: 250px;
        }

        .home-section {
          min-height: 50vh;
        }

        .display-5 {
          font-size: 2rem !important;
        }
      }
    `,
  ],
})
export class Kids implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private translateService = inject(TranslateService);

  // Separate arrays for different product types
  private allKidsProductsData: SliderProduct[] = [];
  private newKidsProductsData: SliderProduct[] = [];
  private saleKidsProductsData: SliderProduct[] = [];
  private originalsKidsProductsData: SliderProduct[] = [];
  private sportswearKidsProductsData: SliderProduct[] = [];
  private langChangeSubscription?: Subscription;
  // Display products (what's currently shown)
  products: SliderProduct[] = [];
  categories: string[] = [];
  currentActiveCategory = 'ALL';
  isLoading = false;
  error: string | null = null;

  ngOnInit(): void {
    this.loadKidsProducts();
    this.translateService
      .get(['COMMON.ALL', 'PRODUCT_SLIDER.CATEGORIES.NEW'])
      .subscribe(() => {
        this.initializeCategories();
      });

    this.langChangeSubscription = this.translateService.onLangChange.subscribe(
      () => {
        this.initializeCategories();
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

  private loadKidsProducts(): void {
    this.isLoading = true;
    this.error = null;

    // Fetch kids' categories and products
    const requests$ = forkJoin({
      kidsCategories: this.categoryService
        .getMainCategoriesByType('Kids')
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
        // Get kids' category IDs
        const kidsCategoryIds = this.extractKidsCategoryIds(
          data.kidsCategories
        );

        // Filter products to kids' categories only
        const kidsProducts = this.filterProductsByGender(
          data.allProducts,
          kidsCategoryIds
        );
        const kidsNewProducts = this.filterProductsByGender(
          data.newProducts,
          kidsCategoryIds
        );
        const kidsSaleProducts = this.filterProductsByGender(
          data.saleProducts,
          kidsCategoryIds
        );

        // Process and store each type of kids' products separately
        this.processKidsProductsData({
          allProducts: kidsProducts,
          newProducts: kidsNewProducts,
          saleProducts: kidsSaleProducts,
        });

        // Set initial display to all kids' products
        this.currentActiveCategory = 'ALL';
        this.products = [...this.allKidsProductsData];
      },
      error: (error) => {
        console.error("Error loading kids' products:", error);
        this.error = "Failed to load kids' products. Please try again later.";
        this.products = [];
      },
    });
  }

  private extractKidsCategoryIds(kidsCategories: any[]): string[] {
    const categoryIds: string[] = [];

    kidsCategories.forEach((category) => {
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

  private processKidsProductsData(data: {
    allProducts: Product[];
    newProducts: Product[];
    saleProducts: Product[];
  }): void {
    // Process all kids' products
    this.allKidsProductsData = this.transformToSliderProducts(data.allProducts);

    // Process new kids' products
    this.newKidsProductsData = this.transformToSliderProducts(
      data.newProducts.map((product) => ({ ...product, isNew: true }))
    );

    // Process sale kids' products
    this.saleKidsProductsData = this.transformToSliderProducts(
      data.saleProducts
    );

    // Filter by category type for ORIGINALS and SPORTSWEAR
    this.originalsKidsProductsData = this.allKidsProductsData.filter(
      (product) =>
        product.category.toLowerCase().includes('originals') ||
        product.category.toLowerCase().includes('original')
    );

    this.sportswearKidsProductsData = this.allKidsProductsData.filter(
      (product) =>
        product.category.toLowerCase().includes('sportswear') ||
        product.category.toLowerCase().includes('sport')
    );

    console.log("Kids' products processed:", {
      all: this.allKidsProductsData.length,
      new: this.newKidsProductsData.length,
      sale: this.saleKidsProductsData.length,
      originals: this.originalsKidsProductsData.length,
      sportswear: this.sportswearKidsProductsData.length,
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
      // Add your kids' category mappings here
    };

    return categoryMap[categoryId] || "Kids' Category";
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
    console.log("Filtering kids' products by category:", category);

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
      this.products = [...this.allKidsProductsData];
    } else if (category === newCategory) {
      this.products = [...this.newKidsProductsData];
    } else if (category === saleCategory) {
      this.products = [...this.saleKidsProductsData];
    } else {
      this.products = [...this.allKidsProductsData];
    }

    console.log(
      `Filtered kids' products for ${category}:`,
      this.products.length
    );
  }

  // Method to retry loading products
  retryLoadProducts(): void {
    this.loadKidsProducts();
  }
}
