import { format as dateFormat } from 'date-fns';
import { vi } from 'date-fns/locale';

export class TextUtils {

  static toVnd(amount: number, currency = 'VNĐ'): string {
    return amount.toLocaleString('vi-VN') + ' ' + currency;
  }

  static toPercentage(percentage: number): string {
    return (percentage * 100).toLocaleString('vi-VN') + '%';
  }

  static formatDate(date: Date, pattern: string): string {
    return dateFormat(date, pattern, {
      locale: vi
    });
  }
}