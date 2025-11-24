// components/variant-selector/variant-selector.component.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../features/cart/cart.service';
import {
  VariantSelectorProduct,
  ProductVariant,
} from '../Interfaces/product.interface';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

export interface VariantSelection {
  size: string;
  color: string;
  variant?: ProductVariant;
  quantity: number;
}

@Component({
  selector: 'app-variant-selector',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `<!-- Localized template for variant-selector.component.ts -->
    <div
      class="variant-selector-overlay"
      [class.show]="isOpen()"
      (click)="onOverlayClick($event)"
    >
      <div class="variant-selector-panel" [class.slide-in]="isOpen()">
        <!-- Header -->
        <div class="selector-header">
          <button class="close-btn" (click)="closed.emit()">
            <i class="fas fa-times"></i>
          </button>
          <h3>{{ 'VARIANT_SELECTOR.SELECT_SIZE_COLOR' | translate }}</h3>
        </div>

        <!-- Product Info -->
        <div *ngIf="product()" class="product-info">
          <div class="product-image">
            <img
              [src]="
                selectedVariantImage() ||
                product()!.imageUrl ||
                '/assets/images/placeholder-product.jpg'
              "
              [alt]="product()!.productName"
              loading="lazy"
            />
          </div>
          <div class="product-details">
            <h4>{{ product()!.productName }}</h4>
            <div class="price-info">
              <span class="current-price">{{
                formatPrice(currentPrice())
              }}</span>
              <span *ngIf="showOriginalPrice" class="original-price">
                {{ formatPrice(originalPriceValue) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Size Selection -->
        <div class="selection-section">
          <h4>{{ 'VARIANT_SELECTOR.SELECT_SIZE' | translate }}</h4>
          <div class="size-options">
            <button
              *ngFor="let size of availableSizes()"
              class="size-option rounded-0 border-black"
              [class.selected]="selectedSize() === size"
              [class.disabled]="!isSizeAvailable(size)"
              [disabled]="!isSizeAvailable(size)"
              (click)="selectSize(size)"
            >
              {{ size }}
            </button>
          </div>
        </div>

        <!-- Color Selection -->
        <div class="selection-section">
          <h4>{{ 'VARIANT_SELECTOR.SELECT_COLOR' | translate }}</h4>
          <div class="color-options">
            <button
              *ngFor="let color of availableColors()"
              class="color-option "
              [class.selected]="selectedColor() === color.name"
              [class.disabled]="!color.available"
              [disabled]="!color.available"
              (click)="selectColor(color.name)"
              [attr.title]="color.name"
            >
              <div
                class="color-swatch rounded-0 border border-1 border-dark"
                [style.background-color]="
                  color.hex || '#' + color.name.toLowerCase().replace(' ', '')
                "
              ></div>
              <span class="color-name">{{ color.name }}</span>
            </button>
          </div>
        </div>

        <!-- Quantity Selection -->
        <div class="selection-section" *ngIf="selectedVariant()">
          <h4>{{ 'VARIANT_SELECTOR.QUANTITY' | translate }}</h4>
          <div class="quantity-selector">
            <button
              class="qty-btn"
              [disabled]="quantity() <= 1"
              (click)="decreaseQuantity()"
            >
              <i class="fas fa-minus"></i>
            </button>
            <span class="quantity">{{ quantity() }}</span>
            <button
              class="qty-btn"
              [disabled]="quantity() >= maxQuantity()"
              (click)="increaseQuantity()"
            >
              <i class="fas fa-plus"></i>
            </button>
          </div>
          <p class="stock-info">
            {{ getLocalizedStockMessage() }}
          </p>
        </div>

        <!-- Error Message -->
        <div *ngIf="errorMessage()" class="error-message">
          {{ errorMessage() }}
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <button
            class="add-to-cart-btn fancy-btn rounded-0"
            [disabled]="!canAddToCart() || isAdding()"
            (click)="addToCart()"
          >
            <span *ngIf="!isAdding()">
              {{ 'VARIANT_SELECTOR.ADD_TO_CART' | translate }}
              <span class="text-white ms-2">→</span>
            </span>
            <span *ngIf="isAdding()" class="loading">
              <i class="fas fa-spinner fa-spin"></i>
              {{ 'VARIANT_SELECTOR.ADDING' | translate }}
            </span>
          </button>
          <button
            class="continue-shopping-btn rounded-0"
            (click)="closed.emit()"
          >
            {{ 'VARIANT_SELECTOR.CONTINUE_SHOPPING' | translate }}
          </button>
        </div>
      </div>
    </div>`,
  styles: [
    `
      .variant-selector-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1040;
        display: flex;
        justify-content: flex-end;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s ease, visibility 0.3s ease;
      }

      .variant-selector-overlay.show {
        opacity: 1;
        visibility: visible;
      }

      .variant-selector-panel {
        width: 500px;
        max-width: 90vw;
        height: 100vh;
        background: white;
        overflow-y: auto;
        transform: translateX(100%);
        transition: transform 0.3s ease-in-out;
        box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
      }
      .variant-selector-panel::-webkit-scrollbar {
        width: 8px;
      }
      .variant-selector-panel.slide-in {
        transform: translateX(0);
      }

      .selector-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px;
        border-bottom: 1px solid #e0e0e0;
        position: sticky;
        top: 0;
        background: white;
        z-index: 10;
      }

      .selector-header h3 {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 600;
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 1.2rem;
        cursor: pointer;
        padding: 8px;
        border-radius: 50%;
        transition: background-color 0.2s ease;
      }

      .close-btn:hover {
        background-color: #f5f5f5;
      }

      .product-info {
        display: flex;
        padding: 20px;
        gap: 15px;
        border-bottom: 1px solid #e0e0e0;
      }

      .product-image {
        width: 80px;
        height: 80px;
        overflow: hidden;
        flex-shrink: 0;
      }

      .product-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .product-details h4 {
        margin: 0 0 8px 0;
        font-size: 1rem;
        font-weight: 600;
      }

      .price-info {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .current-price {
        font-weight: 600;
        color: #000;
      }

      .original-price {
        text-decoration: line-through;
        color: #999;
        font-size: 0.9rem;
      }

      .selection-section {
        padding: 20px;
        border-bottom: 1px solid #e0e0e0;
      }

      .selection-section h4 {
        margin: 0 0 15px 0;
        font-size: 1rem;
        font-weight: 600;
      }

      .size-options,
      .color-options {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .size-option {
        min-width: 50px;
        height: 50px;
        border: 2px solid #ddd;
        background: white;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s ease;
      }

      .size-option:hover:not(:disabled) {
        border-color: #000;
      }

      .size-option.selected {
        border-color: #000;
        background: #000;
        color: white;
      }

      .size-option:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background: #f5f5f5;
      }

      .color-option {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
        padding: 8px;
        border: 0.1px solid transparent;
        background: none;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .color-option:hover:not(:disabled) {
        border-color: #2b2b2bff;
        border-radius: none;
      }

      .color-option.selected {
        border-color: #000;
      }

      .color-option:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .color-swatch {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 1px solid #ddd;
      }

      .color-name {
        font-size: 0.8rem;
        text-align: center;
      }

      .quantity-selector {
        display: flex;
        align-items: center;
        gap: 15px;
        margin-bottom: 10px;
      }

      .qty-btn {
        width: 40px;
        height: 40px;
        border: 1px solid #ddd;
        background: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .qty-btn:hover:not(:disabled) {
        border-color: #000;
      }

      .qty-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .quantity {
        font-weight: 600;
        font-size: 1.1rem;
        min-width: 30px;
        text-align: center;
      }

      .stock-info {
        margin: 0;
        font-size: 0.9rem;
        color: #666;
      }

      .error-message {
        padding: 20px;
        background: #fff3cd;
        color: #856404;
        border-left: 4px solid #ffc107;
        margin: 20px;
        border-radius: 4px;
      }

      .action-buttons {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        position: sticky;
        bottom: 0;
        background: white;
        border-top: 1px solid #e0e0e0;
      }

      .add-to-cart-btn {
        width: 100%;
        height: 50px;
        background: #000;
        color: white;
        border: none;
        border-radius: 4px;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s ease;
      }

      .add-to-cart-btn:hover:not(:disabled) {
        background: #333;
      }

      .add-to-cart-btn:disabled {
        background: #ccc;
        cursor: not-allowed;
      }

      .add-to-cart-btn .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .continue-shopping-btn {
        width: 100%;
        height: 45px;
        background: white;
        color: #000;
        border: 2px solid #000;
        border-radius: 4px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .continue-shopping-btn:hover {
        background: #f5f5f5;
      }

      @media (max-width: 768px) {
        .variant-selector-panel {
          width: 100vw;
        }

        .product-info {
          flex-direction: column;
          text-align: center;
        }

        .product-image {
          align-self: center;
        }
      }
    `,
  ],
})
export class VariantSelectorComponent implements OnInit {
  private cartService = inject(CartService);
  private translateService = inject(TranslateService);

  @Input() product = signal<VariantSelectorProduct | null>(null);
  @Input() isOpen = signal(false);
  @Output() closed = new EventEmitter<void>();
  @Output() added = new EventEmitter<{ success: boolean; message: string }>();

  // Selection state
  selectedSize = signal<string>('');
  selectedColor = signal<string>('');
  quantity = signal<number>(1);
  errorMessage = signal<string>('');
  isAdding = signal<boolean>(false);

  // Computed values
  availableVariants = computed(() => {
    const prod = this.product();
    return prod?.variants?.filter((v) => v.isAvailable) || [];
  });

  availableSizes = computed(() => {
    const variants = this.availableVariants();
    const sizes = [...new Set(variants.map((v) => v.size))].filter(Boolean);
    return sizes.sort((a, b) => {
      // Custom size sorting logic
      const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
      const indexA = sizeOrder.indexOf(a);
      const indexB = sizeOrder.indexOf(b);

      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }

      // For numeric sizes
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }

      return a.localeCompare(b);
    });
  });

  availableColors = computed(() => {
    const variants = this.availableVariants();
    const selectedSz = this.selectedSize();

    // Filter variants by selected size if any
    const relevantVariants = selectedSz
      ? variants.filter((v) => v.size === selectedSz)
      : variants;

    const colorMap = new Map();

    relevantVariants.forEach((variant) => {
      if (!colorMap.has(variant.color)) {
        colorMap.set(variant.color, {
          name: variant.color,
          available: variant.isAvailable && variant.stockQuantity > 0,
          hex: this.getColorHex(variant.color),
          stockCount: variant.stockQuantity,
        });
      }
    });

    return Array.from(colorMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  });

  selectedVariant = computed(() => {
    const variants = this.availableVariants();
    const size = this.selectedSize();
    const color = this.selectedColor();

    if (!size || !color) return null;

    return (
      variants.find(
        (v) => v.size === size && v.color === color && v.isAvailable
      ) || null
    );
  });

  maxQuantity = computed(() => {
    const variant = this.selectedVariant();
    return variant ? Math.min(variant.stockQuantity, 10) : 1;
  });

  currentPrice = computed(() => {
    const prod = this.product();
    const variant = this.selectedVariant();

    if (!prod) return 0;

    const basePrice = prod.price;
    const adjustment = variant?.priceAdjustment || 0;

    return basePrice + adjustment;
  });

  selectedVariantImage = computed(() => {
    const variant = this.selectedVariant();
    return variant?.imageUrl || '';
  });

  canAddToCart = computed(() => {
    return !!(
      this.selectedSize() &&
      this.selectedColor() &&
      this.selectedVariant() &&
      this.quantity() > 0 &&
      this.quantity() <= this.maxQuantity()
    );
  });

  ngOnInit(): void {
    // Auto-select first available size and color if only one option
    const sizes = this.availableSizes();
    const colors = this.availableColors();

    if (sizes.length === 1) {
      this.selectedSize.set(sizes[0]);
    }

    if (colors.length === 1) {
      this.selectedColor.set(colors[0].name);
    }
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }

  selectSize(size: string): void {
    if (!this.isSizeAvailable(size)) return;

    this.selectedSize.set(size);
    this.errorMessage.set('');

    // Reset color if current selection is not available with new size
    const currentColor = this.selectedColor();
    if (currentColor && !this.isColorAvailableForSize(currentColor, size)) {
      this.selectedColor.set('');
    }
  }

  selectColor(color: string): void {
    const colorOption = this.availableColors().find((c) => c.name === color);
    if (!colorOption?.available) return;

    this.selectedColor.set(color);
    this.errorMessage.set('');
  }

  increaseQuantity(): void {
    const current = this.quantity();
    const max = this.maxQuantity();
    if (current < max) {
      this.quantity.set(current + 1);
    }
  }

  decreaseQuantity(): void {
    const current = this.quantity();
    if (current > 1) {
      this.quantity.set(current - 1);
    }
  }

  isSizeAvailable(size: string): boolean {
    const variants = this.availableVariants();
    return variants.some(
      (v) => v.size === size && v.isAvailable && v.stockQuantity > 0
    );
  }

  isColorAvailableForSize(color: string, size: string): boolean {
    const variants = this.availableVariants();
    return variants.some(
      (v) =>
        v.size === size &&
        v.color === color &&
        v.isAvailable &&
        v.stockQuantity > 0
    );
  }

  getLocalizedStockMessage(): string {
    const variant = this.selectedVariant();
    if (!variant) return '';

    const stock = variant.stockQuantity;

    if (stock <= 0) {
      return this.translateService.instant(
        'VARIANT_SELECTOR.STOCK.OUT_OF_STOCK'
      );
    }

    if (stock <= 5) {
      return this.translateService.instant('VARIANT_SELECTOR.STOCK.ONLY_LEFT', {
        count: stock,
      });
    }

    if (stock <= 10) {
      return this.translateService.instant('VARIANT_SELECTOR.STOCK.AVAILABLE', {
        count: stock,
      });
    }

    return this.translateService.instant('VARIANT_SELECTOR.STOCK.IN_STOCK');
  }

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

  addToCart(): void {
    if (!this.canAddToCart()) {
      const errorMsg = this.translateService.instant(
        'VARIANT_SELECTOR.ERRORS.SELECT_SIZE_COLOR'
      );
      this.errorMessage.set(errorMsg);
      return;
    }

    const variant = this.selectedVariant();
    const prod = this.product();

    if (!variant || !prod) {
      const errorMsg = this.translateService.instant(
        'VARIANT_SELECTOR.ERRORS.VARIANT_NOT_AVAILABLE'
      );
      this.errorMessage.set(errorMsg);
      return;
    }

    this.isAdding.set(true);
    this.errorMessage.set('');

    // Create product variant object for cart service
    const productVariant = {
      id: variant.id,
      productId: prod.productId,
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
      imageUrl: variant.imageUrl || prod.imageUrl,
      stockQuantity: variant.stockQuantity,
      priceAdjustment: variant.priceAdjustment,
      product: {
        id: prod.productId,
        name: prod.productName,
        price: prod.originalPrice || prod.price,
        salePrice: prod.salePrice,
        imageUrl: prod.imageUrl,
      },
    };

    this.cartService.addToCart(productVariant, this.quantity()).subscribe({
      next: (success) => {
        this.isAdding.set(false);

        if (success) {
          this.added.emit({
            success: true,
            message: `"${prod.productName}" added to cart!`,
          });
          this.closed.emit();
        } else {
          const errorMsg = this.translateService.instant(
            'VARIANT_SELECTOR.ERRORS.ADD_TO_CART_FAILED'
          );
          this.errorMessage.set(errorMsg);
        }
      },
      error: (error) => {
        this.isAdding.set(false);
        const errorMsg = this.translateService.instant(
          'VARIANT_SELECTOR.ERRORS.ADD_TO_CART_FAILED'
        );
        this.errorMessage.set(error.message || errorMsg);
      },
    });
  }

  formatPrice(price: number): string {
    return `EGP ${price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  resetSelection(): void {
    this.selectedSize.set('');
    this.selectedColor.set('');
    this.quantity.set(1);
    this.errorMessage.set('');
    this.isAdding.set(false);
  }

  get showOriginalPrice(): boolean {
    const p = this.product();
    return !!(
      p?.originalPrice &&
      p?.salePrice &&
      p.salePrice < p.originalPrice
    );
  }

  get originalPriceValue(): number {
    return this.product()?.originalPrice ?? 0;
  }
}
