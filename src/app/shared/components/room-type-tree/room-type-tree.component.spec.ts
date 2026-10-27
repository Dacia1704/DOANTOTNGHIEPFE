import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { RoomTypeTreeComponent } from './room-type-tree.component';
import { RoomType } from '@model/room-type/room-type.model';
const type = (id: string, parentId: string | null = null): RoomType => ({
  id,
  name: id,
  parentId,
  description: '',
  parentName: '',
  createdAt: null,
  updatedAt: null,
});
describe('RoomTypeTreeComponent', () => {
  it('supports collapse, context-preserving search, and per-node admin actions', async () => {
    const fixture = TestBed.createComponent(RoomTypeTreeComponent);
    const parent = type('Cha'),
      child = type('Con', 'Cha');
    fixture.componentRef.setInput('types', [child, parent]);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const add = vi.fn();
    fixture.componentInstance.addChild.subscribe(add);
    root.querySelector<HTMLButtonElement>('[aria-label="Thêm loại con của Con"]')!.click();
    expect(add).toHaveBeenCalledWith(child);
    root.querySelector<HTMLButtonElement>('[aria-label="Thu gọn Cha"]')!.click();
    fixture.detectChanges();
    expect(root.querySelector('[aria-label="Thêm loại con của Con"]')).toBeNull();
    fixture.componentRef.setInput('query', 'Con');
    fixture.detectChanges();
    expect(root.textContent).toContain('Cha');
    expect(root.querySelector('[aria-label="Thêm loại con của Con"]')).not.toBeNull();
  });
  it('selects exact types publicly and exposes no mutation actions', () => {
    const fixture = TestBed.createComponent(RoomTypeTreeComponent);
    const child = type('Con', 'Cha');
    fixture.componentRef.setInput('types', [type('Cha'), child]);
    fixture.detectChanges();
    const select = vi.fn();
    fixture.componentInstance.selectType.subscribe(select);
    const root: HTMLElement = fixture.nativeElement;
    [...root.querySelectorAll<HTMLButtonElement>('button.name')]
      .find((b) => b.textContent?.trim() === 'Con')!
      .click();
    expect(select).toHaveBeenCalledWith(child);
    expect(root.querySelector('.actions')).toBeNull();
  });
});
