/** JSON representation of the documented billing API. Dates are ISO strings on the wire. */
export type BillingResponse<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? BillingResponse<U>[]
    : T extends object
      ? { [K in keyof T]: BillingResponse<T[K]> }
      : T;
