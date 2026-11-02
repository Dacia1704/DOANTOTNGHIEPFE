/**
 * Mock data cho landing page — copy nguyên từ docs/template/landing-page.html
 * để FE render trước khi backend sẵn sàng cung cấp API thật.
 */

export interface CategoryPill {
  icon: string;
  label: string;
  active?: boolean;
}

export interface QuickFilter {
  id: string;
  label: string;
  icon?: string;
  iconColor?: 'primary' | 'secondary';
  active?: boolean;
  isAdvanced?: boolean;
}

export interface RoomCard {
  id: string;
  image: string;
  imageAlt: string;
  isPriority?: boolean;
  isVerified?: boolean;
  categoryLabel: string;
  categoryIcon: string;
  rating: number;
  reviewCount: number;
  /** AI recommendation cards only: '98%' / '95%' / ... */
  matchBadge?: string;
  badgeKind?: 'primary' | 'secondary';
  badgeIcon?: string;
  badgeLabel?: string;
  title: string;
  address: string;
  distance: string;
  tags: string[];
  price: number;
  priceUnit: string;
  extraLabel: string;
  isArea?: boolean;
  hostInitials: string;
  hostName: string;
}

export interface CampusTag {
  label: string;
}

export const CATEGORY_PILLS: CategoryPill[] = [
  { icon: 'apartment', label: 'Studio cao cấp', active: true },
  { icon: 'home_work', label: 'Căn hộ mini' },
  { icon: 'payments', label: 'Phòng trọ giá rẻ' },
  { icon: 'group', label: 'Ở ghép (Homestay)' },
  { icon: 'school', label: 'Gần trường ĐH' },
  { icon: 'balcony', label: 'Phòng ban công thoáng' },
  { icon: 'stairs', label: 'Gác lửng tiện nghi' },
];

export const QUICK_FILTERS: QuickFilter[] = [
  { id: 'all', label: 'Tất cả', icon: 'tune', active: true },
  { id: 'under3', label: 'Dưới 3 triệu' },
  { id: 'gac', label: 'Phòng có gác lửng', icon: 'stairs', iconColor: 'primary' },
  { id: 'pet', label: 'Nuôi thú cưng', icon: 'pets', iconColor: 'secondary' },
  { id: '24-7', label: 'Giờ giấc tự do 24/7', icon: 'schedule', iconColor: 'primary' },
  { id: 'balcony', label: 'Có ban công / Cửa sổ', icon: 'balcony', iconColor: 'primary' },
  { id: 'verified-owner', label: 'Chủ trọ xác thực', icon: 'verified_user', iconColor: 'primary' },
  { id: 'uni', label: 'Gần ĐH Quốc Gia / Bách Khoa', icon: 'school', iconColor: 'primary' },
  { id: 'advanced', label: 'Bộ lọc tiện ích', icon: 'filter_list', isAdvanced: true },
];

export const ADVANCED_FILTERS: { id: string; label: string; checked: boolean }[] = [
  { id: 'ac', label: 'Máy lạnh Inverter', checked: true },
  { id: 'washer', label: 'Máy giặt riêng', checked: true },
  { id: 'fingerprint', label: 'Khóa vân tay', checked: false },
  { id: 'no-shared', label: 'Không chung chủ', checked: false },
  { id: 'elevator', label: 'Thang máy', checked: false },
  { id: 'kitchen', label: 'Bếp nấu ăn riêng', checked: false },
];

export const AI_RECOMMENDATIONS: RoomCard[] = [
  {
    id: 'ai-1',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBnf0EkELiB1920L2oH04cLNjL7fOX5n4aOy1N0Rtu_upTwC6fuKvcpMEst5X9rXEIeGD-QQsXZq437t6N69g2T19iL4WDBC4zVbhW0rpbFe54ISAPRubIcMnDqyVGPyZSWAtpv8bxQWnScvVpuLFrU08O3nISQ0q0TkRvY9ehaq5KQ9XWm_mBnxDojJrTq_u8Lsd4WXWbFDtTQVb4tBYcECSsR99AiBRwsYoFJpWlLehcnaBf-iEmB/',
    imageAlt: 'Studio duplex gác cao Scandinavian Bình Thạnh',
    categoryLabel: 'Studio Duplex',
    categoryIcon: 'apartment',
    rating: 4.9,
    reviewCount: 32,
    matchBadge: 'Khớp 98%',
    badgeKind: 'primary',
    title: 'Studio Duplex Siêu Xinh Gần ĐH Hutech',
    address: 'Đường D2, Bình Thạnh',
    distance: '500m tới trường',
    tags: ['28m²'],
    price: 4800000,
    priceUnit: '/ tháng',
    extraLabel: '28m²',
    isArea: true,
    hostInitials: 'LA',
    hostName: 'Chị Lan Anh',
  },
  {
    id: 'ai-2',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCtk1fRBn9hqyiFPIu6BRt-9i9qOIpE96WJOCTuY3bgk1TXvHURBHbEoR1N-2AJ6YI-ukElEWpF5NeCz-ArIvork7FbSV5Fgzvrc_kIBjmcNbEq-4t_Pe6xT59OKKwr_cHXZOJT_V3SFXFrJpIy4LU-cY7SQNB9dli4YMAcI5gsKckEQlX7QQVA6bLLLqVXn02IVK1yOMv_nK3hacgA-C0wqL86_dA_4ozkgZzh66F0vOfsZVvE6IFJ/',
    imageAlt: 'Phòng ban công view kính gần ĐHQG Cầu Giấy',
    categoryLabel: 'Ban công view thoáng',
    categoryIcon: 'balcony',
    rating: 4.8,
    reviewCount: 19,
    matchBadge: 'Khớp 95%',
    badgeKind: 'primary',
    title: 'Phòng Ban Công View Kính Gần ĐHQG',
    address: 'Xuân Thủy, Cầu Giấy',
    distance: 'Trạm xe buýt 80m',
    tags: ['24m²'],
    price: 3200000,
    priceUnit: '/ tháng',
    extraLabel: '24m²',
    isArea: true,
    hostInitials: 'HQ',
    hostName: 'Bác Hoàng Quân',
  },
  {
    id: 'ai-3',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBK7FvMM0gf1s7kk0laE0yeqntGMv-6xsjjRxb1iq9mIgI3ZCCaaeRRif4BbYPrFXZhIXNQ07HRPqaeNVgm-yOWxDgAv1P5UMaDWp0D3ejIjoKH1rL08yTyRAlJVu4vOhtXfkVMMnB8ljmFUKllm3Lo0bQrVaMOP4t_630X3xLsxF5MeadR9aVdHRuj0jeAgfwI3Pn487faQD6_rW4UPX6vvBebO073ammwczRf2jUyxIQTPhXVUTyk/',
    imageAlt: 'Căn hộ mini full nội thất quận 7',
    categoryLabel: 'Căn hộ dịch vụ',
    categoryIcon: 'home_work',
    rating: 5.0,
    reviewCount: 14,
    matchBadge: 'Khớp 92%',
    badgeKind: 'primary',
    title: 'Căn Hộ Mini Full Nội Thất Sang Xịn',
    address: 'Nguyễn Thị Thập, Q.7',
    distance: 'Gần ĐH Tôn Đức Thắng',
    tags: ['35m²'],
    price: 5500000,
    priceUnit: '/ tháng',
    extraLabel: '35m²',
    isArea: true,
    hostInitials: 'MT',
    hostName: 'Anh Minh Triết',
  },
  {
    id: 'ai-4',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDnE4-Z_KWyBaO-n_kRBXKiefxwMFO3rIPYBRsKwwlpxZcMYywRzsJn4nEAcUoBXGi9Tp-YG2WK2AQYv0FyjhNgIXVefhwz-Rv4_M2XrXH92scIizCTYCW4nYkxfnhW1m_5i1YUyMvTqcT9J-NQnf5qYXAzh9XkFmdfujB1o2_B9jXEsZajyF7vj7fVf9At-cGw1XOhfm_67XfaT6U5wo-fo_qJXjm8n3yDzZ-PEZgXm_L4-1AQWDvl/',
    imageAlt: 'KTX cao cấp Bách Khoa Hai Bà Trưng',
    categoryLabel: 'KTX Cao cấp',
    categoryIcon: 'groups',
    rating: 4.7,
    reviewCount: 46,
    matchBadge: 'Tiết kiệm chi phí',
    badgeKind: 'secondary',
    badgeIcon: 'savings',
    title: 'Phòng KTX Cao Cấp Tiện Nghi Bách Khoa',
    address: 'Tạ Quang Bửu, HBT',
    distance: 'Đi bộ 3 phút tới Bách Khoa',
    tags: ['Bao trọn phí'],
    price: 1800000,
    priceUnit: '/ người',
    extraLabel: 'Bao trọn phí',
    hostInitials: 'VN',
    hostName: 'Anh Văn Nam',
  },
];

export const ROOM_LISTINGS: RoomCard[] = [
  {
    id: 'r-1',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBJwp440xAR_2gAReKefcZe-BX-UMdbtllzNyvR5Ntqe80EW1LNm1F-qC8yrpkJ3IxkmxLHABttxvry-F8fN-hYbUaJ2jULYZ-Dccn7455w3vkzy3N-WKEqY_Oeg8rcsho0s2SmrEMVHrgyHvifImcsV9lsNXCGFmtHv3Y-eTeauqd2YJZMB6dpxbvptNNLMoRCkuJmZO_U29EgIxscjzVMgMGXB2NgBuGGkeQRAL5ozsLpXlnfh0EQ/',
    imageAlt: 'Phòng trọ gác đúc Bình Thạnh',
    isPriority: true,
    isVerified: true,
    categoryLabel: 'Phòng trọ',
    categoryIcon: 'apartment',
    rating: 4.9,
    reviewCount: 24,
    title: 'Phòng trọ cao cấp gác đúc, máy lạnh, ban công đón nắng tự nhiên',
    address: 'P.25, Q. Bình Thạnh, TP.HCM',
    distance: 'Gần ĐH Hutech',
    tags: ['28m²', 'Gác lửng cao', 'Vân tay'],
    price: 3800000,
    priceUnit: '/ tháng',
    extraLabel: 'Điện 3.5k • Nước 100k',
    hostInitials: 'LA',
    hostName: 'Chị Lan Anh • Phản hồi 10p',
  },
  {
    id: 'r-2',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD9G_E0Q8eDzIFOtoQAgUMfYgKXA8KF9kA1JLzFPwzgqisgPy8IRW69ZcbWAMfkIxZ2v9x6tnS5M2r64r3uoAwNXuFCzZgTIOk3kCeJMlgzCz8BAtAzK4oXXybMTsI0R7-Jr5c-aPwkFs_fpul1XX2orxfJbgVq0BqKY4yIgiODy5ge3ycSZoGn2pxCIdTN9e05DmtX-T3pvMEsLI9UJeWBqkQZEmP-wEJtw2Mg-Iy_rBy5bZ9wlK1-/',
    imageAlt: 'Studio khép kín full đồ Cầu Giấy',
    isVerified: true,
    categoryLabel: 'Studio',
    categoryIcon: 'apartment',
    rating: 4.8,
    reviewCount: 18,
    title: 'Studio khép kín full đồ, thang máy, máy giặt sấy riêng từng tầng',
    address: 'Dịch Vọng Hậu, Q. Cầu Giấy, HN',
    distance: 'Gần ĐH Quốc Gia',
    tags: ['32m²', 'Thang máy', 'Khu bếp riêng'],
    price: 4200000,
    priceUnit: '/ tháng',
    extraLabel: 'Free wifi tốc độ cao',
    hostInitials: 'HQ',
    hostName: 'Bác Hoàng Quân • Xem phòng ngay',
  },
  {
    id: 'r-3',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB3gtDeA_qdI67vjPtbN7uMUIsPui6zBMOq5Du_GBh5G3avJsshIfyABK9FBMEw7SliXmOUVC6atePslmpatc4hEuLnsB-ZLGVSHqAAxFmpvm4C20d-2Menuo9KvGDceMzvYkeZ5rnaggztLWeFyLFj_PYzeIEcGIs3k_dMWbSW4Z7CrZZVWutH9dMkkLhUjv2Fpg54T_xs4AHvYwPWxPLUvRtgDN3m4QEfdAno2M1S8dtALP0FyLX3/',
    imageAlt: 'Căn hộ mini Quận 1',
    isPriority: true,
    isVerified: false,
    categoryLabel: 'Căn hộ mini',
    categoryIcon: 'apartment',
    rating: 5.0,
    reviewCount: 41,
    title: 'Căn hộ mini trung tâm Quận 1 yên tĩnh, an ninh camera 24/24',
    address: 'Đa Kao, Quận 1, TP.HCM',
    distance: 'Trung tâm',
    tags: ['25m²', 'Full nội thất', 'Giờ tự do'],
    price: 5200000,
    priceUnit: '/ tháng',
    extraLabel: 'Giảm 500k tháng đầu',
    hostInitials: 'MT',
    hostName: 'Anh Minh Triết • Chủ nhà thân thiện',
  },
  {
    id: 'r-4',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBZF_cked5fnvGZoJXizwN1YhnC8qdmp4juSayt-98iS-Z_nFo9EcTSAW4US9iFkPLOfE8eqQxwmSg6_gDsq_PwAurvyupshWsjKBA2f1dFocAMA2b1Sa89AG5_HouonW9OSKF_TepyYCX4t5tktwVM7KkgwcnqNmtsXE8pk7SPZ0JVf3_MryCCPTTmj9c9kiLxnPT7m5RAxcTrqtv7444lD-ManHT8Zvwitbyh2ub11lZWTeMo-p5J/',
    imageAlt: 'Phòng trọ Nam Từ Liêm gần sân vận động Mỹ Đình',
    isVerified: true,
    categoryLabel: 'Phòng trọ',
    categoryIcon: 'apartment',
    rating: 4.7,
    reviewCount: 12,
    title: 'Phòng trọ mới xây không chung chủ, gần sân vận động Mỹ Đình',
    address: 'Mỹ Đình 2, Nam Từ Liêm, HN',
    distance: 'Gần SVĐ Mỹ Đình',
    tags: ['22m²', 'Cửa sổ thoáng', 'Nóng lạnh'],
    price: 2700000,
    priceUnit: '/ tháng',
    extraLabel: 'Điện nước giá dân',
    hostInitials: 'TH',
    hostName: 'Cô Thu Hà • Phản hồi tức thì',
  },
  {
    id: 'r-5',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC1bOM5u_6xRj9R_T-lr2zkPGm1lWODkEMcUkb3rfIKbLfNtARP4BCY5oVKvGUdKWK9TIMYKgZBz374tGXkGtB8HKV895PZMO5QhDzuTomx7dVFF96zUlrcDaL4CDjz2AkXA--zOCDZzm5yNpGdJVcu1ozrI8qqsucssuYvM67cs7XMg0CsFYhiskENAmlNlHoF1qK7J14mqFNfcu0Vad7LiW8saunzUJsh_a9b5eMPsvAnPO57QQuW/',
    imageAlt: 'Phòng trọ gác cao gần Làng Đại học Thủ Đức',
    isVerified: true,
    categoryLabel: 'Phòng trọ',
    categoryIcon: 'apartment',
    rating: 4.9,
    reviewCount: 38,
    title: 'Phòng trọ gác cao gần Làng Đại học & ĐH Nông Lâm, hẻm ô tô',
    address: 'Linh Trung, TP. Thủ Đức, TP.HCM',
    distance: 'Cách ĐHQG 800m',
    tags: ['26m²', 'Nuôi pet OK', 'Cổng vân tay'],
    price: 3100000,
    priceUnit: '/ tháng',
    extraLabel: 'Cách ĐHQG 800m',
    hostInitials: 'VN',
    hostName: 'Anh Văn Nam • Quản lý tòa nhà',
  },
  {
    id: 'r-6',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCXXjYUELz8GA4PVdB_A_oHtaC-62gYh2nL3rsnuu5mf4q28V5eLl-zx-aInoQb9Kr0l6F9e2gLZQ_JHUCXdkGvJnfEw1VFKiA7v4aOyU-iaMCt5KeXxI8Oqc2C9UjnDCg40Y_qD2m-PiUf1shJNrCbdIr0gdUKusELlCyW-v4UjcLx2U60_hDZNCQ8oknXA0tTzY97Bxs9URInlWPyyLl5Tx5zK_LrMs1qVNYp-SpdQmrIJ70_7eMW/',
    imageAlt: 'Phòng ban công thoáng cạnh Học viện Ngân Hàng',
    isPriority: true,
    isVerified: false,
    categoryLabel: 'Phòng trọ',
    categoryIcon: 'apartment',
    rating: 4.8,
    reviewCount: 29,
    title: 'Phòng đẹp ban công thoáng mát ngay cạnh Học viện Ngân Hàng',
    address: 'Chùa Bộc, Q. Đống Đa, HN',
    distance: 'Cạnh HVNH',
    tags: ['30m²', 'Máy giặt riêng', 'Khóa thông minh'],
    price: 3900000,
    priceUnit: '/ tháng',
    extraLabel: 'Hỗ trợ sinh viên',
    hostInitials: 'TH',
    hostName: 'Chị Thúy Hằng • Trực tiếp chủ nhà',
  },
  {
    id: 'r-7',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAJE7Tf-bXtXTRBHuiLg0DnKQc7OfJ3wv_5i4-2VXyVPrVpWda8iwsX9HCWVjaqHa54Ce5oIHXXtMQQ6tXHvFMfG_tdremeH84RTyJTlJxArHxjDv2qOfBYqU7JbqD-BE6IR8dlkQT_LGcTg9R3bW0kRRXpss-timrQ8UNxfAGw_S0rhpBJbhEh0c_dZ5-kPU2nNaAtZXdtsFOCNJ6OkAie3r70RgeEP_uUpc356v6JXPItEg6QfQNM/',
    imageAlt: 'Phòng trọ Quận 10 gần ĐH Bách Khoa',
    isVerified: true,
    categoryLabel: 'Phòng trọ',
    categoryIcon: 'apartment',
    rating: 4.9,
    reviewCount: 30,
    title: 'Phòng trọ tiện nghi gần ĐH Bách Khoa TP.HCM & ĐH Y Dược',
    address: 'Tô Hiến Thành, Quận 10, TP.HCM',
    distance: 'Gần ĐH Bách Khoa',
    tags: ['24m²', 'Gác gỗ', 'Bảo vệ 24/7'],
    price: 3500000,
    priceUnit: '/ tháng',
    extraLabel: 'Giờ giấc tự do',
    hostInitials: 'QD',
    hostName: 'Chú Quang Dũng • Quản lý toà nhà',
  },
  {
    id: 'r-8',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDcP1zq9IpQfW4II6fccNOvmbrY9q2Xoi-W5JpPjT1BHTAk4IZRdpN9nmRKX7O4axveWocBIbijL2WvWr_2cdfcOUzWaKof1wUHTPKIKfxd48ilJVy0A1popM8ufvb-1taCzGNUeKgnpPlrZf-cjx0k-yz6gdY3A1tFaEbqdq52esHF-oOQBfunUqoNkPGV0FRyC-XN4sIOKE0tf85Kg9ddhvF0DWYTkBOv43R-BHJwCvkEo3JPcvRh/',
    imageAlt: 'Studio Quận 7 gần RMIT',
    isVerified: true,
    categoryLabel: 'Studio',
    categoryIcon: 'apartment',
    rating: 4.9,
    reviewCount: 53,
    title: 'Studio sang trọng có bãi giữ xe rộng rãi, gần RMIT & Lotte Mart',
    address: 'Lê Văn Lương, Quận 7, TP.HCM',
    distance: 'Gần RMIT',
    tags: ['34m²', 'Ban công cây xanh', 'Bếp từ âm'],
    price: 4900000,
    priceUnit: '/ tháng',
    extraLabel: 'Bao phí gửi xe',
    hostInitials: 'TN',
    hostName: 'Chị Thảo Nhi • Hỗ trợ hợp đồng mẫu',
  },
];

export const CAMPUS_TAGS: CampusTag[] = [
  { label: 'ĐH Bách Khoa' },
  { label: 'ĐH Quốc Gia Hà Nội' },
  { label: 'ĐH Kinh Tế Quốc Dân' },
  { label: 'ĐH Hutech' },
  { label: 'ĐH Ngoại Thương' },
  { label: 'ĐH FPT' },
];

export const PRICE_OPTIONS = [
  { value: 'all', label: 'Tất cả mức giá' },
  { value: 'under2.5', label: 'Dưới 2.5 triệu / tháng' },
  { value: '2.5-4', label: '2.5 - 4.0 triệu / tháng' },
  { value: '4-6', label: '4.0 - 6.0 triệu / tháng' },
  { value: 'over6', label: 'Trên 6.0 triệu / tháng' },
];

export const ROOM_TYPE_OPTIONS = [
  { value: 'all', label: 'Mọi loại hình' },
  { value: 'studio', label: 'Studio riêng tư' },
  { value: 'gac-lung', label: 'Phòng có gác lửng' },
  { value: 'chung-cu-mini', label: 'Chung cư mini' },
  { value: 'ktx', label: 'Ký túc xá / Ở ghép' },
];

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price-asc', label: 'Giá từ thấp đến cao' },
  { value: 'rating', label: 'Đánh giá cao nhất' },
  { value: 'distance', label: 'Khoảng cách gần nhất' },
];
