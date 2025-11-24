import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SizeSelector } from './size-selector';

describe('SizeSelector', () => {
  let component: SizeSelector;
  let fixture: ComponentFixture<SizeSelector>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SizeSelector]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SizeSelector);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
