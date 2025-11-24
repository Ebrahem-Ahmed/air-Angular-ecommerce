// services/loading.service.ts (Optional utility service)
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private loadingCount = 0;
  isLoading = signal<boolean>(false);

  setLoading(loading: boolean): void {
    if (loading) {
      this.loadingCount++;
    } else {
      this.loadingCount = Math.max(0, this.loadingCount - 1);
    }

    this.isLoading.set(this.loadingCount > 0);
  }

  forceStop(): void {
    this.loadingCount = 0;
    this.isLoading.set(false);
  }
}
