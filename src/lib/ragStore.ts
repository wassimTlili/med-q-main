import type { VectorIndex } from './services/rag';

export type StoredIndex = {
  id: string;
  index: VectorIndex;
  chunks: { id: string; text: string; meta?: Record<string, any> }[];
  createdAt: number;
};

const store = new Map<string, StoredIndex>();

export function putIndex(item: StoredIndex) {
  store.set(item.id, item);
}

export function getIndex(id: string): StoredIndex | undefined {
  return store.get(id);
}

export function deleteIndex(id: string) {
  store.delete(id);
}

export function listIndexes(): StoredIndex[] {
  return Array.from(store.values());
}
