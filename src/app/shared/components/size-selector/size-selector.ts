// size-selector.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface SizeOption {
  value: string;
  label: string;
  available: boolean;
}

@Component({
  selector: 'app-size-selector',
  templateUrl: './size-selector.html',
  styleUrls: ['./size-selector.scss']
})
export class SizeSelector {
  @Input() sizes: SizeOption[] = [
    { value: 'xs', label: 'XS', available: false },
    { value: 's', label: 'S', available: true },
    { value: 'm', label: 'M', available: true },
    { value: 'l', label: 'L', available: true },
    { value: 'xl', label: 'XL', available: true },
    { value: '2xl', label: '2XL', available: false },
    { value: '3xl', label: '3XL', available: false },
    { value: '4xl', label: '4XL', available: false },
    { value: '5xl', label: '5 Tall', available: false },
    { value: 'xl-tall', label: 'XL Tall', available: false },
    { value: '2xl-tall', label: '2XL Tall', available: false },
    { value: '3xl-tall', label: '3XL Tall', available: false },
    { value: '4xl-tall', label: '4XL Tall', available: false },
    { value: 'm-tall', label: 'M Tall', available: false }
  ];

  @Input() selectedSize: string | null = 'm';
  @Input() showSizeChart: boolean = true;
  @Output() sizeSelected = new EventEmitter<string>();
  @Output() sizeChartClicked = new EventEmitter<void>();

  onSizeSelect(size: SizeOption): void {
    if (size.available) {
      this.selectedSize = size.value;
      this.sizeSelected.emit(size.value);
    }
  }

  onSizeChartClick(): void {
    this.sizeChartClicked.emit();
  }

  isSizeSelected(size: SizeOption): boolean {
    return this.selectedSize === size.value;
  }

  trackBySize(index: number, size: SizeOption): string {
    return size.value;
  }
}
