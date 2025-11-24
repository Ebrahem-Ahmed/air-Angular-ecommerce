import { Component, ElementRef, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface IProductCard {
  id: string;
  name: string;
  imageUrl: {
    src: string;
    alt: string;
  };
  images: {
    src: string;
    alt: string;
  }[];
  price: number;
  salePrice: number;
  discount: string;
  colors: string[];
  sizes: string[];
  category: string;
}

@Component({
  selector: 'app-category-product-card',
  imports: [RouterLink],
  templateUrl: './category-product-card.html',
  styleUrl: './category-product-card.scss',
})
export class CategoryProductCard {
  product: IProductCard = {
    id: 'id goes here',
    name: 'name goes here',
    imageUrl: {
      src: 'assets/images/product/p.jpg',
      alt: 'Adidas Ultraboost 22 - Back View',
    },
    images: [
      {
        src: 'assets/images/product/p.jpg',
        alt: 'Adidas Ultraboost 22 - Back View',
      },
      {
        src: 'assets/images/product/p1.jpg',
        alt: 'Adidas Ultraboost 22 - Top View',
      },
    ],
    price: 100,
    salePrice: 80,
    discount: '20%',
    colors: ['red', 'blue'],
    sizes: ['s', 'm', 'l'],
    category: 'category goes here',
  };

  @ViewChild('colorOptions') colorOptions!: ElementRef<HTMLDivElement>;
  showColorOption() {
    this.colorOptions.nativeElement.classList.remove('d-none');
    this.colorOptions.nativeElement.classList.add('d-block');
  }

  hideColorOption() {
    this.colorOptions.nativeElement.classList.remove('d-block');
    this.colorOptions.nativeElement.classList.add('d-none');
  }

  setMainImage(img: { src: string; alt: string }) {
    this.product.imageUrl = img;
  }
  resetMainImage() {
    this.product.imageUrl = this.product.images[0];
  }
}
