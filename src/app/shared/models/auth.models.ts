// shared/models/auth.models.ts
export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  email: string;
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface TestEmailDto {
  email: string;
}
// Request DTOs (Data Transfer Objects)
export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
}

// In your auth.models.ts
export interface GoogleLoginDto {
  idToken?: string;
  authorizationCode?: string;
  redirectUri?: string;
  email?: string;
  name?: string;
  picture?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

// Response DTOs
export interface UserInfoDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
}

export interface AuthResponseDto {
  token: string;
  refreshToken: string;
  user: UserInfoDto;
}

export interface ApiResponse {
  message: string;
  errors?: any;
}

// Enums
export enum UserRole {
  Customer = 'Customer',
  Admin = 'Admin',
}

// Auth State Interface
export interface AuthState {
  isAuthenticated: boolean;
  user: UserInfoDto | null;
  token: string | null;
  refreshToken: string | null;
}
