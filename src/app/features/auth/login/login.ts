// login.component.ts
import {
  Component,
  OnInit,
  inject,
  PLATFORM_ID,
  Inject,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service.ts.service';
import {
  GoogleLoginDto,
  LoginDto,
  ForgotPasswordDto,
} from '../../../shared/models/auth.models';
import { environment } from '../../../../environments/environment';
import { TranslateModule } from '@ngx-translate/core';
import { ToastService } from '../../../core/services/toast.service';

// Google Identity Services types
declare global {
  interface Window {
    google?: any;
  }
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login implements OnInit, AfterViewInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  loginForm: FormGroup;
  forgotPasswordForm: FormGroup;
  showPassword = false;
  showForgotPassword = false;
  isLoading = false;
  isForgotPasswordLoading = false;
  errorMessage = '';
  forgotPasswordMessage = '';
  forgotPasswordSuccess = false;
  private googleInitialized = false;

  // Replace with your actual Google Client ID
  private readonly GOOGLE_CLIENT_ID = environment.googleClientId;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      keepLoggedIn: [false],
    });

    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  ngOnInit(): void {
    // Redirect if already logged in
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/']);
    }

    // Load Google Identity Services script
    if (isPlatformBrowser(this.platformId)) {
      this.loadGoogleScript();
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Initialize Google Sign-In after view is ready
      setTimeout(() => this.initializeGoogleSignIn(), 100);
    }
  }

  ngOnDestroy(): void {
    // Clean up Google Sign-In
    if (isPlatformBrowser(this.platformId) && window.google) {
      try {
        window.google.accounts.id.disableAutoSelect();
      } catch (error) {
        console.warn('Error disabling Google auto-select:', error);
      }
    }
  }

  private loadGoogleScript(): void {
    if (document.getElementById('google-gsi-script')) {
      this.initializeGoogleSignIn();
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.initializeGoogleSignIn();
    };
    script.onerror = (error) => {
      console.error('Failed to load Google Identity Services script:', error);
    };
    document.head.appendChild(script);
  }

  private initializeGoogleSignIn(): void {
    if (!window.google || this.googleInitialized) return;

    try {
      window.google.accounts.id.initialize({
        client_id: this.GOOGLE_CLIENT_ID,
        callback: this.handleGoogleResponse.bind(this),
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      this.googleInitialized = true;
    } catch (error) {
      console.error('Error initializing Google Sign-In:', error);
    }
  }

  private handleGoogleResponse(response: any): void {
    if (response.credential) {
      const googleData: GoogleLoginDto = {
        idToken: response.credential,
      };

      this.isLoading = true;
      this.errorMessage = '';

      this.authService.googleLogin(googleData).subscribe({
        next: (authResponse) => {
          console.log('Google login successful:', authResponse);
          this.router.navigate(['/']);
        },
        error: (error) => {
          console.error('Google login error:', error);
          this.errorMessage =
            error.message || 'Google login failed. Please try again.';
          this.isLoading = false;
        },
        complete: () => {
          this.isLoading = false;
        },
      });
    } else {
      console.error('No credential received from Google');
      this.errorMessage = 'Google authentication failed. Please try again.';
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const loginData: LoginDto = {
        email: this.loginForm.value.email,
        password: this.loginForm.value.password,
      };

      this.authService.login(loginData).subscribe({
        next: (response) => {
          console.log('Login successful:', response);
          this.router.navigate(['/']);
        },
        error: (error) => {
          console.error('Login error:', error);
          this.errorMessage =
            error.message || 'Login failed. Please try again.';
          this.isLoading = false;
        },
        complete: () => {
          this.isLoading = false;
        },
      });
    } else {
      this.markFormGroupTouched(this.loginForm);
    }
  }

  // Updated onForgotPassword method with API call
  onForgotPassword(): void {
    if (this.forgotPasswordForm.valid) {
      this.isForgotPasswordLoading = true;
      this.forgotPasswordMessage = '';
      this.forgotPasswordSuccess = false;

      const forgotPasswordData: ForgotPasswordDto = {
        email: this.forgotPasswordForm.value.email,
      };

      this.authService.forgotPassword(forgotPasswordData).subscribe({
        next: (response) => {
          console.log('Forgot password request successful:', response);
          this.forgotPasswordSuccess = true;
          this.forgotPasswordMessage =
            response.message ||
            'If an account with that email exists, a password reset link has been sent.';

          // Clear the form
          this.forgotPasswordForm.reset();

          // Auto close modal after 3 seconds
          setTimeout(() => {
            this.showForgotPassword = false;
            this.resetForgotPasswordState();
          }, 3000);
        },
        error: (error) => {
          console.error('Forgot password error:', error);
          this.forgotPasswordMessage =
            error.message || 'An error occurred. Please try again.';
          this.isForgotPasswordLoading = false;
        },
        complete: () => {
          this.isForgotPasswordLoading = false;
        },
      });
    } else {
      this.forgotPasswordForm.get('email')?.markAsTouched();
    }
  }

  closeForgotPassword(event: any): void {
    if (event.target.classList.contains('modal')) {
      this.showForgotPassword = false;
      this.resetForgotPasswordState();
    }
  }

  // Reset forgot password modal state
  private resetForgotPasswordState(): void {
    this.forgotPasswordMessage = '';
    this.forgotPasswordSuccess = false;
    this.isForgotPasswordLoading = false;
    this.forgotPasswordForm.reset();
  }

  // Open forgot password modal and reset state
  openForgotPasswordModal(): void {
    this.showForgotPassword = true;
    this.resetForgotPasswordState();
  }

  goToRegister(): void {
    this.router.navigate(['/auth/register']);
  }

  // Google Sign-In with redirect to Google OAuth window
  onGoogleSignIn(): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.error('Google Sign-In not available on server-side');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Use the authorization code flow - redirect to Google
    this.redirectToGoogleOAuth();
  }

  // Updated redirect method that will handle the callback properly
  private redirectToGoogleOAuth(): void {
    const redirectUri = encodeURIComponent(
      `${window.location.origin}/auth/google-callback`
    );
    const scope = encodeURIComponent('email profile openid');
    const responseType = 'code'; // This will give us authorization code
    const state = this.generateRandomState();

    // Store state for verification
    sessionStorage.setItem('google_oauth_state', state);

    const googleAuthUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${this.GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${redirectUri}&` +
      `scope=${scope}&` +
      `response_type=${responseType}&` +
      `state=${state}&` +
      `access_type=offline&` +
      `prompt=select_account`;

    // Redirect to Google OAuth
    window.location.href = googleAuthUrl;
  }

  // Get user information from Google using access token
  private getUserInfoFromGoogle(accessToken: string): void {
    fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then((response) => response.json())
      .then((userInfo) => {
        const googleData: GoogleLoginDto = {
          idToken: accessToken,
        };

        this.authService.googleLogin(googleData).subscribe({
          next: (authResponse) => {
            console.log('Google login successful:', authResponse);
            this.router.navigate(['/']);
          },
          error: (error) => {
            console.error('Google login error:', error);
            this.errorMessage =
              error.message || 'Google login failed. Please try again.';
            this.isLoading = false;
          },
          complete: () => {
            this.isLoading = false;
          },
        });
      })
      .catch((error) => {
        console.error('Error fetching user info from Google:', error);
        this.errorMessage = 'Failed to get user information from Google.';
        this.isLoading = false;
      });
  }

  // Generate random state for OAuth security
  private generateRandomState(): string {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0].toString(36);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      formGroup.get(key)?.markAsTouched();
    });
  }

  // Getter for form controls (for template use)
  get email() {
    return this.loginForm.get('email');
  }
  get password() {
    return this.loginForm.get('password');
  }
  get forgotEmail() {
    return this.forgotPasswordForm.get('email');
  }
}
