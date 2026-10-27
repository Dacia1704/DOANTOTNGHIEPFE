import { describe, expect, it } from 'vitest';
import { RoomType } from '@model/room-type/room-type.model';
import { RoomTypeUtils } from './room-type-utils';
const type = (id: string, parentId: string | null = null): RoomType => ({
  id,
  name: id,
  parentId,
  description: '',
  parentName: '',
  createdAt: null,
  updatedAt: null,
});
describe('RoomTypeUtils', () => {
  const types = [type('Con', 'Cha'), type('Cháu', 'Con'), type('Cha'), type('Khác')];
  it('builds nested branches even when children arrive before their parent', () => {
    const roots = RoomTypeUtils.tree(types);
    expect(roots.map((n) => n.type.id)).toEqual(['Cha', 'Khác']);
    expect(roots[0].children[0].children[0].type.id).toBe('Cháu');
    expect(RoomTypeUtils.options(types)[2].label).toBe('Cha › Con › Cháu');
  });
  it('keeps ancestors of a search match and removes unrelated branches', () => {
    const roots = RoomTypeUtils.filter(RoomTypeUtils.tree(types), 'cháu');
    expect(roots).toHaveLength(1);
    expect(roots[0].type.id).toBe('Cha');
    expect(roots[0].children[0].children[0].type.id).toBe('Cháu');
  });
  it('excludes self and indirect descendants from parent choices', () => {
    expect(RoomTypeUtils.parentChoices(types, 'Cha').map((t) => t.id)).toEqual(['Khác']);
    expect(RoomTypeUtils.parentChoices(types, 'Con').map((t) => t.id)).toEqual(['Cha', 'Khác']);
  });
  it('preserves orphan and cyclic legacy records without recursion loops or duplicates', () => {
    const invalid = [
      type('Orphan', 'Missing'),
      type('A', 'B'),
      type('B', 'A'),
      type('Self', 'Self'),
      type('Child', 'A'),
    ];
    const ids = RoomTypeUtils.options(invalid).map((t) => t.id);
    expect(ids.sort()).toEqual(invalid.map((t) => t.id).sort());
  });
});
