import { Injectable, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class GuestUserService {
  private readonly GUEST_USER_ID_KEY = 'guest_user_id';
  private readonly GUEST_CART_KEY = 'guest_cart';

  getOrCreateGuestUserId(): string {
    let guestId = localStorage.getItem(this.GUEST_USER_ID_KEY);
    if (!guestId) {
      guestId = `guest_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      localStorage.setItem(this.GUEST_USER_ID_KEY, guestId);
    }
    return guestId;
  }

  getGuestUserId(): string | null {
    return localStorage.getItem(this.GUEST_USER_ID_KEY);
  }

  clearGuestData(): void {
    localStorage.removeItem(this.GUEST_USER_ID_KEY);
    localStorage.removeItem(this.GUEST_CART_KEY);
  }

  isGuestUser(): boolean {
    return !!this.getGuestUserId();
  }
}
