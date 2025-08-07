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

// API Request/Response types
export interface CreateChecklistRequest {
    name: string;
    mode?: StorageMode;
}

export interface UpdateChecklistRequest {
    name?: string;
    mode?: StorageMode;
}

export interface AddItemRequest {
    title: string;
}

export interface UpdateItemRequest {
    title?: string;
    completed?: boolean;
}

// API Response types
export interface ChecklistResponse {
    checklist: Checklist;
}

export interface ChecklistsResponse {
    checklists: Checklist[];
}

export interface ItemResponse {
    item: ChecklistItem;
}
