import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RoomType } from '@model/room-type/room-type.model';
import { RoomTypeUtils } from '@shared/utils/room-type-utils';

@Component({
  selector: 'app-room-type-tree',
  imports: [NgTemplateOutlet],
  templateUrl: './room-type-tree.component.html',
  styleUrl: './room-type-tree.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomTypeTreeComponent {
  readonly types = input<RoomType[]>([]);
  readonly query = input('');
  readonly editable = input(false);
  readonly compact = input(false);
  readonly selectedName = input('');
  readonly selectType = output<RoomType>();
  readonly addChild = output<RoomType>();
  readonly editType = output<RoomType>();
  readonly deleteType = output<RoomType>();
  readonly collapsed = signal(new Set<string>());
  readonly nodes = computed(() =>
    RoomTypeUtils.filter(RoomTypeUtils.tree(this.types()), this.query()),
  );

  isExpanded(id: string): boolean {
    return !!this.query().trim() || !this.collapsed().has(id);
  }
  toggle(id: string): void {
    this.collapsed.update((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
}
