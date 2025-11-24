// product-slider.component.ts
import { Component, Input, Output, EventEmitter, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

export interface Product {
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
  selector: 'app-product-slider',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="product-slider-section">
      <div class="container-fluid">
        <!-- Title with animated underline -->
        <div *ngIf="title" class="section-header">
          <h2 class="section-title">{{ title }}</h2>
          <div class="title-underline"></div>
        </div>

        <!-- Modern Category Pills -->
        <div *ngIf="showCategories" class="category-filters">
          <button
            *ngFor="let category of categories"
            class="category-pill"
            [class.active]="activeCategory === category"
            (click)="selectCategory(category)"
          >
            <span class="category-text">{{ category }}</span>
            <span *ngIf="category === 'SPORTSWEAR'" class="category-icon">🏀</span>
          </button>
        </div>

        <!-- Products Slider with enhanced design -->
        <div class="products-wrapper">
          <div class="products-slider" #slider>
            <div class="products-grid">
              <div
                *ngFor="let product of filteredProducts"
                class="product-card-wrapper"
              >
                <div
                  class="product-card"
                  (click)="navigateToProduct(product.id)"
                >
                  <!-- Badge for new/sale items -->
                  <div class="product-badges">
                    <span *ngIf="product.isNew" class="badge badge-new">NEW</span>
                    <span *ngIf="product.onSale" class="badge badge-sale">SALE</span>
                  </div>

                  <div class="image-container">
                    <img
                      [src]="product.imageUrl"
                      [alt]="product.name"
                      class="product-image"
                    />
                    <div class="product-overlay">
                      <button
                        class="quick-view-btn"
                        (click)="quickView($event, product.id)"
                      >
                        <span class="btn-text">Quick View</span>
                        <span class="btn-icon">→</span>
                      </button>
                    </div>
                  </div>

                  <div class="product-info">
                    <p class="product-category">{{ product.category }}</p>
                    <h5 class="product-name">{{ product.name }}</h5>
                    <div class="product-pricing">
                      <span class="current-price">{{ product.price | number : '1.2-2' }} EGP</span>
                      <span *ngIf="product.originalPrice" class="original-price">
                        {{ product.originalPrice | number : '1.2-2' }} EGP
                      </span>
                      <span *ngIf="product.discount" class="discount-badge">
                        -{{ product.discount }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Modern Navigation Arrows -->
          <button
            class="slider-nav prev-btn"
            (click)="slideLeft()"
            [disabled]="currentSlide === 0"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button
            class="slider-nav next-btn"
            (click)="slideRight()"
            [disabled]="currentSlide >= maxSlides"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .product-slider-section {
      padding: 4rem 0;
      background: linear-gradient(180deg, #fafafa 0%, #ffffff 100%);

      .container-fluid {
        max-width: 1400px;
        margin: 0 auto;
        padding: 0 2rem;
      }

      .section-header {
        text-align: center;
        margin-bottom: 3rem;

        .section-title {
          font-size: 2.5rem;
          font-weight: 800;
          color: #1a1a1a;
          letter-spacing: -0.02em;
          margin-bottom: 1rem;
          text-transform: uppercase;

          @media (max-width: 768px) {
            font-size: 2rem;
          }
        }

        .title-underline {
          width: 80px;
          height: 4px;
          background: linear-gradient(90deg, #000 0%, #666 100%);
          margin: 0 auto;
          border-radius: 2px;
        }
      }

      .category-filters {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 1rem;
        margin-bottom: 3rem;
        padding: 0 1rem;

        .category-pill {
          background: #ffffff;
          border: 2px solid #e5e5e5;
          color: #333;
          padding: 0.75rem 2rem;
          font-weight: 600;
          font-size: 0.9rem;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          border-radius: 50px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

          &:hover {
            transform: translateY(-2px);
            border-color: #333;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }

          &.active {
            background: linear-gradient(135deg, #1a1a1a 0%, #333 100%);
            border-color: #1a1a1a;
            color: white;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
          }

          .category-icon {
            font-size: 1.1rem;
          }
        }
      }

      .products-wrapper {
        position: relative;
        margin: 0 3rem;

        @media (max-width: 768px) {
          margin: 0 1rem;
        }

        .products-slider {
          overflow-x: auto;
          scroll-behavior: smooth;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding: 1rem 0;

          &::-webkit-scrollbar {
            display: none;
          }

          .products-grid {
            display: flex;
            gap: 1.5rem;
            min-width: max-content;
          }

          .product-card-wrapper {
            flex: 0 0 auto;
            width: 300px;

            @media (max-width: 1200px) {
              width: 270px;
            }

            @media (max-width: 768px) {
              width: 240px;
            }

            @media (max-width: 576px) {
              width: 220px;
            }
          }
        }

        .product-card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          height: 100%;
          position: relative;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);

          &:hover {
            transform: translateY(-8px);
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);

            .product-image {
              transform: scale(1.05);
            }

            .product-overlay {
              opacity: 1;
            }
          }

          .product-badges {
            position: absolute;
            top: 1rem;
            left: 1rem;
            z-index: 5;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;

            .badge {
              padding: 0.4rem 0.8rem;
              font-size: 0.7rem;
              font-weight: 700;
              letter-spacing: 0.05em;
              border-radius: 20px;
              backdrop-filter: blur(10px);

              &.badge-new {
                background: rgba(34, 197, 94, 0.95);
                color: white;
              }

              &.badge-sale {
                background: rgba(239, 68, 68, 0.95);
                color: white;
              }
            }
          }

          .image-container {
            position: relative;
            height: 320px;
            overflow: hidden;
            background: #f8f9fa;

            @media (max-width: 768px) {
              height: 280px;
            }

            .product-image {
              width: 100%;
              height: 100%;
              object-fit: cover;
              object-position: center;
              transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .product-overlay {
              position: absolute;
              inset: 0;
              background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.85) 100%);
              display: flex;
              align-items: flex-end;
              justify-content: center;
              padding: 2rem;
              opacity: 0;
              transition: opacity 0.4s ease;

              .quick-view-btn {
                background: white;
                color: #1a1a1a;
                border: none;
                padding: 1rem 2rem;
                font-weight: 700;
                font-size: 0.9rem;
                letter-spacing: 0.05em;
                text-transform: uppercase;
                border-radius: 50px;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                transition: all 0.3s ease;
                cursor: pointer;

                &:hover {
                  background: #1a1a1a;
                  color: white;
                  gap: 1rem;
                }

                .btn-icon {
                  font-size: 1.2rem;
                  transition: transform 0.3s ease;
                }

                &:hover .btn-icon {
                  transform: translateX(4px);
                }
              }
            }
          }

          .product-info {
            padding: 1.5rem;

            .product-category {
              font-size: 0.75rem;
              color: #999;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              margin-bottom: 0.5rem;
              font-weight: 600;
            }

            .product-name {
              font-size: 1rem;
              font-weight: 700;
              color: #1a1a1a;
              margin-bottom: 1rem;
              line-height: 1.4;
              min-height: 2.8rem;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }

            .product-pricing {
              display: flex;
              align-items: center;
              gap: 0.75rem;
              flex-wrap: wrap;

              .current-price {
                font-size: 1.25rem;
                font-weight: 800;
                color: #1a1a1a;
              }

              .original-price {
                font-size: 0.95rem;
                color: #999;
                text-decoration: line-through;
              }

              .discount-badge {
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                color: white;
                padding: 0.25rem 0.6rem;
                border-radius: 12px;
                font-size: 0.75rem;
                font-weight: 700;
              }
            }
          }
        }

        .slider-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: white;
          border: 2px solid #e5e5e5;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #333;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          z-index: 10;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

          &:hover:not(:disabled) {
            background: #1a1a1a;
            color: white;
            border-color: #1a1a1a;
            transform: translateY(-50%) scale(1.1);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
          }

          &:disabled {
            opacity: 0.3;
            cursor: not-allowed;
            transform: translateY(-50%);
          }

          &.prev-btn {
            left: -28px;

            @media (max-width: 768px) {
              left: -20px;
            }
          }

          &.next-btn {
            right: -28px;

            @media (max-width: 768px) {
              right: -20px;
            }
          }

          @media (max-width: 576px) {
            width: 44px;
            height: 44px;
            display: none;
          }
        }
      }

      @media (max-width: 768px) {
        padding: 3rem 0;

        .category-filters {
          justify-content: flex-start;
          overflow-x: auto;
          padding-bottom: 1rem;
          margin-bottom: 2rem;
          -webkit-overflow-scrolling: touch;

          &::-webkit-scrollbar {
            display: none;
          }

          .category-pill {
            flex-shrink: 0;
            padding: 0.6rem 1.5rem;
            font-size: 0.85rem;
          }
        }
      }

      @media (max-width: 576px) {
        padding: 2rem 0;

        .section-header {
          margin-bottom: 2rem;

          .section-title {
            font-size: 1.75rem;
          }
        }
      }
    }
  `],
})
export class ProductSliderComponent implements OnInit, AfterViewInit {
  @Input() products: Product[] = [];
  @Input() categories: string[] = [];
  @Input() showCategories: boolean = true;
  @Input() title: string = '';
  @Output() categorySelected = new EventEmitter<string>();

  activeCategory: string = '';
  filteredProducts: Product[] = [];
  currentSlide: number = 0;
  maxSlides: number = 0;
  itemsPerSlide: number = 4;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.activeCategory = this.categories.length > 0 ? this.categories[0] : '';
    this.filterProducts();
    this.updateItemsPerSlide();

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        this.updateItemsPerSlide();
        this.currentSlide = 0; // Reset slide on resize
      });
    }
  }

  ngAfterViewInit(): void {
    // Ensure slider is ready
    setTimeout(() => {
      this.calculateMaxSlides();
    }, 100);
  }

  selectCategory(category: string): void {
    this.activeCategory = category;
    this.currentSlide = 0; // Reset to first slide
    this.filterProducts();
    this.categorySelected.emit(category);

    // Reset scroll position
    setTimeout(() => {
      const slider = document.querySelector('.products-slider') as HTMLElement;
      if (slider) {
        slider.scrollTo({ left: 0, behavior: 'smooth' });
      }
    }, 0);
  }

  navigateToProduct(productId: string): void {
    console.log('Navigating to product:', productId);
    this.router.navigate(['/product', productId]);
  }

  quickView(event: Event, productId: string): void {
    event.stopPropagation();
    console.log('Quick view for product:', productId);
    this.navigateToProduct(productId);
  }

  filterProducts(): void {
    if (!this.activeCategory || this.activeCategory === 'NEW') {
      this.filteredProducts = this.products;
    } else if (this.activeCategory === 'SALE') {
      this.filteredProducts = this.products.filter((p) => p.onSale);
    } else if (this.activeCategory === 'ORIGINALS') {
      this.filteredProducts = this.products.filter((p) =>
        p.category.toLowerCase().includes('originals')
      );
    } else if (this.activeCategory === 'SPORTSWEAR') {
      this.filteredProducts = this.products.filter((p) =>
        p.category.toLowerCase().includes('sportswear')
      );
    } else {
      this.filteredProducts = this.products;
    }

    setTimeout(() => {
      this.calculateMaxSlides();
    }, 100);
  }

  slideLeft(): void {
    const slider = document.querySelector('.products-slider') as HTMLElement;
    if (slider && this.currentSlide > 0) {
      this.currentSlide--;
      const scrollAmount = slider.clientWidth;
      slider.scrollBy({
        left: -scrollAmount,
        behavior: 'smooth'
      });
    }
  }

  slideRight(): void {
    const slider = document.querySelector('.products-slider') as HTMLElement;
    if (slider && this.currentSlide < this.maxSlides) {
      this.currentSlide++;
      const scrollAmount = slider.clientWidth;
      slider.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
    }
  }

  private getCardWidth(): number {
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      if (width <= 576) return 220;
      if (width <= 768) return 240;
      if (width <= 1200) return 270;
      return 300;
    }
    return 300;
  }

  private getItemsPerSlide(): number {
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      if (width < 576) return 1;
      if (width < 768) return 2;
      if (width < 992) return 3;
      return 4;
    }
    return 4;
  }

  private calculateMaxSlides(): void {
    const slider = document.querySelector('.products-slider') as HTMLElement;
    if (slider) {
      const scrollWidth = slider.scrollWidth;
      const clientWidth = slider.clientWidth;
      this.maxSlides = Math.ceil((scrollWidth - clientWidth) / clientWidth);
    }
  }

  private updateItemsPerSlide(): void {
    this.itemsPerSlide = this.getItemsPerSlide();
    this.calculateMaxSlides();
  }
}
