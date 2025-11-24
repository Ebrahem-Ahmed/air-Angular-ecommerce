import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AuthNavbarComponent } from '../../shared/components/auth-navbar/auth-navbar';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './auth.html',
  styleUrls: ['./auth.scss'],
})
export class Auth {
  public toastService = inject(ToastService);
}
