// core/services/toast.service.ts
import { Injectable, inject } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

export interface ToastConfig {
  timeOut?: number;
  enableHtml?: boolean;
  closeButton?: boolean;
  progressBar?: boolean;
  tapToDismiss?: boolean;
  positionClass?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private toastr = inject(ToastrService);

  success(message: string, title?: string, config?: ToastConfig) {
    this.toastr.success(message, title, config);
  }

  error(message: string, title?: string, config?: ToastConfig) {
    this.toastr.error(message, title, config);
  }

  warning(message: string, title?: string, config?: ToastConfig) {
    this.toastr.warning(message, title, config);
  }

  info(message: string, title?: string, config?: ToastConfig) {
    this.toastr.info(message, title, config);
  }

  clear() {
    this.toastr.clear();
  }

  remove(toastId?: number) {
    if (toastId) {
      this.toastr.remove(toastId);
    }
  }

  // Utility method for debugging (keeping compatibility)
  getDebugInfo() {
    return {
      activeToasts: this.toastr.currentlyActive,
      previousToasts: this.toastr.previousToastMessage,
    };
  }
}
