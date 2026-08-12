import { TestBed } from '@angular/core/testing';
import { AjaxService } from './ajax-service.service';


describe('AjaxServiceService', () => {
  let service: AjaxService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AjaxService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
