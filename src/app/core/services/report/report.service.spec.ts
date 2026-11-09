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
});
