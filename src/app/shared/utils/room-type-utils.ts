import { RoomType } from '@model/room-type/room-type.model';

export interface RoomTypeNode {
  type: RoomType;
  children: RoomTypeNode[];
}

export class RoomTypeUtils {
  /** Build a complete forest, keeping orphaned and cyclic legacy records reachable once. */
  static tree(types: RoomType[]): RoomTypeNode[] {
    const nodes = new Map(types.map((type) => [type.id, { type, children: [] } as RoomTypeNode]));
    const roots: RoomTypeNode[] = [];
    for (const node of nodes.values()) {
      const ancestors = new Set([node.type.id]);
      let parentId = node.type.parentId;
      let cyclic = false;
      while (parentId && nodes.has(parentId)) {
        if (ancestors.has(parentId)) {
          cyclic = true;
          break;
        }
        ancestors.add(parentId);
        parentId = nodes.get(parentId)!.type.parentId;
      }
      const parent = node.type.parentId ? nodes.get(node.type.parentId) : undefined;
      if (parent && !cyclic) parent.children.push(node);
      else roots.push(node);
    }
    return roots;
  }

  /** Preserve ancestor context when a name or description matches the search. */
  static filter(nodes: RoomTypeNode[], term: string): RoomTypeNode[] {
    const query = term.trim().toLocaleLowerCase('vi');
    if (!query) return nodes;
    return nodes.flatMap((node) => {
      if (`${node.type.name} ${node.type.description}`.toLocaleLowerCase('vi').includes(query))
        return [node];
      const children = this.filter(node.children, query);
      return children.length ? [{ ...node, children }] : [];
    });
  }

  /** Flatten in tree order with a readable path for native select controls. */
  static options(types: RoomType[]): { id: string; name: string; label: string }[] {
    const visit = (
      nodes: RoomTypeNode[],
      path: string[],
    ): { id: string; name: string; label: string }[] =>
      nodes.flatMap((node) => [
        { id: node.type.id, name: node.type.name, label: [...path, node.type.name].join(' › ') },
        ...visit(node.children, [...path, node.type.name]),
      ]);
    return visit(this.tree(types), []);
  }

  /** Exclude self and every descendant from the possible parents of an edited type. */
  static parentChoices(types: RoomType[], id?: string): RoomType[] {
    if (!id) return types;
    const excluded = new Set([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const type of types) {
        if (type.parentId && excluded.has(type.parentId) && !excluded.has(type.id)) {
          excluded.add(type.id);
          changed = true;
        }
      }
    }
    return types.filter((type) => !excluded.has(type.id));
  }
}
