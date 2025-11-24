import { Component } from '@angular/core';
import { AuthNavbarComponent } from '../auth-navbar/auth-navbar';
import { Footer } from '../footer/footer';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [AuthNavbarComponent, Footer, RouterLink],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
})
export class NotFound {}
