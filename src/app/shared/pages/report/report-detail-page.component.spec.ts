import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '@services/auth/auth.service';
import { ReportService } from '@services/report/report.service';
import { ReportDetailPageComponent } from './report-detail-page.component';
describe('Report resolution permissions and conflicts', () => {
  const api = { detail: vi.fn(), action: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
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
    c.detail.set({ report: { id: 'r', status: 'PENDING' } as any, evidences: [] });
    api.action.mockReturnValue(
      throwError(() => ({ error: { message: 'Báo cáo đã có người tiếp nhận' } })),
    );
    c.action('assign');
    expect(c.actionError()).toContain('đã có người tiếp nhận');
    expect(api.detail).toHaveBeenCalledTimes(2);
  });
});
