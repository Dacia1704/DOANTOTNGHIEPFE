import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { PropertyUnitForm } from '../../models/property-unit-form';
import { DefaultRoomRequest } from '@model/property/request/create-property-request';
import { RoomType } from '@model/room-type/room-type.model';
import { Amenity } from '@model/amenity/amenity.model';
import { TextUtils } from '@shared/utils/text-utils';

@Component({
  selector: 'app-property-unit-editor',
  imports: [ReactiveFormsModule],
  templateUrl: './property-unit-editor.component.html',
  styleUrl: './property-unit-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertyUnitEditorComponent {
  readonly form = input.required<PropertyUnitForm>();
  readonly defaults = input.required<DefaultRoomRequest>();
  readonly roomTypes = input.required<RoomType[]>();
  readonly amenities = input.required<Amenity[]>();
  readonly index = input.required<number>();
  readonly canRemove = input(true);
  readonly whole = input(false);
  readonly remove = output<void>();
  readonly money = TextUtils.toVnd;
  toggleAmenity(id: string): void {
    const control = this.form().controls.amenityIds;
    control.setValue(
      control.value.includes(id)
        ? control.value.filter((value) => value !== id)
        : [...control.value, id],
    );
    control.markAsDirty();
  }
}
