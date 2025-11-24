import { TestBed } from '@angular/core/testing';

import { SubCategory } from './sub-category';

describe('SubCategory', () => {
  let service: SubCategory;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SubCategory);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
