// google-callback.component.ts
import { Component, OnInit, inject, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service.ts.service';
import { GoogleLoginDto } from '../../shared/models/auth.models';

@Component({
  selector: 'app-google-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="callback-container">
      <div class="callback-content">
        <div class="spinner">
          <i class="fas fa-spinner fa-spin"></i>
        </div>
        <h3>Processing Google Authentication...</h3>
        <p>Please wait while we complete your authentication.</p>
        <div *ngIf="errorMessage" class="error-message">
          {{ errorMessage }}
          <button class="retry-btn" (click)="goToLogin()">Back to Login</button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .callback-container {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      }

      .callback-content {
        background: white;
        padding: 40px;
        border-radius: 12px;
        text-align: center;
        max-width: 400px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      }

      .spinner {
        font-size: 48px;
        color: #4285f4;
        margin-bottom: 20px;
      }

      h3 {
        margin: 0 0 10px 0;
        color: #1a1a1a;
        font-size: 24px;
      }

      p {
        color: #666;
        margin-bottom: 20px;
        font-size: 16px;
      }

      .error-message {
        background-color: #ffebee;
        color: #c62828;
        padding: 15px;
        border-radius: 8px;
        margin-top: 20px;
        border: 1px solid #ffcdd2;
        font-size: 14px;
      }

      .retry-btn {
        background: #1a1a1a;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        cursor: pointer;
        margin-top: 10px;
        transition: background 0.3s ease;
        font-size: 14px;
      }

      .retry-btn:hover {
        background: #333;
      }
    `,
  ],
})
export class GoogleCallbackComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  errorMessage = '';

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    console.log('Google Callback Component initialized');

    // Get the authorization code from URL parameters
    this.route.queryParams.subscribe((params) => {
      console.log('Received params:', params);

      const code = params['code'];
      const state = params['state'];
      const error = params['error'];

      // Check for errors
      if (error) {
        this.handleError(`Google OAuth error: ${error}`);
        return;
      }

      // Verify state parameter
      const storedState = sessionStorage.getItem('google_oauth_state');
      if (state !== storedState) {
        console.warn('State mismatch:', {
          received: state,
          stored: storedState,
        });
        this.handleError('Invalid state parameter. Please try again.');
        return;
      }

      // Clean up stored state
      sessionStorage.removeItem('google_oauth_state');

      if (code) {
        console.log('Processing authorization code:', code);
        this.exchangeCodeForToken(code);
      } else {
        this.handleError('No authorization code received from Google.');
      }
    });
  }

  private exchangeCodeForToken(code: string): void {
    // Send the authorization code to your backend
    const googleData: GoogleLoginDto = {
      authorizationCode: code,
      redirectUri: `${window.location.origin}/auth/google-callback`,
    };

    console.log('Sending Google data to backend:', googleData);

    this.authService.googleLogin(googleData).subscribe({
      next: (response) => {
        console.log('Google authentication successful:', response);
        this.router.navigate(['/']);
      },
      error: (error) => {
        console.error('Google authentication error:', error);
        this.handleError(
          error.message || 'Google authentication failed. Please try again.'
        );
      },
    });
  }

  private handleError(message: string): void {
    this.errorMessage = message;
    console.error('Google callback error:', message);

    // Optionally redirect to login after a delay
    setTimeout(() => {
      this.goToLogin();
    }, 5000);
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
