// // toast.component.ts - Fixed version without auto-hide timer conflicts
// import {
//   Component,
//   Input,
//   Output,
//   EventEmitter,
//   computed,
//   OnDestroy,
// } from '@angular/core';
// import { CommonModule } from '@angular/common';

// @Component({
//   selector: 'app-toast',
//   standalone: true,
//   imports: [CommonModule],
//   templateUrl: './toast.html',
//   styleUrls: ['./toast.scss'],
// })
// export class ToastComponent implements OnDestroy {
//   @Input() toast: ToastMessage | null = null;
//   @Input() showToast: boolean = false;
//   @Input() position: string = 'top-center';
//   @Output() closed = new EventEmitter<void>();

//   // Computed property to determine if toast is visible
//   isVisible = computed(() => {
//     const visible = this.showToast && this.toast !== null;
//     console.log('Toast component: isVisible computed:', visible, {
//       showToast: this.showToast,
//       toast: this.toast,
//     });
//     return visible;
//   });

//   ngOnDestroy(): void {
//     // Clean up if needed
//   }



//   getPositionClass(): string {
//     return `toast-position-${this.position}`;
//   }

//   getToastTypeClass(): string {
//     if (!this.toast) return '';
//     return `custom-toast-${this.toast.type}`;
//   }

//   getToastIconClass(): string {
//     if (!this.toast) return 'fas fa-info-circle';

//     switch (this.toast.type) {
//       case 'success':
//         return 'fas fa-check-circle';
//       case 'error':
//         return 'fas fa-times-circle';
//       case 'warning':
//         return 'fas fa-exclamation-triangle';
//       case 'info':
//         return 'fas fa-info-circle';
//       default:
//         return 'fas fa-info-circle';
//     }
//   }

//   onToastClick(): void {
//     // Optional: close on click for non-persistent toasts
//     if (this.toast && !this.toast.persistent) {
//       console.log('Toast component: Closing toast on click');
//       this.closeToast();
//     }
//   }

//   closeToast(): void {
//     console.log('Toast component: Close toast called');
//     this.closed.emit();
//   }
// }
