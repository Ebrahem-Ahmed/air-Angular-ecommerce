import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Men } from './men';

describe('Men', () => {
  let component: Men;
  let fixture: ComponentFixture<Men>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Men]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Men);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
