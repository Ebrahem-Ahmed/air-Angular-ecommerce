import { Routes } from '@angular/router';
import { ProductComponent } from './features/product/product.component';
import { Orders } from './features/orders/orders';
import { Checkout } from './features/checkout/checkout';
import { Profile } from './features/profile/profile';
import { Address } from './features/address/address';
import { Payment } from './features/payment/payment';
import { Cart } from './features/cart/cart';
import { Wishlist } from './features/wishlist/wishlist';
import { Home } from './features/home/home';
import { NotFound } from './shared/components/not-found/not-found';
import { AuthLayout } from './layouts/auth-layout/auth-layout';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { MainLayout } from './layouts/main-layout/main-layout';
import { GoogleCallbackComponent } from './features/auth/google-callback.component';
import { Men } from './features/gender/men/men';
import { Women } from './features/gender/women/women';
import { Kids } from './features/gender/kids/kids';
import { CategoryComponent } from './features/category/category';
import { OrderDetailsComponent } from './features/orders/order-details/order-details';
import { authGuard } from './core/guards/auth.guard';
import { PaymentSuccessComponent } from './features/checkout/payment-success/payment-success';
import { PaymentFailedComponent } from './features/checkout/payment-failed/payment-failed';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayout,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        component: Home,
        title: 'Air Conditioner Website ',
      },
      { path: 'men', component: Men, title: 'Men Adidas' },
      { path: 'women', component: Women, title: 'Women Adidas' },
      { path: 'kids', component: Kids, title: 'Kids Adidas' },
      {
        path: 'product/:id',
        component: ProductComponent,
        title: 'Product - Product Details ',
      },
      {
        path: 'products/:id',
        component: ProductComponent,
        title: 'Product - Product Details ',
      },

      // Category routes - use a single parameter name and detect type in component
      {
        path: 'category/:identifier', // Changed to single parameter
        component: CategoryComponent,

        data: { title: 'Category' },
        title: 'Category - Category Details ',
      },
      {
        path: 'categories/:identifier', // Use same parameter name
        component: CategoryComponent,
        data: { title: 'Category' },
        title: 'Category - Category Details ',
      },

      // Gender-specific category routes
      {
        path: 'men/:categorySlug',
        component: CategoryComponent,
        data: { categoryType: 'Men', title: "Men's Products" },
        title: 'Category - Category Details ',
      },
      {
        path: 'women/:categorySlug',
        component: CategoryComponent,
        data: { categoryType: 'Women', title: "Women's Products" },
        title: 'Category - Category Details ',
      },
      {
        path: 'kids/:categorySlug',
        component: CategoryComponent,
        data: { categoryType: 'Kids', title: "Kids' Products" },
        title: 'Category - Category Details ',
      },
      {
        path: 'sports/:categorySlug',
        component: CategoryComponent,
        data: { categoryType: 'Sports', title: 'Sports Products' },
        title: 'Category - Category Details ',
      },

      { path: 'cart', component: Cart, title: 'Cart - Your Cart Items ' },
      {
        path: 'wishlist',
        component: Wishlist,
        title: 'Wishlist - Your Wishlist Items ',
      },
      {
        path: 'orders',
        children: [
          {
            path: '',
            component: Orders,
            title: 'Order History',
            canActivate: [authGuard],
          },
          {
            path: ':id',
            component: OrderDetailsComponent,
            title: 'Order Details',
            canActivate: [authGuard],
          },
        ],
        canActivate: [authGuard],
      },
      {
        path: 'checkout',
        component: Checkout,
        title: 'Checkout - Finalize Your Order',
      },
      {
        path: 'profile',
        component: Profile,
        canActivate: [authGuard],
        title: 'Profile - Your Account Information',
      },
      { path: 'address', component: Address },
      { path: 'payment', component: Payment },
      {
        path: 'payment/success',
        component: PaymentSuccessComponent,
        title: 'Payment Success',
      },
      {
        path: 'payment/fail',
        component: PaymentFailedComponent,
        title: 'Payment Failed',
      },
      {
        path: 'checkout/paypal/success',
        component: PaymentSuccessComponent,
        title: 'Payment Success',
      },
      {
        path: 'checkout/paypal/cancel',
        component: PaymentFailedComponent,
        title: 'Payment Failed',
      },
    ],
  },
  // Auth layout wrapper
  {
    path: 'auth',
    component: AuthLayout,
    children: [
      { path: 'login', component: Login, title: 'Login - Access Your Account' },
      {
        path: 'register',
        component: Register,
        title: 'Register - Create a New Account',
      },
      {
        path: 'google-callback',
        component: GoogleCallbackComponent,
      },
      { path: 'reset-password', component: ResetPasswordComponent },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },

  { path: '**', component: NotFound },
];
