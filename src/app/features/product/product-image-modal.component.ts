import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductImage } from '../product/product.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-product-image-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div
      class="modal fade"
      id="imageModal"
      tabindex="-1"
      aria-labelledby="imageModalLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-fullscreen">
        <div class="modal-content bg-opacity-10">
          <!-- Modal Header with Close Button -->
          <div
            class="modal-header border-0 position-absolute top-0 end-0 p-4"
            style="z-index: 1050"
          >
            <button
              type="button"
              class="btn-close btn-close-dark bg-white border border-black rounded-0 border-1"
              data-bs-dismiss="modal"
              [attr.aria-label]="'COMMON.CLOSE' | translate"
              style="width: 48px; height: 48px"
            ></button>
          </div>

          <div class="modal-body p-0 d-flex flex-column h-100">
            <!-- Navigation Arrows -->
            <button
              type="button"
              class="btn btn-light bg-white position-absolute start-0 top-50 translate-middle-y ms-3 border border-black rounded-0 border-1"
              (click)="onPrevious()"
              [disabled]="currentIndex === 0"
              style="width: 48px; height: 48px; z-index: 1040"
            >
              <i class="fas fa-chevron-left"></i>
            </button>

            <button
              type="button"
              class="btn btn-light bg-white position-absolute end-0 top-50 translate-middle-y me-3 border border-black rounded-0 border-1"
              (click)="onNext()"
              [disabled]="currentIndex >= totalImages - 1"
              style="width: 48px; height: 48px; z-index: 1040"
            >
              <i class="fas fa-chevron-right"></i>
            </button>

            <!-- Main Image Container -->
            <div
              class="flex-grow-1 d-flex align-items-center justify-content-center p-4"
              style="background-color: #f8f9fa00"
            >
              @if (selectedImage) {
              <div class="position-relative">
                <img
                  [src]="selectedImage.imageUrl"
                  [alt]="selectedImage.altText || productName"
                  class="img-fluid main-modal-image"
                  style="
                max-height: calc(100vh - 200px);
                max-width: 100%;
                object-fit: contain;
              "
                />

                <!-- Image source badge -->
                @if (isVariantImage(selectedImage)) {
                <div class="position-absolute top-0 start-0 m-3">
                  <span class="badge bg-secondary">{{
                    'PRODUCT_IMAGE_MODAL.VARIANT_IMAGE' | translate
                  }}</span>
                </div>
                } @else {
                <div class="position-absolute top-0 start-0 m-3">
                  <span class="badge bg-secondary">{{
                    'PRODUCT_IMAGE_MODAL.PRODUCT_IMAGE' | translate
                  }}</span>
                </div>
                }
              </div>
              } @else {
              <div class="text-center text-white">
                <i class="fas fa-image fa-3x mb-3"></i>
                <p>{{ 'PRODUCT_IMAGE_MODAL.NO_IMAGE_SELECTED' | translate }}</p>
              </div>
              }
            </div>

            <!-- Thumbnail Navigation -->
            <div class="modal-thumbnails bg-white border-top p-4">
              @if (images && images.length > 0) {
              <div class="d-flex justify-content-center gap-2 flex-wrap">
                @for (image of images; track image.id; let i = $index) {
                <button
                  type="button"
                  class="thumbnail-btn border-0 p-0 rounded overflow-hidden position-relative"
                  [class.active]="i === currentIndex"
                  (click)="onThumbnailClick(i)"
                  style="width: 80px; height: 80px"
                >
                  <img
                    [src]="image.imageUrl"
                    [alt]="image.altText || productName"
                    class="w-100 h-100 object-fit-cover"
                  />
                  <div
                    class="position-absolute inset-0 border border-2"
                    [class.border-dark]="i === currentIndex"
                    [class.border-transparent]="i !== currentIndex"
                    style="top: 0; left: 0; right: 0; bottom: 0"
                  ></div>

                  <!-- Small indicator for variant images -->
                  @if (isVariantImage(image)) {
                  <div class="position-absolute bottom-0 end-0 p-1">
                    <div
                      class="bg-primary rounded-circle"
                      style="width: 8px; height: 8px;"
                    ></div>
                  </div>
                  }
                </button>
                }
              </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    // Product Image Modal Component SCSS
    // Handles the fullscreen modal for image viewing with variant image support

    .modal {
      &.fade .modal-dialog {
        transition: transform 0.3s ease-out;
      }

      .modal-content {
        border: none;
        border-radius: 0;
        background: rgba(0, 0, 0, 0.9);

        .modal-header {
          border: none;
          padding: 1rem;

          .badge {
            font-size: 0.75rem;
            padding: 0.375rem 0.75rem;
            border-radius: 0.375rem;
          }

          .btn-close {
            background: white;
            border: 2px solid #000;
            border-radius: 0;
            opacity: 1;
            width: 48px;
            height: 48px;
            background-image: none;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;

            &:hover {
              background: #000;
              color: white;
              transform: scale(1.05);
            }

            &::after {
              content: "×";
              font-size: 24px;
              font-weight: bold;
              color: #000;
            }

            &:hover::after {
              color: white;
            }
          }
        }

        .modal-body {
          padding: 0;
          position: relative;
          height: 100vh;

          // Navigation arrows
          .btn {
            &.position-absolute {
              background: white !important;
              border: 2px solid #000 !important;
              border-radius: 0;
              width: 48px;
              height: 48px;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.3s ease;
              z-index: 1040;

              &:hover:not(:disabled) {
                background: #000 !important;
                color: white;
                transform: scale(1.05);
              }

              &:disabled {
                opacity: 0.3;
                cursor: not-allowed;
              }

              i {
                font-size: 16px;
              }
            }
          }

          // Main image container
          .flex-grow-1 {
            .main-modal-image {
              transition: opacity 0.3s ease;
              border-radius: 4px;
              box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
            }

            // Image source badges
            .position-absolute {
              .badge {
                &.bg-success {
                  background-color: #198754 !important;
                }
                &.bg-secondary {
                  background-color: #6c757d !important;
                }
              }
            }
          }
        }
      }

      // Thumbnail navigation
      .modal-thumbnails {
        background: white;
        border-top: 1px solid #dee2e6;
        padding: 1.5rem;

        .thumbnail-btn {
          position: relative;
          border: 2px solid transparent;
          border-radius: 4px;
          overflow: hidden;
          transition: all 0.3s ease;
          cursor: pointer;

          &:hover {
            transform: scale(1.05);
            border-color: #666;
          }

          &.active {
            border-color: #000;
            transform: scale(1.1);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          }

          img {
            transition: opacity 0.3s ease;
          }

          // Variant indicator dot
          .bg-primary.rounded-circle {
            background-color: #007bff !important;
          }

          // Border overlay for active state
          .position-absolute.inset-0 {
            pointer-events: none;
            transition: border-color 0.3s ease;

            &.border-dark {
              border-color: #000 !important;
            }

            &.border-transparent {
              border-color: transparent !important;
            }
          }
        }

        // Image counter and info
        .text-center {
          .text-muted {
            font-weight: 500;
            letter-spacing: 0.5px;
          }

          small {
            strong {
              color: #000;
            }
          }
        }
      }
    }

    // Animation for modal transitions
    .modal.show .modal-dialog {
      transform: none;
    }

    // Responsive design
    @media (max-width: 768px) {
      .modal {
        .modal-content {
          .modal-header {
            flex-direction: column;
            align-items: flex-end;
            gap: 0.5rem;

            .d-flex {
              order: 1;
            }

            .btn-close {
              order: 2;
            }
          }

          .modal-body {
            .btn.position-absolute {
              width: 40px;
              height: 40px;

              i {
                font-size: 14px;
              }
            }
          }
        }

        .modal-thumbnails {
          padding: 1rem;

          .thumbnail-btn {
            width: 60px !important;
            height: 60px !important;
          }

          .d-flex {
            gap: 0.5rem !important;
          }

          .text-center {
            .d-flex {
              flex-direction: column;
              gap: 0.25rem !important;
            }
          }
        }
      }
    }

    @media (max-width: 576px) {
      .modal {
        .modal-content {
          .modal-header {
            padding: 0.5rem;

            .btn-close {
              width: 40px;
              height: 40px;

              &::after {
                font-size: 20px;
              }
            }

            .badge {
              font-size: 0.7rem;
              padding: 0.25rem 0.5rem;
            }
          }

          .modal-body {
            .btn.position-absolute {
              width: 36px;
              height: 36px;
              margin: 0.5rem;

              i {
                font-size: 12px;
              }
            }

            .flex-grow-1 {
              .position-absolute {
                .badge {
                  font-size: 0.6rem;
                  padding: 0.2rem 0.4rem;
                }
              }
            }
          }
        }

        .modal-thumbnails {
          padding: 0.75rem;

          .thumbnail-btn {
            width: 50px !important;
            height: 50px !important;
          }
        }
      }
    }

    // Keyboard navigation indicators
    .modal.show {
      .modal-body {
        &::before {
          content: "Use ← → keys or swipe to navigate";
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
          z-index: 1000;
          padding: 8px 16px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 4px;
          opacity: 0;
          animation: fadeInOut 3s ease-in-out;
        }
      }
    }

    @keyframes fadeInOut {
      0% { opacity: 0; }
      20% { opacity: 1; }
      80% { opacity: 1; }
      100% { opacity: 0; }
    }

    // Touch/swipe indicators for mobile
    @media (max-width: 768px) {
      .modal.show {
        .modal-body {
          &::before {
            content: "Swipe left/right to navigate";
            font-size: 12px;
            padding: 6px 12px;
          }
        }
      }
    }

    // Enhanced focus states for accessibility
    .thumbnail-btn:focus,
    .btn:focus {
      outline: 2px solid #007bff;
      outline-offset: 2px;
    }

    // Print styles
    @media print {
      .modal {
        .modal-header,
        .modal-thumbnails,
        .btn.position-absolute {
          display: none !important;
        }

        .modal-body {
          .flex-grow-1 {
            .main-modal-image {
              box-shadow: none;
              max-height: none;
              width: 100%;
            }
          }
        }
      }
    }
  `,
})
export class ProductImageModalComponent
  implements OnInit, OnDestroy, OnChanges
{
  @Input() images: ProductImage[] = [];
  @Input() productName: string = '';
  @Input() currentIndex: number = 0;
  @Input() selectedImage: ProductImage | null = null;
  @Input() totalImages: number = 0; // NEW: Added missing input
  @Input() selectedColor: string | null = null; // NEW: Added missing input
  @Output() previousImage = new EventEmitter<void>();
  @Output() nextImage = new EventEmitter<void>();
  @Output() thumbnailClick = new EventEmitter<number>();

  ngOnInit() {
    this.handleModalEvents();
  }

  ngOnDestroy() {
    // Clean up event listeners if needed
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Update totalImages if not provided but images array is available
    if (changes['images'] && !this.totalImages) {
      this.totalImages = this.images?.length || 0;
    }
  }

  onPrevious() {
    if (this.currentIndex > 0) {
      this.previousImage.emit();
    }
  }

  onNext() {
    if (this.currentIndex < this.totalImages - 1) {
      this.nextImage.emit();
    }
  }

  onThumbnailClick(index: number) {
    this.thumbnailClick.emit(index);
  }

  /**
   * Check if an image is from a variant (has variant- prefix in ID)
   */
  isVariantImage(image: ProductImage): boolean {
    return image?.id?.toString().startsWith('variant-') ?? false;
  }

  /**
   * Get image information for display
   */
  getImageInfo(image: ProductImage): { isVariant: boolean; source: string } {
    const isVariant = this.isVariantImage(image);
    return {
      isVariant,
      source: isVariant ? 'variant' : 'product',
    };
  }

  handleModalEvents(): void {
    if (typeof document !== 'undefined') {
      const modalElement = document.getElementById('imageModal');
      if (modalElement) {
        // Handle swipe gestures for mobile
        let touchStartX = 0;
        let touchEndX = 0;

        const handleTouchStart = (e: TouchEvent) => {
          touchStartX = e.changedTouches[0].screenX;
        };

        const handleTouchEnd = (e: TouchEvent) => {
          touchEndX = e.changedTouches[0].screenX;
          this.handleSwipe(touchStartX, touchEndX);
        };

        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.onPrevious();
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            this.onNext();
          } else if (e.key === 'Escape') {
            // Close modal on escape - let Bootstrap handle this
          }
        };

        modalElement.addEventListener('touchstart', handleTouchStart, {
          passive: true,
        });
        modalElement.addEventListener('touchend', handleTouchEnd, {
          passive: true,
        });
        modalElement.addEventListener('keydown', handleKeyDown);

        // Store event listeners for cleanup
        (modalElement as any)._eventListeners = {
          touchstart: handleTouchStart,
          touchend: handleTouchEnd,
          keydown: handleKeyDown,
        };
      }
    }
  }

  private handleSwipe(startX: number, endX: number): void {
    const swipeThreshold = 50; // minimum distance for swipe
    const difference = startX - endX;

    if (Math.abs(difference) > swipeThreshold) {
      if (difference > 0) {
        // Swipe left - next image
        this.onNext();
      } else {
        // Swipe right - previous image
        this.onPrevious();
      }
    }
  }
}
