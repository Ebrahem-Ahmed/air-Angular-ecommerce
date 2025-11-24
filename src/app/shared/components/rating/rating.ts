import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-rating',
  imports: [CommonModule],
  templateUrl: './rating.html',
  styleUrl: './rating.scss',
})
export class Rating implements OnInit {
  @Input() maxStars: number = 5;
  @Input() rating: number = 4.7;
  @Input() count: number = 736;
  starsArray: number[] = [];
  ratingValue: number = this.rating;
  hoveredRating: number = -1;

  ngOnInit() {
    this.starsArray = Array(this.maxStars)
      .fill(0)
      .map((x, i) => i);
    this.ratingValue = Math.min(this.maxStars, Math.max(0, this.rating));
  }

  hoverRating(index: number) {
    this.hoveredRating = index;
  }

  resetRating() {
    this.hoveredRating = -1;
  }

  setRating(index: number) {
    this.ratingValue = index;
    this.hoveredRating = -1;
  }
}
