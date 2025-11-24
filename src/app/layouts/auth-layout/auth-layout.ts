import { Component } from '@angular/core';
import { AuthNavbarComponent } from '../../shared/components/auth-navbar/auth-navbar';
import { Auth } from "../../features/auth/auth";

@Component({
  selector: 'app-auth-layout',
  imports: [AuthNavbarComponent, Auth],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.scss',
})
export class AuthLayout {}
