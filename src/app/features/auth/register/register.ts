// register.component.ts
import {
  Component,
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
  AbstractControl,
} from '@angular/forms';
import { Router } from '@angular/router';
import {
  RegisterDto,
  GoogleLoginDto,
} from '../../../shared/models/auth.models';
import { AuthService } from '../../../core/services/auth.service.ts.service';
import { environment } from '../../../../environments/environment';
import { TranslateModule } from '@ngx-translate/core';

// Google Identity Services types
declare global {
  interface Window {
    google?: any;
  }
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule,TranslateModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
})
export class Register implements AfterViewInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  registerForm: FormGroup;
  showPassword = false;
  isLoading = false;
  errorMessage = '';
  private googleInitialized = false;

  // Replace with your actual Google Client ID
  private readonly GOOGLE_CLIENT_ID = environment.googleClientId;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      password: [
        '',
        [Validators.required, Validators.minLength(8), this.passwordValidator],
      ],
      ageVerification: [false, [Validators.requiredTrue]],
      marketingConsent: [false],
    });

    // Load Google script
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

      // Use the same googleLogin method from AuthService
      // Your backend should handle both login and registration for Google users
      this.authService.googleLogin(googleData).subscribe({
        next: (authResponse) => {
          console.log('Google registration/login successful:', authResponse);
          this.router.navigate(['/']);
        },
        error: (error) => {
          console.error('Google registration error:', error);
          this.errorMessage =
            error.message || 'Google sign-up failed. Please try again.';
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

  // Google Sign-Up with redirect to Google OAuth window
  onGoogleSignUp(): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.error('Google Sign-Up not available on server-side');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Direct redirect to Google OAuth
    this.redirectToGoogleOAuth();
  }

  // Direct redirect to Google OAuth
  private redirectToGoogleOAuth(): void {
    const redirectUri = encodeURIComponent(
      `${window.location.origin}/auth/google-callback`
    );
    const scope = encodeURIComponent('email profile');
    const responseType = 'code';
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

    console.log('Redirecting to Google OAuth:', googleAuthUrl);

    // Redirect to Google OAuth
    window.location.href = googleAuthUrl;
  }

  // Generate random state for OAuth security
  private generateRandomState(): string {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0].toString(36);
  }

  passwordValidator(control: AbstractControl): { [key: string]: any } | null {
    const value = control.value;
    if (!value) return null;

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);

    const valid = hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
    return valid ? null : { passwordStrength: true };
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const registerData: RegisterDto = {
        firstName: this.registerForm.value.firstName,
        lastName: this.registerForm.value.lastName,
        email: this.registerForm.value.email,
        phone: this.registerForm.value.phone,
        password: this.registerForm.value.password,
      };

      this.authService.register(registerData).subscribe({
        next: (response) => {
          console.log('Registration successful:', response);
          this.router.navigate(['/']);
        },
        error: (error) => {
          console.error('Registration error:', error);
          this.errorMessage =
            error.message || 'Registration failed. Please try again.';
          this.isLoading = false;
        },
        complete: () => {
          this.isLoading = false;
        },
      });
    } else {
      this.markFormGroupTouched(this.registerForm);
    }
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      formGroup.get(key)?.markAsTouched();
    });
  }

  // Getters for form controls
  get firstName() {
    return this.registerForm.get('firstName');
  }
  get lastName() {
    return this.registerForm.get('lastName');
  }
  get email() {
    return this.registerForm.get('email');
  }
  get phone() {
    return this.registerForm.get('phone');
  }
  get password() {
    return this.registerForm.get('password');
  }
  get ageVerification() {
    return this.registerForm.get('ageVerification');
  }
  get marketingConsent() {
    return this.registerForm.get('marketingConsent');
  }

  // Password strength indicator
  getPasswordStrength(): string {
    const password = this.password?.value;
    if (!password) return '';

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(
      password
    );
    const isLongEnough = password.length >= 8;

    const strength = [
      hasUpperCase,
      hasLowerCase,
      hasNumber,
      hasSpecialChar,
      isLongEnough,
    ].filter(Boolean).length;

    if (strength < 3) return 'weak';
    if (strength < 5) return 'medium';
    return 'strong';
  }
}
