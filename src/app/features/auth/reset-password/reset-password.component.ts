import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service.ts.service';
import { ResetPasswordDto } from '../../../shared/models/auth.models';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="reset-password-container">
  
      <div class="reset-form-wrapper">
        <h1 class="title">CREATE YOUR NEW PASSWORD</h1>
        <p class="subtitle">
          SET A NEW PASSWORD FOR BOTH ADIDAS AND THE RUNTASTIC APPS. AFTER CREATING THE PASSWORD YOU'LL STAY LOGGED IN.
        </p>

        <form [formGroup]="resetForm" (ngSubmit)="onSubmit()" class="reset-form">
          <div class="form-group">
            <label for="password" class="form-label">
              Password <span class="required">*</span>
            </label>
            <div class="password-input-container">
              <input
                id="password"
                [type]="showPassword() ? 'text' : 'password'"
                class="form-input"
                [class.error]="isFieldInvalid('password')"
                formControlName="password"
                placeholder=""
              />
              <button
                type="button"
                class="show-password-btn"
                (click)="togglePasswordVisibility()"
                [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
              >
                <span class="show-text">{{ showPassword() ? 'HIDE' : 'SHOW' }}</span>
              </button>
            </div>
            
            <!-- Error Messages -->
            <div class="error-messages" *ngIf="isFieldInvalid('password')">
              <div class="error-text" *ngIf="resetForm.get('password')?.errors?.['required']">
                Please enter your password
              </div>
              <div class="error-text" *ngIf="resetForm.get('password')?.errors?.['passwordStrength']">
                {{ getPasswordStrengthError() }}
              </div>
            </div>
          </div>

          <!-- Password Requirements -->
          <div class="password-requirements">
            MAKE SURE YOU PICK A PASSWORD YOU'LL REMEMBER OF 8 CHARACTERS OR MORE, CONTAINING AT LEAST ONE UPPER- AND LOWERCASE LETTER, ONE NUMBER AND A SPECIAL CHARACTER.
          </div>

          <!-- Confirm Password Field -->
          <div class="form-group">
            <label for="confirmPassword" class="form-label">
              Confirm Password <span class="required">*</span>
            </label>
            <div class="password-input-container">
              <input
                id="confirmPassword"
                [type]="showConfirmPassword() ? 'text' : 'password'"
                class="form-input"
                [class.error]="isFieldInvalid('confirmPassword')"
                formControlName="confirmPassword"
                placeholder=""
              />
              <button
                type="button"
                class="show-password-btn"
                (click)="toggleConfirmPasswordVisibility()"
                [attr.aria-label]="showConfirmPassword() ? 'Hide password' : 'Show password'"
              >
                <span class="show-text">{{ showConfirmPassword() ? 'HIDE' : 'SHOW' }}</span>
              </button>
            </div>
            
            <!-- Confirm Password Error -->
            <div class="error-messages" *ngIf="isFieldInvalid('confirmPassword')">
              <div class="error-text" *ngIf="resetForm.get('confirmPassword')?.errors?.['required']">
                Please confirm your password
              </div>
              <div class="error-text" *ngIf="resetForm.get('confirmPassword')?.errors?.['passwordMismatch']">
                Passwords do not match
              </div>
            </div>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            class="submit-btn"
            [disabled]="resetForm.invalid || isLoading()"
          >
            <span *ngIf="!isLoading()">CONFIRM</span>
            <span *ngIf="isLoading()">RESETTING...</span>
            <svg class="arrow-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 5L17.5 10L12.5 15M17.5 10H2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>

          <!-- Error Message -->
          <div class="form-error" *ngIf="errorMessage()">
            {{ errorMessage() }}
          </div>

          <!-- Success Message -->
          <div class="form-success" *ngIf="successMessage()">
            {{ successMessage() }}
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .reset-password-container {
      min-height: 100vh;
      background: #f8f8f8;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 20px;
      font-family: 'Arial', sans-serif;
    }

    .logo {
      margin-bottom: 60px;
    }

    .reset-form-wrapper {
      background: white;
      padding: 60px 40px;
      border-radius: 0;
      box-shadow: none;
      max-width: 500px;
      width: 100%;
    }

    .title {
      font-size: 28px;
      font-weight: bold;
      color: #000;
      text-align: center;
      margin: 0 0 30px 0;
      letter-spacing: 0.5px;
      line-height: 1.2;
    }

    .subtitle {
      font-size: 12px;
      color: #666;
      text-align: center;
      margin-bottom: 40px;
      line-height: 1.4;
      letter-spacing: 0.3px;
    }

    .reset-form {
      display: flex;
      flex-direction: column;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-label {
      display: block;
      font-size: 14px;
      color: #000;
      margin-bottom: 8px;
      font-weight: normal;
    }

    .required {
      color: #e74c3c;
    }

    .password-input-container {
      position: relative;
      display: flex;
      align-items: center;
    }

    .form-input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #ddd;
      border-radius: 0;
      font-size: 16px;
      background: white;
      transition: border-color 0.3s ease;
      outline: none;
      box-sizing: border-box;
    }

    .form-input:focus {
      border-color: #000;
    }

    .form-input.error {
      border-color: #e74c3c;
    }

    .show-password-btn {
      position: absolute;
      right: 16px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      font-size: 12px;
      color: #000;
      font-weight: bold;
      letter-spacing: 0.5px;
    }

    .show-text {
      text-decoration: underline;
    }

    .password-requirements {
      font-size: 11px;
      color: #666;
      line-height: 1.4;
      margin-bottom: 30px;
      letter-spacing: 0.3px;
    }

    .submit-btn {
      background: #000;
      color: white;
      border: none;
      padding: 16px 24px;
      font-size: 14px;
      font-weight: bold;
      letter-spacing: 1px;
      cursor: pointer;
      transition: background-color 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-top: 20px;
      border-radius: 0;
    }

    .submit-btn:hover:not(:disabled) {
      background: #333;
    }

    .submit-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .arrow-icon {
      width: 20px;
      height: 20px;
    }

    .error-messages {
      margin-top: 8px;
    }

    .error-text {
      color: #e74c3c;
      font-size: 12px;
      margin-bottom: 4px;
    }

    .form-error {
      background: #ffe6e6;
      color: #e74c3c;
      padding: 12px;
      border-radius: 4px;
      font-size: 14px;
      margin-top: 16px;
      text-align: center;
    }

    .form-success {
      background: #e8f5e8;
      color: #2d7d2d;
      padding: 12px;
      border-radius: 4px;
      font-size: 14px;
      margin-top: 16px;
      text-align: center;
    }

    @media (max-width: 600px) {
      .reset-form-wrapper {
        padding: 40px 20px;
      }
      
      .title {
        font-size: 24px;
      }
    }
  `]
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  resetForm: FormGroup;
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  private email = signal<string>('');
  private resetToken = signal<string>('');

  constructor() {
    this.resetForm = this.fb.group({
      password: ['', [Validators.required, this.passwordStrengthValidator.bind(this)]],
      confirmPassword: ['', [Validators.required]]
    });

    // Add password match validator
    this.resetForm.addValidators(this.passwordMatchValidator);
  }

  ngOnInit() {
    // Get email and token from query parameters
    this.route.queryParams.subscribe(params => {
      const email = params['email'];
      const token = params['token'];

      if (!email || !token) {
        this.errorMessage.set('Invalid reset link. Please request a new password reset.');
        return;
      }

      this.email.set(email);
      this.resetToken.set(token);

      // Validate token format
      if (!this.authService.isResetTokenValid(token)) {
        this.errorMessage.set('Invalid or expired reset token. Please request a new password reset.');
      }
    });
  }

  togglePasswordVisibility() {
    this.showPassword.update(show => !show);
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword.update(show => !show);
  }

  onSubmit() {
    if (this.resetForm.valid && !this.isLoading()) {
      this.isLoading.set(true);
      this.errorMessage.set('');
      this.successMessage.set('');

      const resetData: ResetPasswordDto = {
        email: this.email(),
        token: this.resetToken(),
        newPassword: this.resetForm.value.password,
        confirmPassword: this.resetForm.value.confirmPassword
      };

      this.authService.resetPassword(resetData).subscribe({
        next: (response) => {
          this.isLoading.set(false);
          this.successMessage.set('Password reset successfully! Redirecting to login...');
          
          // Redirect to login after 2 seconds
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 2000);
        },
        error: (error) => {
          this.isLoading.set(false);
          this.errorMessage.set(error.message || 'Failed to reset password. Please try again.');
        }
      });
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.resetForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getPasswordStrengthError(): string {
    const password = this.resetForm.get('password')?.value || '';
    const validation = this.authService.validatePasswordStrength(password);
    return validation.errors[0] || '';
  }

  private passwordStrengthValidator(control: any) {
    if (!control.value) {
      return null;
    }

    const validation = this.authService.validatePasswordStrength(control.value);
    return validation.isValid ? null : { passwordStrength: true };
  }

  private passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const formGroup = control as FormGroup;
    const password = formGroup.get('password')?.value;
    const confirmPassword = formGroup.get('confirmPassword')?.value;

    if (password && confirmPassword && password !== confirmPassword) {
      const confirmPasswordControl = formGroup.get('confirmPassword');
      confirmPasswordControl?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    // Clear the error if passwords match
    if (password && confirmPassword && password === confirmPassword) {
      const confirmPasswordControl = formGroup.get('confirmPassword');
      if (confirmPasswordControl?.errors?.['passwordMismatch']) {
        const errors = { ...confirmPasswordControl.errors };
        delete errors['passwordMismatch'];
        confirmPasswordControl.setErrors(Object.keys(errors).length === 0 ? null : errors);
      }
    }

    return null;
  };
}