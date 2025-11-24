// components/product-card/product-card.component.ts
import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  OnInit, 
  OnDestroy, 
  ChangeDetectionStrategy, 
  ViewEncapsulation,
  inject,
  signal,
  computed,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, state, style, transition, animate, keyframes, query, stagger } from '@angular/animations';
import { Product, ColorOption, SizeOption, ProductCardEvent, ProductCardConfig } from './product.interface';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './product-card.html',
  styleUrls: ['./product-card.scss'],
  animations: [
    trigger('cardEnterAnimation', [
      state('loaded', style({ opacity: 1, transform: 'translateY(0) scale(1)' })),
      state('loading', style({ opacity: 0, transform: 'translateY(20px) scale(0.95)' })),
      transition('loading => loaded', animate('400ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'))
    ]),
    trigger('imageAnimation', [
      state('loading', style({ opacity: 0, transform: 'scale(1.1)' })),
      state('loaded', style({ opacity: 1, transform: 'scale(1)' })),
      transition('loading => loaded', animate('600ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'))
    ]),
    trigger('fadeInOut', [
      state('hidden', style({ opacity: 0 })),
      state('visible', style({ opacity: 1 })),
      transition('hidden <=> visible', animate('400ms ease-in-out'))
    ]),
    trigger('slideUpFade', [
      state('hidden', style({ opacity: 0, transform: 'translateY(20px)' })),
      state('visible', style({ opacity: 1, transform: 'translateY(0)' })),
      transition('hidden <=> visible', animate('300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'))
    ]),
    trigger('heartBeat', [
      state('inactive', style({ transform: 'scale(1)' })),
      state('active', style({ transform: 'scale(1)' })),
      transition('inactive => active', [
        animate('600ms ease-out', keyframes([
          style({ transform: 'scale(1)', offset: 0 }),
          style({ transform: 'scale(1.2)', offset: 0.3 }),
          style({ transform: 'scale(1)', offset: 0.6 }),
          style({ transform: 'scale(1.1)', offset: 0.8 }),
          style({ transform: 'scale(1)', offset: 1.0 })
        ]))
      ])
    ])
  ]
})
export class ProductCardComponent implements OnInit, OnDestroy {
  // Inputs
  @Input() set productData(value: Product | null) {
    this.product.set(value);
    if (value) {
      this.currentImage.set(value.imageUrl);
      this.cardState.set('loaded');
    }
  }

  @Input() set loading(value: boolean) {
    this.isLoading.set(value);
    this.cardState.set(value ? 'loading' : 'loaded');
  }

  @Input() set wishlistStatus(value: boolean) {
    this.isWishlisted.set(value);
    this.wishlistState.set(value ? 'active' : 'inactive');
  }

  @Input() configuration: Partial<ProductCardConfig> = {};

  // Outputs
  @Output() productEvent = new EventEmitter<ProductCardEvent>();

  // Signals
  product = signal<Product | null>(null);
  isLoading = signal(false);
  isProcessing = signal(false);
  isHovered = signal(false);
  isWishlisted = signal(false);
  imageLoaded = signal(false);
  hoverImageLoaded = signal(false);
  currentImage = signal('');
  selectedColor = signal<string | null>(null);
  selectedSize = signal<string | null>(null);
  cardState = signal<'loading' | 'loaded'>('loading');
  wishlistState = signal<'inactive' | 'active'>('inactive');

  // Computed properties
  config = computed<ProductCardConfig>(() => ({
    layout: 'standard',
    showQuickActions: true,
    showColorOptions: true,
    showSizeOptions: true,
    showWishlistButton: true,
    showRating: true,
    showBadges: true,
    enableHoverEffects: true,
    lazyLoading: true,
    ...this.configuration
  }));

  cardClasses = computed(() => {
    const classes = [];
    const cfg = this.config();
    const prod = this.product();
    
    classes.push(`product-card--${cfg.layout}`);
    
    if (this.isHovered()) classes.push('product-card--hovered');
    if (this.isLoading()) classes.push('product-card--loading');
    if (prod?.stockStatus === 'out-of-stock') classes.push('product-card--out-of-stock');
    if (prod?.isNew) classes.push('product-card--new');
    if (prod?.onSale) classes.push('product-card--on-sale');
    
    return classes.join(' ');
  });

  // Private properties
  private hoverTimeout?: number;
  private destroy$ = new Subject<void>();

  ngOnInit() {
    // Initialize component
    effect(() => {
      const prod = this.product();
      if (prod) {
        this.currentImage.set(prod.imageUrl);
        this.selectedColor.set(prod.colorOptions?.[0]?.name || null);
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }
  }

  // Event handlers
  onHover(isHovered: boolean): void {
    if (!this.config().enableHoverEffects) return;
    
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }
    
    this.hoverTimeout = setTimeout(() => {
      this.isHovered.set(isHovered);
      
      const prod = this.product();
      if (isHovered && prod?.hoverImageUrl && this.hoverImageLoaded()) {
        this.currentImage.set(prod.hoverImageUrl);
      } else if (!isHovered && prod) {
        this.currentImage.set(prod.imageUrl);
      }
    }, isHovered ? 100 : 200) as any;
  }

  onImageLoad(): void {
    this.imageLoaded.set(true);
  }

  onHoverImageLoad(): void {
    this.hoverImageLoaded.set(true);
  }

  onImageError(): void {
    this.currentImage.set('/assets/images/product-placeholder.jpg');
  }

  onCardClick(): void {
    this.emitEvent('click');
  }

  toggleWishlist(event: Event): void {
    event.stopPropagation();
    const newStatus = !this.isWishlisted();
    this.isWishlisted.set(newStatus);
    this.wishlistState.set(newStatus ? 'active' : 'inactive');
    this.emitEvent('wishlist', { wishlisted: newStatus });
  }

  onQuickView(event: Event): void {
    event.stopPropagation();
    this.emitEvent('quick-view');
  }

  onQuickAdd(event: Event): void {
    event.stopPropagation();
    this.isProcessing.set(true);
    this.emitEvent('quick-add');
    
    // Simulate processing
    setTimeout(() => {
      this.isProcessing.set(false);
    }, 1500);
  }

  selectColor(event: Event, color: ColorOption): void {
    event.stopPropagation();
    this.selectedColor.set(color.name);
    this.currentImage.set(color.imageUrl);
    this.emitEvent('color-select', { color });
  }

  selectSize(event: Event, size: string): void {
    event.stopPropagation();
    this.selectedSize.set(size);
    this.emitEvent('size-select', { size });
  }

  onAnimationComplete(): void {
    // Animation completed callback
  }

  formatPrice(price: number): string {
    return price.toLocaleString('en-EG', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    });
  }

  private emitEvent(type: ProductCardEvent['type'], data?: any): void {
    const product = this.product();
    if (!product) return;

    this.productEvent.emit({
      type,
      product,
      data
    });
  }
}