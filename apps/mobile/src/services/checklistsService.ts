// apps/mobile/src/services/checklistsService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Checklist, ChecklistItem, StorageMode } from '../@types';
import { v4 as uuidv4 } from 'uuid';
import { generateUUID } from '../utils/uuid';
import { apiService, ApiService } from './api';
import { createSlug } from '../utils/slug';

// UUID generation helper that works in React Native
const createUUID = (): string => {
    try {
        return uuidv4();
    } catch (error) {
        console.warn('UUID v4 failed, using fallback:', error);
        return generateUUID();
    }
};

// Custom error types for better error handling
export class ChecklistsServiceError extends Error {
    constructor(message: string, public code?: string, public originalError?: Error) {
        super(message);
        this.name = 'ChecklistsServiceError';
    }
}

export class ChecklistNotFoundError extends ChecklistsServiceError {
    constructor(identifier: string) {
        super(`Checklist '${identifier}' not found`, 'CHECKLIST_NOT_FOUND');
        this.name = 'ChecklistNotFoundError';
    }
}

export class ItemNotFoundError extends ChecklistsServiceError {
    constructor(itemId: string) {
        super(`Item with id ${itemId} not found`, 'ITEM_NOT_FOUND');
        this.name = 'ItemNotFoundError';
    }
}

// Service configuration interface
export interface ChecklistsServiceConfig {
    checklistName: string; // The name/identifier of the checklist (will be converted to slug)
    type: 'local' | 'api';
    enableOfflineSync?: boolean;
    retryAttempts?: number;
}

// Result types for better type safety
export interface ServiceResult<T> {
    success: boolean;
    data?: T;
    error?: ChecklistsServiceError;
}

export interface SyncResult {
    success: boolean;
    syncedItems: number;
    errors: ChecklistsServiceError[];
}

class ChecklistsService {
    private api: ApiService = apiService;
    private checklistSlug: string;
    private checklistName: string;
    private type: 'local' | 'api';
    private enableOfflineSync: boolean;
    private retryAttempts: number;
    private pendingSync: boolean = false;
    private storageKey: string; // Storage key for this specific checklist

    constructor(config: ChecklistsServiceConfig) {
        this.checklistName = config.checklistName;
        this.checklistSlug = createSlug(config.checklistName);
        this.type = config.type;
        this.enableOfflineSync = config.enableOfflineSync ?? false;
        this.retryAttempts = config.retryAttempts ?? 3;
        this.storageKey = `checklist_${this.checklistSlug}`; // Each checklist has its own storage key
        
        if (!this.checklistSlug) {
            throw new ChecklistsServiceError('Invalid checklist name provided', 'INVALID_NAME');
        }
    }

    /**
     * Get the current checklist
     */
    async getChecklist(): Promise<ServiceResult<Checklist | null>> {
        try {
            if (this.type === 'local') {
                const json = await AsyncStorage.getItem(this.storageKey);
                const checklist = json ? JSON.parse(json) : null;
                
                // Migrate items to include createdAt if missing
                if (checklist && checklist.items) {
                    checklist.items = checklist.items.map((item: any) => {
                        if (!item.createdAt) {
                            return { ...item, createdAt: item.updatedAt || new Date().toISOString() };
                        }
                        return item;
                    });
                    // Save the migrated version
                    await AsyncStorage.setItem(this.storageKey, JSON.stringify(checklist));
                }
                
                return { success: true, data: checklist };
            } else {
                if (!this.api) {
                    throw new ChecklistsServiceError('API service not configured', 'API_NOT_CONFIGURED');
                }

                const response = await this.api.get<{ success: boolean; checklist?: Checklist; error?: string }>(`/api/checklists/${this.checklistSlug}`);


                if (!response.success) {
                    // If checklist doesn't exist on backend, it's not an error - return null
                    if (response.error?.includes('not found') || 
                        response.error?.includes('404') || 
                        response.error?.includes('Checklist not found')) {
                        return { success: true, data: null };
                    }
                    throw new ChecklistsServiceError(
                        response.error || 'Failed to fetch checklist',
                        'API_ERROR'
                    );
                }

                // Extract checklist from response - it's at the top level
                const checklist = (response as any).checklist;
                
                if (!checklist) {
                    return { success: true, data: null };
                }
                
                return { success: true, data: checklist };
            }
        } catch (error) {
            // Check if this is a 404 or "not found" error that should be treated as null result
            if (error instanceof Error && (
                error.message.includes('404') || 
                error.message.includes('not found') || 
                error.message.includes('Checklist not found'))) {
                return { success: true, data: null };
            }
            
            const serviceError = this.handleError(error, 'Failed to get checklist');
            return { success: false, error: serviceError };
        }
    }

    /**
     * Save the current checklist
     */
    async saveChecklist(checklist: Checklist): Promise<ServiceResult<void>> {
        try {
            if (this.type === 'local') {
                await AsyncStorage.setItem(this.storageKey, JSON.stringify(checklist));
                return { success: true };
            } else {
                if (!this.api) {
                    throw new ChecklistsServiceError('API service not configured', 'API_NOT_CONFIGURED');
                }

                const response = await this.api.put(`/api/checklists/${this.checklistSlug}`, checklist);

                if (!response.success) {
                    throw new ChecklistsServiceError(
                        response.error || 'Failed to save checklist',
                        'API_ERROR'
                    );
                }

                return { success: true };
            }
        } catch (error) {
            const serviceError = this.handleError(error, 'Failed to save checklist');
            return { success: false, error: serviceError };
        }
    }

    /**
     * Create or get the current checklist
     */
    async createOrGetChecklist(mode: StorageMode = 'local'): Promise<ServiceResult<Checklist>> {
        try {
            // First try to get existing checklist
            const existingResult = await this.getChecklist();
            if (!existingResult.success) {
                // If the error is NOT a "not found" error, then it's a real error
                const isNotFoundError = existingResult.error?.message.includes('not found') || 
                                       existingResult.error?.message.includes('404') ||
                                       existingResult.error?.code === 'CHECKLIST_NOT_FOUND';
                
                if (!isNotFoundError) {
                    throw existingResult.error || new ChecklistsServiceError('Failed to check existing checklist');
                }
                // If it's a "not found" error, continue to create new checklist
            } else if (existingResult.data) {
                // Checklist exists, return it
                return { success: true, data: existingResult.data };
            }

            // Create new checklist if it doesn't exist
            if (this.type === 'api') {
                // For API type, try to create - if it already exists, try to get it again
                if (!this.api) {
                    throw new ChecklistsServiceError('API service not configured', 'API_NOT_CONFIGURED');
                }

                const response = await this.api.post<{ success: boolean; checklist?: Checklist; error?: string }>('/api/checklists', {
                    name: this.checklistName,
                    mode
                });

                if (!response.success) {
                    // If checklist already exists, try to get it again with cache busting
                    if (response.error?.includes('already exists') || response.error?.includes('409')) {
                        // Add a cache-busting parameter to force a fresh request
                        const cacheBustingEndpoint = `/api/checklists/${this.checklistSlug}?_t=${Date.now()}`;
                        const freshResponse = await this.api.get<{ success: boolean; checklist?: Checklist }>(cacheBustingEndpoint);
                        
                        if (freshResponse.success && (freshResponse as any).checklist) {
                            return { success: true, data: (freshResponse as any).checklist };
                        }
                        
                        // If still can't get it, return a helpful error
                        throw new ChecklistsServiceError(
                            `Checklist '${this.checklistName}' already exists but could not be retrieved. Please try refreshing the app.`,
                            'CHECKLIST_EXISTS_BUT_NOT_ACCESSIBLE'
                        );
                    }
                    
                    throw new ChecklistsServiceError(
                        response.error || 'Failed to create checklist',
                        'API_ERROR'
                    );
                }

                const checklist = (response as any).checklist;
                if (!checklist) {
                    throw new ChecklistsServiceError('No checklist data returned from API');
                }

                return { success: true, data: checklist };
            } else {
                // For local type, create and save locally
                const now = new Date().toISOString();
                const newChecklist: Checklist = {
                    id: createUUID(),
                    slug: this.checklistSlug,
                    name: this.checklistName,
                    mode,
                    items: [],
                    createdAt: now,
                    updatedAt: now
                };

                const saveResult = await this.saveChecklist(newChecklist);
                if (!saveResult.success) {
                    throw saveResult.error || new ChecklistsServiceError('Failed to save new checklist');
                }

                return { success: true, data: newChecklist };
            }
        } catch (error) {
            const serviceError = this.handleError(error, 'Failed to create/get checklist');
            return { success: false, error: serviceError };
        }
    }

    /**
     * Delete the current checklist
     */
    async deleteChecklist(): Promise<ServiceResult<void>> {
        try {
            if (this.type === 'api') {
                if (!this.api) {
                    throw new ChecklistsServiceError('API service not configured', 'API_NOT_CONFIGURED');
                }

                const response = await this.api.delete(`/api/checklists/${this.checklistSlug}`);

                if (!response.success) {
                    throw new ChecklistsServiceError(
                        response.error || 'Failed to delete checklist',
                        'API_ERROR'
                    );
                }
            } else {
                await AsyncStorage.removeItem(this.storageKey);
            }

            return { success: true };
        } catch (error) {
            const serviceError = this.handleError(error, 'Failed to delete checklist');
            return { success: false, error: serviceError };
        }
    }

    /**
     * Add an item to the current checklist
     */
    async addItem(title: string): Promise<ServiceResult<ChecklistItem>> {
        try {
            if (this.type === 'api') {
                // For API type, use the dedicated add item endpoint
                if (!this.api) {
                    throw new ChecklistsServiceError('API service not configured', 'API_NOT_CONFIGURED');
                }

                const response = await this.api.post<{ success: boolean; item?: ChecklistItem; error?: string }>(`/api/checklists/${this.checklistSlug}/items`, {
                    title
                });

                if (!response.success) {
                    throw new ChecklistsServiceError(
                        response.error || 'Failed to add item',
                        'API_ERROR'
                    );
                }

                const item = (response as any).item;
                if (!item) {
                    throw new ChecklistsServiceError('No item data returned from API');
                }

                return { success: true, data: item };
            } else {
                // For local type, use the existing logic
                const result = await this.getChecklist();
                if (!result.success) {
                    throw result.error || new ChecklistsServiceError('Failed to get checklist');
                }

                if (!result.data) {
                    throw new ChecklistNotFoundError(this.checklistSlug);
                }

                const checklist = result.data;
                const newItem: ChecklistItem = {
                    id: createUUID(),
                    title,
                    completed: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                checklist.items.push(newItem);
                checklist.updatedAt = new Date().toISOString();

                const saveResult = await this.saveChecklist(checklist);
                if (!saveResult.success) {
                    throw saveResult.error || new ChecklistsServiceError('Failed to save checklist');
                }

                return { success: true, data: newItem };
            }
        } catch (error) {
            const serviceError = this.handleError(error, 'Failed to add item');
            return { success: false, error: serviceError };
        }
    }

    /**
     * Toggle item completion status in the current checklist
     */
    async toggleItem(itemId: string): Promise<ServiceResult<ChecklistItem>> {
        try {
            if (this.type === 'api') {
                // For API type, use the dedicated update item endpoint
                if (!this.api) {
                    throw new ChecklistsServiceError('API service not configured', 'API_NOT_CONFIGURED');
                }

                // First get the current item to know its completion status
                const result = await this.getChecklist();
                if (!result.success || !result.data) {
                    throw result.error || new ChecklistNotFoundError(this.checklistSlug);
                }

                const item = result.data.items.find(i => i.id === itemId);
                if (!item) {
                    throw new ItemNotFoundError(itemId);
                }

                const response = await this.api.put<{ success: boolean; item?: ChecklistItem; error?: string }>(`/api/checklists/${this.checklistSlug}/items/${itemId}`, {
                    completed: !item.completed
                });

                if (!response.success) {
                    throw new ChecklistsServiceError(
                        response.error || 'Failed to update item',
                        'API_ERROR'
                    );
                }

                const updatedItem = (response as any).item;
                if (!updatedItem) {
                    throw new ChecklistsServiceError('No item data returned from API');
                }

                return { success: true, data: updatedItem };
            } else {
                // For local type, use the existing logic
                const result = await this.getChecklist();
                if (!result.success) {
                    throw result.error || new ChecklistsServiceError('Failed to get checklist');
                }

                if (!result.data) {
                    throw new ChecklistNotFoundError(this.checklistSlug);
                }

                const checklist = result.data;
                const item = checklist.items.find(i => i.id === itemId);
                if (!item) {
                    throw new ItemNotFoundError(itemId);
                }

                item.completed = !item.completed;
                item.updatedAt = new Date().toISOString();
                checklist.updatedAt = new Date().toISOString();

                const saveResult = await this.saveChecklist(checklist);
                if (!saveResult.success) {
                    throw saveResult.error || new ChecklistsServiceError('Failed to save checklist');
                }

                return { success: true, data: item };
            }
        } catch (error) {
            const serviceError = this.handleError(error, 'Failed to toggle item');
            return { success: false, error: serviceError };
        }
    }

    /**
     * Delete an item from the current checklist
     */
    async deleteItem(itemId: string): Promise<ServiceResult<void>> {
        try {
            if (this.type === 'api') {
                // For API type, use the dedicated delete item endpoint
                if (!this.api) {
                    throw new ChecklistsServiceError('API service not configured', 'API_NOT_CONFIGURED');
                }

                const response = await this.api.delete(`/api/checklists/${this.checklistSlug}/items/${itemId}`);

                if (!response.success) {
                    throw new ChecklistsServiceError(
                        response.error || 'Failed to delete item',
                        'API_ERROR'
                    );
                }

                return { success: true };
            } else {
                // For local type, use the existing logic
                const result = await this.getChecklist();
                if (!result.success) {
                    throw result.error || new ChecklistsServiceError('Failed to get checklist');
                }

                if (!result.data) {
                    throw new ChecklistNotFoundError(this.checklistSlug);
                }

                const checklist = result.data;
                const itemExists = checklist.items.some(i => i.id === itemId);
                if (!itemExists) {
                    throw new ItemNotFoundError(itemId);
                }

                checklist.items = checklist.items.filter(i => i.id !== itemId);
                checklist.updatedAt = new Date().toISOString();

                const saveResult = await this.saveChecklist(checklist);
                if (!saveResult.success) {
                    throw saveResult.error || new ChecklistsServiceError('Failed to save checklist');
                }

                return { success: true };
            }
        } catch (error) {
            const serviceError = this.handleError(error, 'Failed to delete item');
            return { success: false, error: serviceError };
        }
    }

    /**
     * Sync pending changes to the API
     */
    async syncPendingChanges(): Promise<SyncResult> {
        const errors: ChecklistsServiceError[] = [];
        let syncedItems = 0;

        if (!this.pendingSync) {
            return { success: true, syncedItems: 0, errors: [] };
        }

        try {
            const result = await this.getChecklist();
            if (!result.success || !result.data) {
                throw result.error || new ChecklistsServiceError('Failed to get checklist');
            }

            const checklist = result.data;
            if (checklist.mode !== 'api') {
                return { success: true, syncedItems: 0, errors: [] };
            }

            // Attempt to sync with retry logic
            let lastError: Error | null = null;
            for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
                try {
                    if (!this.api) {
                        throw new ChecklistsServiceError('API service not configured', 'API_NOT_CONFIGURED');
                    }

                    const response = await this.api.put(`/api/checklists/${this.checklistSlug}`, checklist);

                    if (!response.success) {
                        throw new ChecklistsServiceError(
                            response.error || 'Failed to sync checklist',
                            'API_ERROR'
                        );
                    }

                    syncedItems = 1;
                    this.pendingSync = false; // Clear sync flag
                    break; // Success, exit retry loop
                } catch (error) {
                    lastError = error as Error;
                    if (attempt < this.retryAttempts) {
                        // Wait before retry with exponential backoff
                        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                    }
                }
            }

            if (lastError) {
                errors.push(this.handleError(lastError, `Failed to sync checklist ${this.checklistSlug}`));
            }
        } catch (error) {
            errors.push(this.handleError(error, `Failed to sync checklist ${this.checklistSlug}`));
        }

        return {
            success: errors.length === 0,
            syncedItems,
            errors
        };
    }

    // Note: getChecklist() method already exists above - this is the main method now

    /**
     * Update an item's title
     */
    async updateItem(itemId: string, newTitle: string): Promise<ServiceResult<ChecklistItem>> {
        try {
            if (this.type === 'api') {
                // For API type, use the dedicated update item endpoint
                if (!this.api) {
                    throw new ChecklistsServiceError('API service not configured', 'API_NOT_CONFIGURED');
                }

                const response = await this.api.put<{ success: boolean; item?: ChecklistItem; error?: string }>(`/api/checklists/${this.checklistSlug}/items/${itemId}`, {
                    title: newTitle.trim()
                });

                if (!response.success) {
                    throw new ChecklistsServiceError(
                        response.error || 'Failed to update item',
                        'API_ERROR'
                    );
                }

                const updatedItem = (response as any).item;
                if (!updatedItem) {
                    throw new ChecklistsServiceError('No item data returned from API');
                }

                return { success: true, data: updatedItem };
            } else {
                // For local type, use the existing logic
                const result = await this.getChecklist();
                if (!result.success || !result.data) {
                    throw result.error || new ChecklistsServiceError('Failed to get checklist');
                }

                const checklist = result.data;
                const item = checklist.items.find(i => i.id === itemId);
                if (!item) {
                    throw new ItemNotFoundError(itemId);
                }

                item.title = newTitle.trim();
                item.updatedAt = new Date().toISOString();
                checklist.updatedAt = new Date().toISOString();

                const saveResult = await this.saveChecklist(checklist);
                if (!saveResult.success) {
                    throw saveResult.error || new ChecklistsServiceError('Failed to save checklist');
                }

                return { success: true, data: item };
            }
        } catch (error) {
            const serviceError = this.handleError(error, 'Failed to update item');
            return { success: false, error: serviceError };
        }
    }

    /**
     * Duplicate an item
     */
    async duplicateItem(itemId: string): Promise<ServiceResult<ChecklistItem>> {
        try {
            const result = await this.getChecklist();
            if (!result.success || !result.data) {
                throw result.error || new ChecklistsServiceError('Failed to get checklist');
            }

            const checklist = result.data;
            const originalItem = checklist.items.find(i => i.id === itemId);
            if (!originalItem) {
                throw new ItemNotFoundError(itemId);
            }

            const duplicatedItem: ChecklistItem = {
                id: createUUID(),
                title: `${originalItem.title} (Copy)`,
                completed: false, // Always start as incomplete
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Insert after the original item
            const originalIndex = checklist.items.findIndex(i => i.id === itemId);
            checklist.items.splice(originalIndex + 1, 0, duplicatedItem);
            checklist.updatedAt = new Date().toISOString();

            const saveResult = await this.saveChecklist(checklist);
            if (!saveResult.success) {
                throw saveResult.error || new ChecklistsServiceError('Failed to save checklist');
            }

            // Queue for sync if offline sync is enabled
            if (this.enableOfflineSync && checklist.mode === 'api') {
                this.queueForSync();
            }

            return { success: true, data: duplicatedItem };
        } catch (error) {
            const serviceError = this.handleError(error, 'Failed to duplicate item');
            return { success: false, error: serviceError };
        }
    }

    /**
     * Update checklist metadata
     */
    async updateChecklist(updates: Partial<Pick<Checklist, 'name' | 'mode'>>): Promise<ServiceResult<Checklist>> {
        try {
            const result = await this.getChecklist();
            if (!result.success) {
                throw result.error || new ChecklistsServiceError('Failed to get checklist');
            }

            if (!result.data) {
                throw new ChecklistNotFoundError(this.checklistSlug);
            }

            const updatedChecklist = {
                ...result.data,
                ...updates,
                updatedAt: new Date().toISOString()
            };

            const saveResult = await this.saveChecklist(updatedChecklist);
            if (!saveResult.success) {
                throw saveResult.error || new ChecklistsServiceError('Failed to save checklist');
            }

            return { success: true, data: updatedChecklist };
        } catch (error) {
            const serviceError = this.handleError(error, 'Failed to update checklist');
            return { success: false, error: serviceError };
        }
    }

    /**
     * Queue the checklist for sync
     */
    private queueForSync(): void {
        if (this.enableOfflineSync) {
            this.pendingSync = true;
        }
    }

    /**
     * Handle and transform errors into service-specific errors
     */
    private handleError(error: unknown, context: string): ChecklistsServiceError {
        if (error instanceof ChecklistsServiceError) {
            return error;
        }

        if (error instanceof Error) {
            return new ChecklistsServiceError(
                `${context}: ${error.message}`,
                'UNKNOWN_ERROR',
                error
            );
        }

        return new ChecklistsServiceError(
            `${context}: Unknown error occurred`,
            'UNKNOWN_ERROR'
        );
    }

    /**
     * Get sync status
     */
    getSyncStatus(): { hasPendingChanges: boolean } {
        return {
            hasPendingChanges: this.pendingSync
        };
    }

    /**
     * Clear pending sync flag
     */
    clearPendingSync(): void {
        this.pendingSync = false;
    }
}

export default ChecklistsService;

/*
Usage Example:

import ChecklistsService from './checklistsService';

// Create service instances for specific checklists
const groceryListService = new ChecklistsService({
  checklistName: 'Grocery List',
  type: 'local'
});

const workTasksService = new ChecklistsService({
  checklistName: 'Work Tasks',
  type: 'api',
  enableOfflineSync: true,
  retryAttempts: 3
});

// Usage examples:
async function example() {
  // Get or create the checklist
  const result = await groceryListService.createOrGetChecklist('local');
  if (result.success) {
    console.log('Checklist:', result.data);
  } else {
    console.error('Error:', result.error?.message);
  }

  // Add an item
  const addResult = await groceryListService.addItem('Buy milk');
  if (addResult.success) {
    console.log('Added item:', addResult.data);
  }

  // Toggle an item
  if (addResult.success) {
    const toggleResult = await groceryListService.toggleItem(addResult.data!.id);
    if (toggleResult.success) {
      console.log('Toggled item:', toggleResult.data);
    }
  }

  // Sync pending changes (for API service)
  const syncResult = await workTasksService.syncPendingChanges();
  console.log(`Synced ${syncResult.syncedItems} items, ${syncResult.errors.length} errors`);

  // Check sync status
  const syncStatus = workTasksService.getSyncStatus();
  console.log('Has pending changes:', syncStatus.hasPendingChanges);
}
*/