import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ReportService } from '@services/report/report.service';
import { ReportFormDialogComponent } from './report-form-dialog.component';
describe('Report creation with separate evidence uploads', () => {
  const api = { reasons: vi.fn(), create: vi.fn(), detail: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    api.reasons.mockReturnValue(of(['SCAM', 'OTHER']));
    TestBed.configureTestingModule({
      imports: [ReportFormDialogComponent],
      providers: [
        provideRouter([]),
        { provide: ReportService, useValue: api },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { targetType: 'LISTING', targetId: 'listing', targetName: 'An Nhiên' },
        },
        { provide: MatDialogRef, useValue: { close: vi.fn(), disableClose: false } },
      ],
    });
  });
  it('rejects a whitespace-only OTHER reason', () => {
    const c = TestBed.createComponent(ReportFormDialogComponent).componentInstance;
    c.reason = 'OTHER';
    c.description = '   ';
    c.submit();
    expect(api.create).not.toHaveBeenCalled();
  });
  it('retains the created report ID when an evidence refresh fails and never creates it twice', () => {
    const c = TestBed.createComponent(ReportFormDialogComponent).componentInstance;
    c.reason = 'SCAM';
    c.description = 'Nội dung';
    api.create.mockReturnValue(of({ id: 'saved-report', status: 'PENDING' }));
    c.submit();
    expect(c.detail()?.report.id).toBe('saved-report');
    api.detail.mockReturnValue(throwError(() => new Error('Image refresh unavailable')));
    c.refresh();
    expect(c.error()).toContain('Báo cáo đã gửi');
    expect(c.detail()?.report.id).toBe('saved-report');
    c.submit();
    expect(api.create).toHaveBeenCalledTimes(1);
  });
});
