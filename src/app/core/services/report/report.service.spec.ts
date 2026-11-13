import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReportService } from './report.service';
const report = {
  id: 'report',
  targetType: 'LISTING',
  targetId: 'listing',
  targetName: 'Phòng An Nhiên',
  reasonCode: 'SCAM',
  status: 'PENDING',
  description: null,
  handledBy: null,
  handledByName: null,
  resolutionNote: null,
  resolvedAt: null,
  createdAt: '2026-11-01T10:00:00',
};
const listing = {
  id: 'origin',
  title: 'Tin gốc',
  description: 'Nội dung',
  status: 'HIDDEN',
  propertyId: 'property',
  propertyName: 'Nhà An',
  addressLine: '12 Đường A',
  wardName: 'Phường B',
  provinceName: 'Hà Nội',
  landlordId: 'owner',
  publishedAt: '2026-11-01T10:00:00',
  expiresAt: null,
};
describe('Report API contract', () => {
  let api: ReportService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ReportService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('loads target-specific reasons and sends a separate JSON create request', () => {
    api.reasons('LANDLORD').subscribe();
    const reasons = http.expectOne('/api/reports/reasons?targetType=LANDLORD');
    reasons.flush({ data: ['OTHER'] });
    const body = {
      targetType: 'LISTING' as const,
      targetId: 'listing',
      reasonCode: 'SCAM' as const,
      description: '',
    };
    api.create(body).subscribe((r) => expect(r.createdAt).toBeInstanceOf(Date));
    const req = http.expectOne('/api/reports');
    expect(req.request.body).toEqual(body);
    req.flush({ data: report });
  });
  it('keeps detail wrapper, uploads multipart file and downloads private content as Blob using IDs', () => {
    api.detail('report').subscribe((r) => {
      expect(r.report.id).toBe('report');
      expect(r.evidences[0].createdAt).toBeInstanceOf(Date);
    });
    http.expectOne('/api/reports/report').flush({
      data: {
        report,
        evidences: [
          {
            id: 'e',
            contentUrl: 'https://untrusted.example/ignore',
            createdAt: '2026-11-01T10:00:00',
          },
        ],
      },
    });
    const file = new File(['png'], 'proof.png', { type: 'image/png' });
    api.upload('report', file).subscribe();
    const upload = http.expectOne('/api/reports/report/evidences');
    expect(upload.request.body).toBeInstanceOf(FormData);
    expect(upload.request.body.get('file')).toBe(file);
    expect(upload.request.headers.has('Content-Type')).toBe(false);
    upload.flush({ data: { id: 'e', createdAt: '2026-11-01T10:00:00' } });
    api.content('report', 'e').subscribe();
    const content = http.expectOne('/api/reports/report/evidences/e/content');
    expect(content.request.responseType).toBe('blob');
    content.flush(new Blob(['png'], { type: 'image/png' }));
  });
  it('passes supported admin filters and uses explicit resolution actions', () => {
    api.list(true, 2, 10, 'PROCESSING', 'SCAM').subscribe();
    const list = http.expectOne((r) => r.url === '/api/admin/reports');
    expect(list.request.params.get('page')).toBe('2');
    expect(list.request.params.get('reasonCode')).toBe('SCAM');
    list.flush({ data: { data: [] } });
    api.action('report', 'resolve', 'Đã xác minh').subscribe();
    const action = http.expectOne('/api/admin/reports/report/resolve');
    expect(action.request.method).toBe('POST');
    expect(action.request.body).toEqual({ resolutionNote: 'Đã xác minh' });
    action.flush({ data: { ...report, status: 'RESOLVED' } });
  });
  it('maps both original and sanctioned listing details from the report response', () => {
    api.detail('report').subscribe((value) => {
      expect(value.report.originListingId).toBe('origin');
      expect(value.originListing?.title).toBe('Tin gốc');
      expect(value.originListing?.publishedAt).toBeInstanceOf(Date);
      expect(value.originListing?.expiresAt).toBeNull();
      expect(value.originListing?.fullAddress).toBe('12 Đường A, Phường B, Hà Nội');
      expect(value.sanctionedListing?.status).toBe('EXPIRED');
    });
    http.expectOne('/api/reports/report').flush({
      data: {
        report: { ...report, targetType: 'LANDLORD', originListingId: 'origin' },
        evidences: [],
        originListing: listing,
        sanctionedListing: { ...listing, status: 'EXPIRED' },
      },
    });
  });
  it('uses the scoped admin listing endpoint and maps address/date fields', () => {
    api.listingDetail('report/id', 'listing/id').subscribe((value) => {
      expect(value.status).toBe('HIDDEN');
      expect(value.fullAddress).toBe('12 Đường A, Phường B, Hà Nội');
      expect(value.publishedAt).toBeInstanceOf(Date);
    });
    const request = http.expectOne('/api/admin/reports/report%2Fid/listings/listing%2Fid');
    expect(request.request.method).toBe('GET');
    request.flush({ data: listing });
  });
  it('sends report creation context without losing the original landlord target', () => {
    const body = {
      targetType: 'LANDLORD' as const,
      targetId: 'owner',
      reasonCode: 'SCAM' as const,
      description: 'Nội dung',
      originListingId: 'origin',
      rentalAgreementId: 'agreement',
    };
    api.create(body).subscribe();
    const request = http.expectOne('/api/reports');
    expect(request.request.body).toEqual(body);
    request.flush({ data: { ...report, originListingId: 'origin' } });
  });
});
