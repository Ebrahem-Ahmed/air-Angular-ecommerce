import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductImage } from '../product/product.service';
import { TranslateModule } from '@ngx-translate/core';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-product-image-gallery',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
<div class="gallery-wrapper" [class.dark]="isDarkMode()">
  <!-- Skeleton Loading -->
  @if (images.length === 0) {
    <div class="skeleton-container">
      <div class="skeleton-main"></div>
      <div class="skeleton-thumbs">
        @for (i of [0,1,2,3]; track i) {
          <div class="skeleton-thumb"></div>
        }
      </div>
    </div>
  }

  <!-- Main Gallery -->
  @else {
    <div class="gallery-main" [@fadeIn]>
      <!-- Hero Image -->
      <div class="hero-section">
        <div class="hero-image-container">
          <img
            [src]="currentImage().imageUrl"
            [alt]="currentImage().altText || productName"
            class="hero-image"
            [@zoomIn]
            onerror="this.src='https://via.placeholder.com/800x1000?text=No+Image'"
          />

          <!-- Image Badge -->
          <div class="image-badge" [@slideIn]>
            @if (isVariantImage(currentImage())) {
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              <span>صورة اللون</span>
            } @else {
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
              <span>صورة المنتج</span>
            }
          </div>

          <!-- Navigation Arrows -->
          @if (images.length > 1) {
            <button class="nav-arrow prev" (click)="previousImage()" [@fadeIn]>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <button class="nav-arrow next" (click)="nextImage()" [@fadeIn]>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          }

          <!-- Zoom Icon -->
          <button class="zoom-btn" (click)="onImageClick(activeIndex())" [@fadeIn]>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
            </svg>
          </button>

          <!-- Image Counter -->
          <div class="image-counter" [@slideIn]>
            {{ activeIndex() + 1 }} / {{ images.length }}
          </div>
        </div>
      </div>

      <!-- Thumbnails -->
      <div class="thumbnails-section">
        <div class="thumbnails-scroll" #thumbnailsContainer>
          @for (img of images; track img.id; let i = $index) {
            <div
              class="thumbnail"
              [class.active]="i === activeIndex()"
              (click)="selectImage(i)"
              [@scaleUp]="hoveredThumb() === i ? 'hovered' : 'idle'"
              (mouseenter)="hoveredThumb.set(i)"
              (mouseleave)="hoveredThumb.set(-1)"
            >
              <img
                [src]="img.imageUrl"
                [alt]="img.altText || productName"
                loading="lazy"
              />
              <div class="thumb-overlay"></div>
              @if (isVariantImage(img)) {
                <div class="thumb-indicator variant"></div>
              }
            </div>
          }
        </div>

        <!-- Scroll Indicators -->
        @if (images.length > 5) {
          <button class="scroll-btn left" (click)="scrollThumbnails('left')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <button class="scroll-btn right" (click)="scrollThumbnails('right')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        }
      </div>

      <!-- Info Panel -->
      @if (showImageInfo) {
        <div class="info-panel" [@slideUp]>
          <div class="info-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
            <span><strong>{{ images.length }}</strong> صورة متاحة</span>
          </div>
          @if (selectedColor) {
            <div class="info-item color">
              <div class="color-dot"></div>
              <span>اللون: <strong>{{ selectedColor }}</strong></span>
            </div>
          }
        </div>
      }
    </div>
  }
</div>
  `,
  styles: `
/* Modern Design Variables */
.gallery-wrapper {
  --primary: #2563eb;
  --primary-light: #3b82f6;
  --primary-dark: #1e40af;
  --secondary: #8b5cf6;
  --success: #10b981;
  --warning: #f59e0b;

  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;

  --border: #e2e8f0;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;

  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-fast: all 0.15s ease;

  width: 100%;
  max-width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Cairo', sans-serif;
  direction: rtl;

  &.dark {
    --bg-primary: #0f172a;
    --bg-secondary: #1e293b;
    --bg-tertiary: #334155;
    --text-primary: #f1f5f9;
    --text-secondary: #cbd5e1;
    --text-muted: #64748b;
    --border: #334155;
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
    --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
  }
}

/* Skeleton Loading */
.skeleton-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-main {
  width: 100%;
  aspect-ratio: 3/4;
  border-radius: var(--radius-lg);
  background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-tertiary) 50%, var(--bg-secondary) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-thumbs {
  display: flex;
  gap: 12px;
  overflow: hidden;
}

.skeleton-thumb {
  min-width: 80px;
  height: 80px;
  border-radius: var(--radius-md);
  background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-tertiary) 50%, var(--bg-secondary) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Main Gallery */
.gallery-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Hero Section */
.hero-section {
  position: relative;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}

.hero-image-container {
  position: relative;
  width: 100%;
  aspect-ratio: 3/4;
  max-height: 650px;
  background: var(--bg-secondary);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  transition: var(--transition);

  &:hover {
    box-shadow: var(--shadow-xl);
  }
}

.hero-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);

  .hero-image-container:hover & {
    transform: scale(1.05);
  }
}

/* Image Badge */
.image-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  box-shadow: var(--shadow-md);
  z-index: 2;

  .dark & {
    background: rgba(15, 23, 42, 0.9);
    color: var(--text-primary);
  }

  svg {
    color: var(--primary);
  }
}

/* Navigation Arrows */
.nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: var(--transition);
  box-shadow: var(--shadow-md);
  z-index: 3;

  .dark & {
    background: rgba(15, 23, 42, 0.9);
  }

  &.prev { left: 16px; }
  &.next { right: 16px; }

  svg {
    color: var(--text-primary);
    transition: var(--transition-fast);
  }

  &:hover {
    background: var(--primary);
    transform: translateY(-50%) scale(1.1);

    svg { color: white; }
  }

  &:active {
    transform: translateY(-50%) scale(0.95);
  }
}

/* Zoom Button */
.zoom-btn {
  position: absolute;
  bottom: 16px;
  left: 16px;
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: var(--transition);
  box-shadow: var(--shadow-md);
  z-index: 3;

  .dark & {
    background: rgba(15, 23, 42, 0.9);
  }

  svg {
    color: var(--text-primary);
    transition: var(--transition-fast);
  }

  &:hover {
    background: var(--primary);
    transform: scale(1.1) rotate(90deg);

    svg { color: white; }
  }
}

/* Image Counter */
.image-counter {
  position: absolute;
  bottom: 16px;
  right: 16px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(12px);
  border-radius: var(--radius-md);
  color: white;
  font-size: 14px;
  font-weight: 600;
  z-index: 2;
}

/* Thumbnails Section */
.thumbnails-section {
  position: relative;
  width: 100%;
}

.thumbnails-scroll {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  scroll-behavior: smooth;
  scrollbar-width: none;
  padding: 4px;

  &::-webkit-scrollbar {
    display: none;
  }
}

.thumbnail {
  position: relative;
  min-width: 80px;
  height: 80px;
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
  border: 3px solid transparent;
  transition: var(--transition);
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: var(--transition);
  }

  &.active {
    border-color: var(--primary);
    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);

    .thumb-overlay {
      opacity: 0;
    }
  }

  &:hover:not(.active) {
    transform: scale(1.05);
    border-color: var(--border);

    img {
      transform: scale(1.1);
    }

    .thumb-overlay {
      opacity: 0.3;
    }
  }
}

.thumb-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0.6;
  transition: var(--transition-fast);
}

.thumb-indicator {
  position: absolute;
  top: 6px;
  left: 6px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--warning);
  border: 2px solid white;
  box-shadow: var(--shadow-sm);
  z-index: 1;

  &.variant {
    background: var(--secondary);
  }
}

/* Scroll Buttons */
.scroll-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border: 1px solid var(--border);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: var(--transition);
  box-shadow: var(--shadow-md);
  z-index: 2;

  .dark & {
    background: rgba(15, 23, 42, 0.95);
  }

  &.left { left: -12px; }
  &.right { right: -12px; }

  svg {
    color: var(--text-primary);
  }

  &:hover {
    background: var(--primary);
    border-color: var(--primary);
    transform: translateY(-50%) scale(1.15);

    svg { color: white; }
  }
}

/* Info Panel */
.info-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.info-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--text-secondary);

  svg {
    color: var(--primary);
    flex-shrink: 0;
  }

  strong {
    color: var(--text-primary);
    font-weight: 700;
  }

  &.color {
    .color-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      border: 2px solid var(--bg-primary);
      box-shadow: var(--shadow-sm);
    }
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .hero-image-container {
    aspect-ratio: 4/5;
    border-radius: var(--radius-lg);
  }

  .nav-arrow {
    width: 40px;
    height: 40px;

    &.prev { left: 12px; }
    &.next { right: 12px; }
  }

  .thumbnail {
    min-width: 70px;
    height: 70px;
  }

  .info-panel {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .gallery-main {
    gap: 12px;
  }

  .hero-image-container {
    border-radius: var(--radius-md);
  }

  .image-badge {
    font-size: 11px;
    padding: 6px 10px;
    top: 12px;
    right: 12px;
  }

  .nav-arrow {
    width: 36px;
    height: 36px;

    svg {
      width: 20px;
      height: 20px;
    }
  }

  .zoom-btn {
    width: 38px;
    height: 38px;

    svg {
      width: 18px;
      height: 18px;
    }
  }

  .thumbnail {
    min-width: 60px;
    height: 60px;
  }

  .scroll-btn {
    width: 32px;
    height: 32px;
  }
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes zoomIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
  `,
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('400ms ease-out', style({ opacity: 1 })),
      ]),
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-20px)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'translateX(0)' })),
      ]),
    ]),
    trigger('slideUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
    trigger('zoomIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'scale(1)' })),
      ]),
    ]),
    trigger('scaleUp', [
      state('idle', style({ transform: 'scale(1)' })),
      state('hovered', style({ transform: 'scale(1.05)' })),
      transition('idle <=> hovered', animate('200ms ease-out')),
    ]),
  ],
})
export class ProductImageGalleryComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() images: ProductImage[] = [];
  @Input() productName: string = '';
  @Input() selectedColor: string | null = null;
  @Input() showImageInfo: boolean = true;
  @Input() enableDarkMode: boolean = true;

  @Output() imageClick = new EventEmitter<number>();

  @ViewChild('thumbnailsContainer') thumbnailsContainer!: ElementRef;

  activeIndex = signal(0);
  hoveredThumb = signal(-1);
  isDarkMode = signal(false);

  private previousColor: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedColor']) {
      const current = changes['selectedColor'].currentValue;
      if (current !== this.previousColor) {
        this.activeIndex.set(0);
        this.previousColor = current;
      }
    }
    if (changes['images']) {
      this.activeIndex.set(0);
    }
  }

  ngAfterViewInit(): void {
    this.setupDarkMode();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  currentImage = computed(() => this.images[this.activeIndex()] || this.images[0]);

  selectImage(index: number): void {
    this.activeIndex.set(index);
    this.scrollToThumbnail(index);
  }

  nextImage(): void {
    const next = (this.activeIndex() + 1) % this.images.length;
    this.selectImage(next);
  }

  previousImage(): void {
    const prev = (this.activeIndex() - 1 + this.images.length) % this.images.length;
    this.selectImage(prev);
  }

  onImageClick(index: number): void {
    this.imageClick.emit(index);
  }

  isVariantImage(img: ProductImage): boolean {
    return img.id?.toString().startsWith('variant-') ?? false;
  }

  scrollThumbnails(direction: 'left' | 'right'): void {
    const container = this.thumbnailsContainer?.nativeElement;
    if (!container) return;

    const scrollAmount = 200;
    container.scrollBy({
      left: direction === 'right' ? scrollAmount : -scrollAmount,
      behavior: 'smooth'
    });
  }

  private scrollToThumbnail(index: number): void {
    const container = this.thumbnailsContainer?.nativeElement;
    if (!container) return;

    const thumbnail = container.children[index] as HTMLElement;
    if (!thumbnail) return;

    const containerWidth = container.offsetWidth;
    const thumbnailLeft = thumbnail.offsetLeft;
    const thumbnailWidth = thumbnail.offsetWidth;

    container.scrollTo({
      left: thumbnailLeft - (containerWidth / 2) + (thumbnailWidth / 2),
      behavior: 'smooth'
    });
  }

  private setupDarkMode(): void {
    if (!this.enableDarkMode) return;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.isDarkMode.set(prefersDark);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      this.isDarkMode.set(e.matches);
    });
  }
}
