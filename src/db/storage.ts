import Dexie, { type Table } from 'dexie';
import type { Notebook } from '../types/note';

class HinhHocNoteDB extends Dexie {
  notebooks!: Table<Notebook, string>;

  constructor() {
    super('HinhHocNoteDB');
    this.version(1).stores({
      notebooks: 'id, subject, updatedAt',
    });
    this.version(2)
      .stores({
        notebooks: 'id, subject, updatedAt',
      })
      .upgrade(async (tx) => {
        // Clear old pre-populated exercise templates so user starts with a clean blank notebook
        const table = tx.table<Notebook, string>('notebooks');
        const oldSeedIds = ['nb-hhkg-11', 'nb-da-dien', 'nb-giai-tich'];
        for (const id of oldSeedIds) {
          await table.delete(id);
        }
      });
  }
}

export const db = new HinhHocNoteDB();

export function createDefaultNotebooks(): Notebook[] {
  const now = Date.now();
  return [
    {
      id: 'nb-blank-1',
      title: 'Sổ tay Toán học',
      subject: 'Hình học không gian',
      tags: ['Ghi chú'],
      activePageId: 'page-blank-1',
      createdAt: now,
      updatedAt: now,
      pages: [
        {
          id: 'page-blank-1',
          title: 'Trang 1',
          paperStyle: 'grid',
          camera: { x: 0, y: 0, zoom: 1 },
          updatedAt: now,
          elements: [],
        },
      ],
    },
  ];
}

export async function loadNotebooks(): Promise<Notebook[]> {
  try {
    const count = await db.notebooks.count();
    if (count === 0) {
      const defaults = createDefaultNotebooks();
      await db.notebooks.bulkPut(defaults);
      return defaults;
    }
    const items = await db.notebooks.orderBy('updatedAt').reverse().toArray();
    return items;
  } catch {
    return createDefaultNotebooks();
  }
}

export async function saveNotebook(notebook: Notebook): Promise<void> {
  try {
    await db.notebooks.put(notebook);
  } catch {
    // Ignore storage write errors in private mode
  }
}

export async function deleteNotebookFromDB(id: string): Promise<void> {
  try {
    await db.notebooks.delete(id);
  } catch {
    // Ignore
  }
}
