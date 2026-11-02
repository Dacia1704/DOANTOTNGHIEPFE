import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { RoleCode } from '@model/auth/auth.model';
import { LoginComponent } from './login.component';

describe('login destination', () => {
  let http: HttpTestingController;
  let queryParams: Record<string, string>;

  beforeEach(() => {
    localStorage.removeItem('trotot_auth');
    queryParams = {};
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('trotot_auth');
  });

  function login(role: RoleCode) {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const page = TestBed.createComponent(LoginComponent).componentInstance;
    page.form.patchValue({ email: 'member@example.com', password: 'Password123' });
    page.submit();
    http.expectOne((request) => request.url.endsWith('/auth/login')).flush({
      code: 200,
      data: {
        id: 'member', email: 'member@example.com', phone: '', fullName: 'Member',
        status: 'ACTIVE', roles: [role], authorities: [],
        accessToken: 'test-access', refreshToken: 'test-refresh',
      },
    });
    return navigate;
  }

  it.each([RoleCode.LANDLORD, RoleCode.TENANT])('opens landing after %s login', (role) => {
    expect(login(role)).toHaveBeenCalledWith('/');
  });

  it('keeps the admin destination', () => {
    expect(login(RoleCode.ADMIN)).toHaveBeenCalledWith('/admin');
  });

  it('returns landlords to an explicitly requested management page', () => {
    queryParams['redirect'] = '/tin-cua-toi';
    expect(login(RoleCode.LANDLORD)).toHaveBeenCalledWith('/tin-cua-toi');
  });
});
