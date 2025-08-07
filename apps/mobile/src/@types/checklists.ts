export type StorageMode = 'api' | 'local';

export interface ChecklistItem {
    id: string;
    title: string;
    completed: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Checklist {
    id: string; // UUID for items
    slug: string; // URL-friendly identifier derived from name
    name: string; // Display name
    mode: StorageMode;
    items: ChecklistItem[];
    createdAt: string;
    updatedAt: string;
}
