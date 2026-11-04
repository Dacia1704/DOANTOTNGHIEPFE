// LOCAL UI fixture from RentalAgreementResponse/RentalService. Not an auth or DB test.
// The PDF is an actual JasperReports preview with synthetic identities, not a rendered HTML substitute.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const pdf = fs.readFileSync(
  process.env.RENTAL_UI_PDF || path.resolve('postman/mocks/rental-agreements/contract-demo.pdf'),
);
const hash = crypto.createHash('sha256').update(pdf).digest('hex');
const base = {
  id: 'contract-demo',
  requestId: 'request-demo',
  agreementCode: 'HD-DEMO-2026-001',
  roomId: 'room-a101',
  roomNumber: 'A101',
  propertyName: 'Nhà trọ Hoa Mai',
  tenantName: 'Nguyễn Văn An',
  landlordName: 'Trần Thị Hồng',
  price: 3000000,
  deposit: 1500000,
  electricityPrice: 3500,
  waterPrice: 100000,
  serviceFee: 50000,
  startDate: '2026-11-15',
  endDate: '2027-11-14',
  status: 'PENDING_CONFIRMATION',
  pdfStatus: 'READY',
  pdfSha256: hash,
  confirmationExpiresAt: '2026-11-03T10:30:00',
  landlordConfirmedAt: '2026-11-01T10:30:00',
  tenantConfirmedAt: null,
};
const seed = () => [
  base,
  {
    ...base,
    id: 'contract-processing',
    agreementCode: 'HD-DEMO-2026-002',
    roomNumber: 'A102',
    pdfStatus: 'PROCESSING',
    pdfSha256: null,
  },
  {
    ...base,
    id: 'contract-failed',
    agreementCode: 'HD-DEMO-2026-003',
    roomNumber: 'A103',
    pdfStatus: 'FAILED',
    pdfSha256: null,
  },
];
http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://local');
    const route = url.pathname;
    const send = (data, status = 200, message = 'Thành công') => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ code: status, message, data }));
    };
    if (route === '/test/reset' && req.method === 'POST') {
      await pm.state.set('rental-agreements.contracts', seed());
      await pm.state.set('rental-agreements.corruptPdf', false);
      return send(null);
    }
    if (route === '/test/corrupt-pdf' && req.method === 'POST') {
      await pm.state.set('rental-agreements.corruptPdf', !!req.body?.enabled);
      return send(null);
    }
    const role =
      req.headers.authorization === 'Bearer ui-owner'
        ? 'LANDLORD'
        : req.headers.authorization === 'Bearer ui-tenant'
          ? 'TENANT'
          : null;
    if (!role) return send(null, 401, 'Vui lòng đăng nhập');
    const contracts = (await pm.state.get('rental-agreements.contracts')) || seed();
    const response = (a) => ({
      ...a,
      canConfirm:
        role === 'TENANT' && a.status === 'PENDING_CONFIRMATION' && a.pdfStatus === 'READY',
      canDecline: role === 'TENANT' && a.status === 'PENDING_CONFIRMATION',
      canDownloadPdf: a.pdfStatus === 'READY',
      canCheckout: role === 'LANDLORD' && a.status === 'ACTIVE',
    });
    const page = (data) => ({
      currentPage: 0,
      pageSize: 10,
      totalPages: 1,
      totalElements: data.length,
      data,
    });
    if (route === '/chat/conversations') return send([]);
    if (route === '/properties/mine') return send(page([]));
    if (['/rental-agreements/my', '/landlord/rental-agreements'].includes(route))
      return send(page(contracts.map(response)));
    if (['/rental-requests/my', '/landlord/rental-requests'].includes(route))
      return send(
        page(
          url.searchParams.get('status') && url.searchParams.get('status') !== 'ACCEPTED'
            ? []
            : [
                {
                  id: base.requestId,
                  listingId: 'listing-demo',
                  propertyId: 'property-demo',
                  propertyName: base.propertyName,
                  roomId: base.roomId,
                  roomNumber: base.roomNumber,
                  tenantName: base.tenantName,
                  status: 'ACCEPTED',
                  proposedMoveInDate: base.startDate,
                  endDate: base.endDate,
                  createdAt: base.landlordConfirmedAt,
                  expiresAt: base.confirmationExpiresAt,
                  durationMonths: 12,
                  occupantCount: 2,
                  agreementId: base.id,
                  pdfStatus: 'READY',
                },
              ],
        ),
      );
    const match = route.match(
      /^\/(landlord\/)?rental-agreements\/([^/]+)(?:\/(pdf|confirm|decline|checkout))?$/,
    );
    if (!match) return send(null, 501, 'Route is not modeled by this local UI simulation');
    const a = contracts.find((a) => a.id === match[2]);
    if (!a) return send(null, 404, 'Không tìm thấy hợp đồng');
    if (!match[3] && req.method === 'GET') return send(response(a));
    if (match[3] === 'pdf' && req.method === 'GET') {
      if (a.pdfStatus !== 'READY') return send(null, 409, 'Hợp đồng PDF chưa sẵn sàng');
      const bytes = (await pm.state.get('rental-agreements.corruptPdf'))
        ? Buffer.from('%PDF-wrong-version')
        : pdf;
      res.writeHead(200, { 'Content-Type': 'application/pdf', 'Cache-Control': 'no-store' });
      return res.end(bytes);
    }
    if (req.method !== 'POST') return send(null, 501, 'Method is not modeled');
    if (match[3] === 'confirm') {
      if (!response(a).canConfirm) return send(null, 403, 'Không được xác nhận');
      if (req.body?.accepted !== true || req.body?.expectedPdfSha256 !== hash)
        return send(null, 409, 'Phiên bản PDF không khớp');
      a.status = 'ACTIVE';
      a.tenantConfirmedAt = '2026-11-01T11:00:00';
    } else if (match[3] === 'decline') {
      if (!response(a).canDecline) return send(null, 403, 'Không được từ chối');
      a.status = 'CANCELLED';
      a.cancelReason = 'Người thuê từ chối hợp đồng';
    } else if (match[3] === 'checkout') {
      if (!response(a).canCheckout || req.body?.handoverConfirmed !== true)
        return send(null, 403, 'Không được kết thúc hợp đồng');
      a.status = 'TERMINATED';
    } else return send(null, 501, 'Action is not modeled');
    await pm.state.set('rental-agreements.contracts', contracts);
    return send(response(a));
  })
  .listen(process.env.PORT);
