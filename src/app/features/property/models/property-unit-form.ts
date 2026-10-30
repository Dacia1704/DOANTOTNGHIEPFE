import { FormBuilder, Validators } from '@angular/forms';

/** One explicit rental unit; null overrides inherit the property creation defaults. */
export function createPropertyUnitForm(fb: FormBuilder) {
  return fb.group({
    roomNumber: fb.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(30),
      Validators.pattern(/\S/),
    ]),
    floorNumber: fb.control<number | null>(null, [Validators.min(0), Validators.pattern(/^\d+$/)]),
    roomTypeId: fb.control<string | null>(null),
    price: fb.control<number | null>(null, Validators.min(0.01)),
    electricityPrice: fb.control<number | null>(null, Validators.min(0)),
    waterPrice: fb.control<number | null>(null, Validators.min(0)),
    serviceFee: fb.control<number | null>(null, Validators.min(0)),
    defaultDeposit: fb.control<number | null>(null, Validators.min(0)),
    areaM2: fb.control<number | null>(null, Validators.min(0.01)),
    maxOccupants: fb.control<number | null>(null, [Validators.min(1), Validators.pattern(/^\d+$/)]),
    amenityIds: fb.nonNullable.control<string[]>([]),
  });
}
export type PropertyUnitForm = ReturnType<typeof createPropertyUnitForm>;
