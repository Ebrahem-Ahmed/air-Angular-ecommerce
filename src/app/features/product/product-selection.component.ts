import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ProductWithVariants,
  ProductVariant,
} from '../product/product.service';
import { TranslateModule } from '@ngx-translate/core';

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

@Component({
  selector: 'app-product-selection',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <!-- Product Title -->
    <h1
      class="product-title mt-4 fw-normal fst-italic letter-spacing-4"
      style="font-size: 2.5rem; line-height: 1.2"
    >
      {{ product.name }}
    </h1>

    <!-- Price -->
    <div class="price-container mb-4">
      @if (product.isOnSale && discountPercentage > 0) {
      <span class="price fw-bold text-danger fs-4">
        {{ formatPrice(effectivePrice) }}
      </span>
      <span class="original-price text-muted text-decoration-line-through ms-2">
        {{ formatPrice(product.price) }}
      </span>
      }@else {
      <span class="price fw-bold fs-4">
        {{ formatPrice(effectivePrice) }}
      </span>
      }
    </div>

    <!-- Color Selection -->
    @if (availableColors.length > 0) {
    <div class="color-selector mb-4">
      <h6 class="fw-bold mb-3">
        {{ 'PRODUCT.DETAILS.COLOUR' | translate }}
        @if (selectedColor) {
        <span class="fw-normal">{{ selectedColor | titlecase }}</span>
        }
      </h6>
      <div class="color-options d-flex gap-2 flex-wrap">
        @for (colorInfo of availableColors; track colorInfo.color) {
        <div
          class="color-option position-relative border border-2"
          [class.disabled]="!colorInfo.available"
          [class.selected]="selectedColor === colorInfo.color"
          (click)="onColorSelect(colorInfo.color)"
          [attr.title]="
            colorInfo.color + (colorInfo.available ? '' : ' - Out of Stock')
          "
          style="
            width: 48px;
            height: 48px;
            cursor: pointer;
            background: #f8f9fa;
          "
          [style.border-color]="
            selectedColor === colorInfo.color ? '#000' : '#dee2e6'
          "
          [style.opacity]="colorInfo.available ? '1' : '0.4'"
        >
          <!-- Color stripes -->
          <div
            class="position-absolute"
            style="
              top: 4px;
              right: 4px;
              width: 16px;
              height: 2px;
              transform: rotate(-45deg);
              transform-origin: right;
            "
            [style.background-color]="getColorValue(colorInfo.color)"
          ></div>
          <div
            class="position-absolute"
            style="
              top: 8px;
              right: 4px;
              width: 20px;
              height: 2px;
              transform: rotate(-45deg);
              transform-origin: right;
            "
            [style.background-color]="getColorValue(colorInfo.color)"
          ></div>
          <div
            class="position-absolute"
            style="
              top: 12px;
              right: 4px;
              width: 24px;
              height: 2px;
              transform: rotate(-45deg);
              transform-origin: right;
            "
            [style.background-color]="getColorValue(colorInfo.color)"
          ></div>
          @if (!colorInfo.available) {
          <div
            class="position-absolute top-50 start-50 translate-middle text-muted"
            style="font-size: 12px; z-index: 1"
          >
            <i class="fas fa-times"></i>
          </div>
          }
        </div>
        }
      </div>
    </div>
    }

    <!-- Size Selection -->
    <div class="size-selector mb-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
       <!--  <span class="fw-bold">
          {{ 'PRODUCT.DETAILS.SIZE' | translate }}
          @if (selectedSize) {
          <span class="fw-normal">{{ selectedSize }}</span>
          }
        </span> -->

        <!-- <button
          class="btn btn-link p-0 text-decoration-underline text-dark small fw-medium"
          (click)="onSizeChartClick()"
        >
          {{ 'PRODUCT.DETAILS.SIZE_CHART' | translate }}
        </button> -->
      </div>

      <div class="size-options d-flex rounded-0 flex-wrap mb-3">
        @for (size of allSizes; track size) {
        <button
          type="button"
          [disabled]="!isSizeAvailable(size)"
          (click)="onSizeSelect(size)"
          [class]="getSizeButtonClass(size)"
          class="rounded-0"
          style="
            width: 90px;
            height: 50px;
            font-size: 16px;
            font-weight: 500;
            transition: all 0.3s ease;
          "
        >
          {{ size }}
        </button>
        }
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="action-buttons d-flex gap-3 mb-4">
      <button
        type="button"
        class="btn btn-dark fancy-btn text-uppercase fw-bold py-3 rounded-0 flex-grow-1"
        [disabled]="!canAddToCart"
        (click)="onAddToCart()"
        style="
          font-size: 16px;
          letter-spacing: 1px;
          background-color: black !important;
          height: 60px;
        "
      >
        @if (isAddingToCart) {
        <span
          class="spinner-border spinner-border-sm me-2"
          role="status"
        ></span>
        {{ 'PRODUCT.DETAILS.ADDING' | translate }} } @else {
        {{ 'PRODUCT.DETAILS.ADD_TO_BAG' | translate }} }
        <svg
          class="ms-2"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5 12H19M19 12L12 5M19 12L12 19"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <button
        type="button"
        class="btn btn-outline-dark d-flex align-items-center justify-content-center rounded-1"
        [disabled]="isTogglingWishlist"
        (click)="onToggleWishlist()"
        style="
          width: 60px;
          height: 60px;
          min-width: 50px;
          border: 2px solid #000;
        "
      >
        @if (isTogglingWishlist) {
        <span
          class="spinner-border spinner-border-sm"
          role="status"
          style="width: 20px; height: 20px"
        ></span>
        } @else { @if(isInWishlist){
        <img
          src="/Icons/wishlist.svg"
          alt="Remove from wishlist"
          width="24"
          height="24"
        />
        } @else {
        <img
          src="/Icons/wishlist-empty.svg"
          alt="Add to wishlist"
          width="24"
          height="24"
        />
        } }
      </button>
    </div>

    <!-- Product Features -->
    <div class="product-features">
      <div class="feature-item d-flex align-items-start mb-3">
        <i class="fas fa-shipping-fast me-3 mt-1 text-muted"></i>
        <div>
          <div class="fw-medium">
            {{ 'PRODUCT.DETAILS.FEATURES.FREE_SHIPPING' | translate }}
          </div>
          <small class="text-muted">{{
            'PRODUCT.DETAILS.FEATURES.FREE_SHIPPING_DESC' | translate
          }}</small>
        </div>
      </div>
      <div class="feature-item d-flex align-items-start mb-3">
        <i class="fas fa-undo me-3 mt-1 text-muted"></i>
        <div>
          <div class="fw-medium">
            {{ 'PRODUCT.DETAILS.FEATURES.FREE_RETURNS' | translate }}
          </div>
          <small class="text-muted">{{
            'PRODUCT.DETAILS.FEATURES.FREE_RETURNS_DESC' | translate
          }}</small>
        </div>
      </div>
      <div class="feature-item d-flex align-items-start mb-3">
        <i class="fas fa-shield-alt me-3 mt-1 text-muted"></i>
        <div>
          <div class="fw-medium">
            {{ 'PRODUCT.DETAILS.FEATURES.AUTHENTIC_PRODUCTS' | translate }}
          </div>
          <small class="text-muted">{{
            'PRODUCT.DETAILS.FEATURES.AUTHENTIC_PRODUCTS_DESC' | translate
          }}</small>
        </div>
      </div>
    </div>
  `,
  styles: `// Product Selection Component SCSS
// Handles color/size selection, pricing, and action buttons

// Product title styling
.product-title {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  line-height: 1.2;
}

// Price styling
.price-container {
  .price {
    font-size: 1.5rem;
    color: #000;
  }

  .original-price {
    font-size: 1.2rem;
  }
}

// Color options styling
.color-selector {
  .color-options {
    gap: 0.5rem;
  }
}

.color-option {
  transition: all 0.3s ease;
  position: relative;

  &:hover:not(.disabled) {
    transform: scale(1.05);
    border-color: #000 !important;
  }

  &.selected {
    transform: scale(1.1);
    border-color: #000 !important;
  }

  &.disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }

  // Color stripe lines - positioned absolutely for precise placement
  .position-absolute {
    background: inherit;
    transform: rotate(-45deg);
    transform-origin: right;
  }
}

// Size options styling
.size-selector {
  .size-options {
    gap: 0.25rem;
    flex-wrap: wrap;
  }
}

.size-option,
.btn {
  transition: all 0.3s ease;
  position: relative;

  &:hover:not(:disabled):not(.text-muted) {
    transform: translateY(-2px);
    border-color: #000 !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &:disabled,
  &.text-muted {
    cursor: not-allowed;
    opacity: 0.3 !important;

    &:hover {
      transform: none;
      box-shadow: none;
    }
  }

  &.btn-dark {
    background-color: #000 !important;
    border-color: #000 !important;
    transform: scale(1.02);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
}

// Action buttons
.action-buttons {
  .btn {
    border-radius: 0;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 16px 24px;
    transition: all 0.3s ease;

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  // Special styling for add to cart button
  .fancy-btn {
    position: relative;
    overflow: hidden;

    &::before {
      content: "";
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.2),
        transparent
      );
      transition: left 0.5s;
    }

    &:hover::before {
      left: 100%;
    }
  }

  // Wishlist button styling
  .btn-outline-dark {
    border: 2px solid #000;

    &:hover {
      background-color: #000;
      border-color: #000;

      img {
        filter: invert(1);
      }
    }
  }
}

// Product features section
.product-features {
  .feature-item {
    transition: transform 0.2s ease;

    &:hover {
      transform: translateX(5px);
    }

    i {
      color: #6c757d;
      font-size: 1.2rem;
    }

    .fw-medium {
      color: #000;
      font-weight: 600;
    }

    small {
      color: #6c757d;
      font-size: 0.875rem;
    }
  }
}

// Loading states
.spinner-border-sm {
  width: 1rem;
  height: 1rem;
}

// Responsive design adjustments
@media (max-width: 768px) {
  .product-title {
    font-size: 1.5rem !important;
  }

  .action-buttons {
    flex-direction: column !important;

    .btn {
      margin-bottom: 0.5rem;
      width: 100%;
    }
  }

  .color-options,
  .size-options {
    justify-content: center;
  }

  .price-container .price {
    font-size: 1.25rem;
  }

  .color-option {
    width: 44px !important;
    height: 44px !important;
  }

  .size-options .btn {
    width: 80px !important;
    height: 45px !important;
    font-size: 14px !important;
  }
}

@media (max-width: 576px) {
  .product-title {
    font-size: 1.25rem !important;
    letter-spacing: 1px;
  }

  .price-container .price {
    font-size: 1.25rem;
  }

  .color-option {
    width: 44px !important;
    height: 44px !important;
  }

  .size-options .btn {
    width: 75px !important;
    height: 42px !important;
    font-size: 12px !important;
  }

  .action-buttons {
    .btn {
      padding: 14px 20px;
      font-size: 14px;
      letter-spacing: 0.5px;
    }
  }

  .product-features {
    .feature-item {
      i {
        font-size: 1rem;
      }
    }
  }
}

// Enhanced hover effects for premium look
.color-selector h6,
.size-selector .fw-bold {
  font-weight: 700;
  color: #000;
  margin-bottom: 1rem;
}

// Size chart button
.btn-link {
  color: #000 !important;
  font-weight: 500;
  text-decoration: underline !important;
  padding: 0;

  &:hover {
    color: #333 !important;
    text-decoration: underline !important;
  }
}

// Color and size selection feedback
.color-option,
.size-options .btn {
  &.selected,
  &.btn-dark {
    box-shadow: 0 0 0 2px #fff, 0 0 0 4px #000;
  }
}

// Animation for selection changes
.color-options,
.size-options {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}`,
})
export class ProductSelectionComponent {
  @Input() product!: ProductWithVariants;
  @Input() availableColors: ColorInfo[] = [];
  @Input() allSizes: string[] = [];
  @Input() selectedColor: string | null = null;
  @Input() selectedSize: string | null = null;
  @Input() canAddToCart: boolean = false;
  @Input() isAddingToCart: boolean = false;
  @Input() isTogglingWishlist: boolean = false;
  @Input() isInWishlist: boolean = false;
  @Input() effectivePrice: number = 0;
  @Input() discountPercentage: number = 0;

  @Output() colorSelect = new EventEmitter<string>();
  @Output() sizeSelect = new EventEmitter<string>();
  @Output() addToCart = new EventEmitter<void>();
  @Output() toggleWishlist = new EventEmitter<void>();
  @Output() sizeChartClick = new EventEmitter<void>();

  onColorSelect(color: string) {
    this.colorSelect.emit(color);
  }

  onSizeSelect(size: string) {
    this.sizeSelect.emit(size);
  }

  onAddToCart() {
    this.addToCart.emit();
  }

  onToggleWishlist() {
    this.toggleWishlist.emit();
  }

  onSizeChartClick() {
    this.sizeChartClick.emit();
  }

  isSizeAvailable(size: string): boolean {
    if (!this.selectedColor) return false;

    const variants = this.product.variants || [];
    const variant = variants.find(
      (v) => v.size === size && v.color === this.selectedColor
    );
    return variant ? variant.stockQuantity > 0 : false;
  }

  getSizeButtonClass(size: string): string {
    const isSelected = size === this.selectedSize;
    const isAvailable = this.isSizeAvailable(size);

    let classes = 'btn';

    if (!isAvailable) {
      classes += ' btn-outline-secondary text-muted border-secondary';
      return classes;
    }

    if (isSelected) {
      classes += ' btn-dark text-white border-dark';
    } else {
      classes += ' btn-outline-dark text-dark border-dark';
    }

    return classes;
  }

  formatPrice(price: number): string {
    return `EGP ${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }

  getColorValue(color: string): string {
    const colorMap: { [key: string]: string } = {
      white: '#ffffff',
      black: '#000000',
      blue: '#1e40af',
      red: '#dc2626',
      gray: '#6b7280',
      grey: '#6b7280',
      green: '#16a34a',
      yellow: '#eab308',
      pink: '#ec4899',
      purple: '#9333ea',
      orange: '#ea580c',
      brown: '#a16207',
      navy: '#1e3a8a',
      beige: '#f5f5dc',
      cream: '#f5f5dc',
      tan: '#d2b48c',
    };
    return colorMap[color.toLowerCase()] || '#6b7280';
  }
}
