import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '@services/auth/auth.service';
import { ReportService } from '@services/report/report.service';
import { ReportDetailPageComponent } from './report-detail-page.component';
describe('Report resolution permissions and conflicts', () => {
  const api = {
    detail: vi.fn(),
    action: vi.fn(),
    sanctionOptions: vi.fn(),
    listingDetail: vi.fn(),
  };
  const listing = {
    id: 'listing-id',
    title: 'Phòng trọ',
    propertyName: 'Nhà An',
    fullAddress: '12 Đường A',
    status: 'PUBLISHED',
    landlordId: 'owner',
    description: 'Nội dung tin gốc',
    publishedAt: null,
    expiresAt: null,
    propertyId: 'property',
  };
  beforeEach(() => {
    vi.resetAllMocks();
    api.listingDetail.mockReturnValue(of(listing));
    api.sanctionOptions.mockReturnValue(of({ nextWarningLevel: 1, listings: [] }));
    api.detail.mockReturnValue(
      of({ report: { id: 'r', status: 'PROCESSING', handledBy: 'other-admin' }, evidences: [] }),
    );
    TestBed.configureTestingModule({
      imports: [ReportDetailPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: 'r' })), snapshot: { queryParams: {} } },
        },
        {
          provide: AuthService,
          useValue: { hasAnyRole: () => true, session: () => ({ id: 'admin' }) },
        },
        { provide: ReportService, useValue: api },
      ],
    });
  });
  it('does not allow a different admin to resolve the report', () => {
    const c = TestBed.createComponent(ReportDetailPageComponent).componentInstance;
    c.note = 'Kết quả';
    c.action('resolve');
    expect(c.canClose).toBe(false);
    expect(api.action).not.toHaveBeenCalled();
  });
  it('requires a trimmed resolution note and refreshes after concurrent assignment failure', () => {
    api.detail.mockReturnValue(
      of({ report: { id: 'r', status: 'PROCESSING', handledBy: 'admin' }, evidences: [] }),
    );
    const c = TestBed.createComponent(ReportDetailPageComponent).componentInstance;
    c.note = '   ';
    c.action('resolve');
    expect(api.action).not.toHaveBeenCalled();
    c.detail.set({
      report: { id: 'r', status: 'PENDING' } as any,
      evidences: [],
      originListing: null,
      sanctionedListing: null,
    });
    api.action.mockReturnValue(
      throwError(() => ({ error: { message: 'Báo cáo đã có người tiếp nhận' } })),
    );
    c.action('assign');
    expect(c.actionError()).toContain('đã có người tiếp nhận');
    expect(api.detail).toHaveBeenCalledTimes(2);
  });
  it('requires an owned listing at level two for a landlord report and submits its id', () => {
    api.detail.mockReturnValue(
      of({
        report: {
          id: 'r',
          status: 'PROCESSING',
          handledBy: 'admin',
          targetType: 'LANDLORD',
        },
        evidences: [],
      }),
    );
    api.sanctionOptions.mockReturnValue(
      of({
        nextWarningLevel: 2,
        listings: [{ id: 'owned', title: 'Phòng trọ', status: 'PUBLISHED' }],
      }),
    );
    const fixture = TestBed.createComponent(ReportDetailPageComponent);
    const c = fixture.componentInstance;
    c.note = 'Approved';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('select[name="relatedListingId"]')).toBeTruthy();
    c.action('resolve');
    c.relatedListingId = 'another-landlord';
    c.action('resolve');
    expect(api.action).not.toHaveBeenCalled();
    c.relatedListingId = 'owned';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.selected-listing').textContent).toContain(
      'Tin đăng được chọn để ẩn',
    );
    expect(fixture.nativeElement.querySelector('.selected-listing').textContent).toContain(
      '12 Đường A',
    );
    expect(fixture.nativeElement.querySelector('.selected-listing').textContent).toContain(
      'Đang hiển thị',
    );
    api.action.mockReturnValue(of({}));
    c.action('resolve');
    expect(api.action).toHaveBeenCalledWith('r', 'resolve', 'Approved', 'owned');
  });
  it('shows the reported listing independently of the landlord and sanction selector', () => {
    api.detail.mockReturnValue(
      of({
        report: {
          id: 'r',
          status: 'PROCESSING',
          handledBy: 'other-admin',
          targetType: 'LISTING',
          targetId: 'listing-id',
        },
        evidences: [],
      }),
    );
    const fixture = TestBed.createComponent(ReportDetailPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Tin đăng bị báo cáo');
    expect(fixture.nativeElement.textContent).toContain('listing-id');
    expect(fixture.nativeElement.textContent).toContain('12 Đường A');
    expect(fixture.nativeElement.querySelector('select[name="relatedListingId"]')).toBeNull();
  });
  it('does not require a selection for a listing report', () => {
    api.detail.mockReturnValue(
      of({
        report: {
          id: 'r',
          status: 'PROCESSING',
          handledBy: 'admin',
          targetType: 'LISTING',
        },
        evidences: [],
      }),
    );
    api.sanctionOptions.mockReturnValue(of({ nextWarningLevel: 2, listings: [] }));
    const c = TestBed.createComponent(ReportDetailPageComponent).componentInstance;
    c.note = 'Approved';
    api.action.mockReturnValue(of({}));
    c.action('resolve');
    expect(api.action).toHaveBeenCalledWith('r', 'resolve', 'Approved', undefined);
  });
  it('shows the original hidden listing for a landlord report and resolves without selecting a different listing', () => {
    api.detail.mockReturnValue(
      of({
        report: {
          id: 'r',
          status: 'PROCESSING',
          handledBy: 'admin',
          targetType: 'LANDLORD',
          originListingId: 'listing-id',
        },
        evidences: [],
        originListing: { ...listing, status: 'HIDDEN' },
        sanctionedListing: null,
      }),
    );
    api.sanctionOptions.mockReturnValue(of({ nextWarningLevel: 2, listings: [] }));
    const fixture = TestBed.createComponent(ReportDetailPageComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(fixture.nativeElement.textContent).toContain('12 Đường A');
    expect(fixture.nativeElement.textContent).toContain('Đã ẩn');
    expect(fixture.nativeElement.textContent).not.toContain('chưa có tin đăng gốc');
    expect(fixture.nativeElement.querySelector('select[name="relatedListingId"]')).toBeNull();
    expect(api.listingDetail).not.toHaveBeenCalled();
    expect(c.canApprove).toBe(true);
    c.note = 'Đã xác minh';
    c.relatedListingId = 'stale-selection';
    api.action.mockReturnValue(of({}));
    c.action('resolve');
    expect(api.action).toHaveBeenCalledWith('r', 'resolve', 'Đã xác minh', undefined);
  });
  it('loads report-scoped detail if only the origin listing id is available', () => {
    api.detail.mockReturnValue(
      of({
        report: {
          id: 'r',
          status: 'PROCESSING',
          handledBy: 'other-admin',
          targetType: 'LANDLORD',
          originListingId: 'listing-id',
        },
        evidences: [],
        originListing: null,
        sanctionedListing: null,
      }),
    );
    const fixture = TestBed.createComponent(ReportDetailPageComponent);
    fixture.detectChanges();
    expect(api.listingDetail).toHaveBeenCalledExactlyOnceWith('r', 'listing-id');
    expect(fixture.nativeElement.textContent).toContain('12 Đường A');
  });
  it('keeps legacy landlord reports without origin distinct from their sanctioned listing', () => {
    api.detail.mockReturnValue(
      of({
        report: {
          id: 'r',
          status: 'RESOLVED',
          targetType: 'LANDLORD',
          originListingId: null,
          sanctionedListingId: 'listing-id',
          resolutionNote: 'Đã xử lý',
          warningLevel: 2,
        },
        evidences: [],
        originListing: null,
        sanctionedListing: { ...listing, status: 'HIDDEN' },
      }),
    );
    const fixture = TestBed.createComponent(ReportDetailPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('chưa có tin đăng gốc');
    expect(fixture.nativeElement.textContent).toContain('Tin đăng đã xử lý');
    expect(fixture.nativeElement.textContent).toContain('12 Đường A');
    expect(api.listingDetail).not.toHaveBeenCalled();
  });
  it('blocks approval while preview is pending but allows rejection when preview fails', () => {
    api.detail.mockReturnValue(
      of({
        report: {
          id: 'r',
          status: 'PROCESSING',
          handledBy: 'admin',
          targetType: 'LANDLORD',
        },
        evidences: [],
      }),
    );
    const pending = new Subject<any>();
    api.sanctionOptions.mockReturnValue(pending);
    const c = TestBed.createComponent(ReportDetailPageComponent).componentInstance;
    c.note = 'Rejected';
    c.action('resolve');
    expect(api.action).not.toHaveBeenCalled();
    pending.error({ error: { message: 'Unavailable' } });
    expect(c.canApprove).toBe(false);
    api.action.mockReturnValue(of({}));
    api.sanctionOptions.mockReturnValue(of({ nextWarningLevel: 1, listings: [] }));
    c.action('reject');
    expect(api.action).toHaveBeenCalledWith('r', 'reject', 'Rejected', undefined);
  });
});
