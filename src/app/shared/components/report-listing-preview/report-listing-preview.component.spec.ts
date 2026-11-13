import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ReportService } from '@services/report/report.service';
import { ReportListingPreviewComponent } from './report-listing-preview.component';

describe('Report listing preview', () => {
  const api = { listingDetail: vi.fn() };
  const listing = {
    id: 'listing-1',
    title: 'Nhà An',
    description: 'Nội dung tin đã ẩn',
    status: 'HIDDEN',
    fullAddress: '12 Đường A',
    propertyName: 'Cơ sở An',
    landlordId: 'owner',
    publishedAt: new Date('2026-11-01T10:00:00+07:00'),
    expiresAt: null,
    propertyId: 'property',
  };
  beforeEach(() => {
    vi.resetAllMocks();
    api.listingDetail.mockReturnValue(of(listing));
    TestBed.configureTestingModule({
      imports: [ReportListingPreviewComponent],
      providers: [provideRouter([]), { provide: ReportService, useValue: api }],
    });
  });
  function create(status = '') {
    const fixture = TestBed.createComponent(ReportListingPreviewComponent);
    fixture.componentRef.setInput('listingId', 'listing-1');
    fixture.componentRef.setInput('reportId', 'report-1');
    fixture.componentRef.setInput('title', 'Tiêu đề từ báo cáo');
    fixture.componentRef.setInput('status', status);
    fixture.detectChanges();
    return fixture;
  }
  it('keeps the known title and id when detail cannot be fetched and supports retry', () => {
    api.listingDetail.mockReturnValue(throwError(() => new Error('unavailable')));
    const fixture = create();
    expect(fixture.nativeElement.textContent).toContain('Tiêu đề từ báo cáo');
    expect(fixture.nativeElement.textContent).toContain('listing-1');
    expect(fixture.nativeElement.textContent).toContain('Chưa tải được chi tiết');
    expect(fixture.nativeElement.querySelector('a')).toBeNull();
    api.listingDetail.mockReturnValue(of(listing));
    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('12 Đường A');
  });
  it('reads hidden listings using the report-scoped endpoint', () => {
    const fixture = create('HIDDEN');
    expect(api.listingDetail).toHaveBeenCalledExactlyOnceWith('report-1', 'listing-1');
    expect(fixture.nativeElement.textContent).toContain('Đã ẩn');
    expect(fixture.nativeElement.textContent).toContain('Nội dung tin đã ẩn');
    expect(fixture.nativeElement.textContent).toContain('listing-1');
    expect(fixture.nativeElement.querySelector('a')).toBeNull();
  });
  it('renders embedded listing context for the reporter without requesting an admin API', () => {
    const fixture = TestBed.createComponent(ReportListingPreviewComponent);
    fixture.componentRef.setInput('listingId', 'listing-1');
    fixture.componentRef.setInput('context', listing);
    fixture.detectChanges();
    expect(api.listingDetail).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('12 Đường A');
    expect(fixture.nativeElement.textContent).toContain('Đã ẩn');
  });
  it('shows the report context without refetching even for admins', () => {
    const fixture = TestBed.createComponent(ReportListingPreviewComponent);
    fixture.componentRef.setInput('reportId', 'report-1');
    fixture.componentRef.setInput('listingId', 'listing-1');
    fixture.componentRef.setInput('context', { ...listing, status: 'EXPIRED' });
    fixture.detectChanges();
    expect(api.listingDetail).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Hết hạn');
  });
  it('cancels old data when the selected listing changes', () => {
    const pending = new Subject<any>();
    api.listingDetail.mockReturnValue(pending);
    const fixture = create();
    api.listingDetail.mockReturnValue(of({ ...listing, id: 'listing-2', title: 'Tin mới' }));
    fixture.componentRef.setInput('listingId', 'listing-2');
    fixture.detectChanges();
    pending.next({ ...listing, title: 'Tin cũ' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Tin mới');
    expect(fixture.nativeElement.textContent).not.toContain('Tin cũ');
  });
});
