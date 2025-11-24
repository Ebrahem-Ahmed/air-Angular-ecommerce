// services/auth.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import {
  LoginDto,
  RegisterDto,
  GoogleLoginDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  TestEmailDto,
  AuthResponseDto,
  UserInfoDto,
  ApiResponse,
  AuthState,
  UserRole,
} from '../../shared/models/auth.models';
import { ApiService } from './api.service.ts.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  private readonly TOKEN_KEY = 'jwt_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'user_info';

  // Reactive state management
  private currentUserSubject = new BehaviorSubject<UserInfoDto | null>(
    this.getUserFromStorage()
  );
  public currentUser$ = this.currentUserSubject.asObservable();

  // Signals for modern Angular approach
  isAuthenticated = signal<boolean>(!!this.getToken());
  currentUser = signal<UserInfoDto | null>(this.getUserFromStorage());
  authState = signal<AuthState>(this.getInitialAuthState());

  constructor() {
    this.initializeAuthState();
  }

  private getInitialAuthState(): AuthState {
    const token = this.getToken();
    const user = this.getUserFromStorage();
    return {
      isAuthenticated: !!token && !this.isTokenExpired(),
      user,
      token,
      refreshToken: this.getRefreshToken(),
    };
  }

  private initializeAuthState(): void {
    const token = this.getToken();
    const user = this.getUserFromStorage();

    if (token && user && !this.isTokenExpired()) {
      this.updateAuthState(true, user, token);
    } else {
      this.clearAuthState();
    }
  }

  // Authentication methods
  login(credentials: LoginDto): Observable<AuthResponseDto> {
    return this.api.post<AuthResponseDto>('auth/login', credentials).pipe(
      tap((response) => this.handleAuthSuccess(response)),
      catchError(this.handleAuthError)
    );
  }

  register(userData: RegisterDto): Observable<AuthResponseDto> {
    return this.api.post<AuthResponseDto>('auth/register', userData).pipe(
      tap((response) => this.handleAuthSuccess(response)),
      catchError(this.handleAuthError)
    );
  }

  googleLogin(googleData: GoogleLoginDto): Observable<AuthResponseDto> {
    return this.api.post<AuthResponseDto>('auth/google-login', googleData).pipe(
      tap((response) => this.handleAuthSuccess(response)),
      catchError(this.handleAuthError)
    );
  }

  changePassword(passwordData: ChangePasswordDto): Observable<ApiResponse> {
    return this.api
      .post<ApiResponse>('auth/change-password', passwordData)
      .pipe(catchError(this.handleAuthError));
  }

  // NEW: Password Reset Methods
  forgotPassword(
    forgotPasswordData: ForgotPasswordDto
  ): Observable<ApiResponse> {
    return this.api
      .post<ApiResponse>('auth/forgot-password', forgotPasswordData)
      .pipe(
        tap((response) => {
          // Log success for debugging (optional)
          console.log('Forgot password request sent successfully');
        }),
        catchError(this.handleAuthError)
      );
  }

  resetPassword(resetPasswordData: ResetPasswordDto): Observable<ApiResponse> {
    return this.api
      .post<ApiResponse>('auth/reset-password', resetPasswordData)
      .pipe(
        tap((response) => {
          // Log success for debugging (optional)
          console.log('Password reset successfully');
        }),
        catchError(this.handleAuthError)
      );
  }

  // NEW: Email Testing Methods (for development/testing)
  testEmail(testEmailData: TestEmailDto): Observable<ApiResponse> {
    return this.api.post<ApiResponse>('auth/test-email', testEmailData).pipe(
      tap((response) => {
        console.log('Test email sent successfully');
      }),
      catchError(this.handleAuthError)
    );
  }

  testEmailConfiguration(): Observable<any> {
    return this.api.get<any>('auth/email-config-test').pipe(
      tap((response) => {
        console.log('Email configuration test result:', response);
      }),
      catchError(this.handleAuthError)
    );
  }

  logout(): Observable<ApiResponse> {
    return this.api.post<ApiResponse>('auth/logout', {}).pipe(
      tap(() => this.handleLogout()),
      catchError((error) => {
        // Even if API call fails, clear local state
        this.handleLogout();
        return throwError(() => error);
      })
    );
  }

  // Quick logout without API call
  logoutLocal(): void {
    this.handleLogout();
  }

  // Token management
  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  setRefreshToken(refreshToken: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  // User management
  setUser(user: UserInfoDto): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
    this.currentUserSubject.next(user);
  }

  getUser(): UserInfoDto | null {
    return this.currentUser();
  }

  private getUserFromStorage(): UserInfoDto | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  // Utility methods
  isLoggedIn(): boolean {
    return this.isAuthenticated() && !this.isTokenExpired();
  }

  hasRole(role: string): boolean {
    const user = this.getUser();
    return user?.role === role;
  }

  isCustomer(): boolean {
    return this.hasRole(UserRole.Customer);
  }

  isAdmin(): boolean {
    return this.hasRole(UserRole.Admin);
  }

  // Get user display name
  getUserDisplayName(): string {
    const user = this.getUser();
    if (!user) return '';
    return `${user.firstName} ${user.lastName}`.trim() || user.email;
  }

  // Get user initials for avatar
  getUserInitials(): string {
    const user = this.getUser();
    if (!user) return '';
    const firstName = user.firstName?.charAt(0) || '';
    const lastName = user.lastName?.charAt(0) || '';
    return (
      `${firstName}${lastName}`.toUpperCase() ||
      user.email.charAt(0).toUpperCase()
    );
  }

  // NEW: Password Reset Utility Methods

  // Check if reset password token is valid (basic validation)
  isResetTokenValid(token: string): boolean {
    if (!token) return false;

    try {
      // Basic check for token format
      return token.length > 10; // Simple validation
    } catch {
      return false;
    }
  }

  // Extract email and token from reset URL
  parseResetUrl(url: string): { email?: string; token?: string } {
    try {
      const urlObj = new URL(url);
      const email = urlObj.searchParams.get('email');
      const token = urlObj.searchParams.get('token');

      return {
        email: email ? decodeURIComponent(email) : undefined,
        token: token ? decodeURIComponent(token) : undefined,
      };
    } catch {
      return {};
    }
  }

  // Validate password strength (you can customize these rules)
  validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Private helper methods
  private handleAuthSuccess(response: AuthResponseDto): void {
    this.setToken(response.token);
    this.setRefreshToken(response.refreshToken);
    this.setUser(response.user);
    this.updateAuthState(true, response.user, response.token);
  }

  private handleLogout(): void {
    this.clearAuthState();
    this.router.navigate(['/auth/login']);
  }

  private clearAuthState(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.updateAuthState(false, null, null);
  }

  private updateAuthState(
    isAuthenticated: boolean,
    user: UserInfoDto | null,
    token: string | null
  ): void {
    this.isAuthenticated.set(isAuthenticated);
    this.currentUser.set(user);
    this.currentUserSubject.next(user);
    this.authState.set({
      isAuthenticated,
      user,
      token,
      refreshToken: this.getRefreshToken(),
    });
  }

  private handleAuthError = (error: any): Observable<never> => {
    let errorMessage = 'An error occurred';

    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.error?.errors && Array.isArray(error.error.errors)) {
      // Handle validation errors array
      errorMessage = error.error.errors.join(', ');
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.status) {
      switch (error.status) {
        case 400:
          errorMessage = 'Invalid request data';
          break;
        case 401:
          errorMessage = 'Invalid credentials';
          break;
        case 403:
          errorMessage = 'Access denied';
          break;
        case 404:
          errorMessage = 'Resource not found';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later';
          break;
        default:
          errorMessage = `Error: ${error.status}`;
      }
    }

    return throwError(() => new Error(errorMessage));
  };

  // Check if token is expired
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch {
      return true;
    }
  }

  // Auto logout if token is expired
  checkTokenExpiration(): void {
    if (this.isLoggedIn() && this.isTokenExpired()) {
      this.handleLogout();
    }
  }

  // Get token expiration date
  getTokenExpirationDate(): Date | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return new Date(payload.exp * 1000);
    } catch {
      return null;
    }
  }

  // Check if token expires soon (within 5 minutes)
  isTokenExpiringSoon(): boolean {
    const expirationDate = this.getTokenExpirationDate();
    if (!expirationDate) return true;

    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return expirationDate <= fiveMinutesFromNow;
  }

  // Decode token to get user claims
  getTokenClaims(): any {
    const token = this.getToken();
    if (!token) return null;

    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }
}
