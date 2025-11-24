// core/services/api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private readonly apiUrl =
    environment.apiUrl || 'http://api-adidas-clone.runasp.net/api';

  // private readonly apiUrl = 'http://api-adidas-clone.runasp.net/api';
  // private readonly apiUrl = 'http://localhost:5001/api';
  // Get auth token from localStorage
  private getAuthToken(): string | null {
    return (
      localStorage.getItem('jwt_token') ||
      localStorage.getItem('adidas_auth_token')
    );
  }

  // Create HTTP headers with authentication
  private createHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    const token = this.getAuthToken();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  // GET request
  get<T>(endpoint: string, params?: any): Observable<T> {
    let httpParams = new HttpParams();

    if (params) {
      Object.keys(params).forEach((key) => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }

    return this.http.get<T>(`${this.apiUrl}/${endpoint}`, {
      headers: this.createHeaders(),
      params: httpParams,
    });
  }

  // POST request
  post<T>(endpoint: string, data: any): Observable<T> {
    return this.http.post<T>(`${this.apiUrl}/${endpoint}`, data, {
      headers: this.createHeaders(),
    });
  }

  // PUT request
  put<T>(endpoint: string, data: any): Observable<T> {
    return this.http.put<T>(`${this.apiUrl}/${endpoint}`, data, {
      headers: this.createHeaders(),
    });
  }

  // DELETE request
  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.apiUrl}/${endpoint}`, {
      headers: this.createHeaders(),
    });
  }

  // PATCH request
  patch<T>(endpoint: string, data: any): Observable<T> {
    return this.http.patch<T>(`${this.apiUrl}/${endpoint}`, data, {
      headers: this.createHeaders(),
    });
  }

  // Upload file
  uploadFile<T>(
    endpoint: string,
    file: File,
    additionalData?: any
  ): Observable<T> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.keys(additionalData).forEach((key) => {
        formData.append(key, additionalData[key]);
      });
    }

    // Don't set Content-Type header for FormData, let browser set it with boundary
    const headers = new HttpHeaders();
    const token = this.getAuthToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.post<T>(`${this.apiUrl}/${endpoint}`, formData, {
      headers: headers,
    });
  }
}
