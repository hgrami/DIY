// apps/mobile/src/hooks/useChecklists.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import ChecklistsService from '../services/checklistsService';
import { Checklist } from '../@types';
import { ServiceResult } from '../services/checklistsService';

export const useChecklists = (checklistName: string, type: 'local' | 'api' = 'local') => {
    const serviceRef = useRef<ChecklistsService | null>(null);
    const [checklist, setChecklist] = useState<Checklist | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initialize service only once
    if (!serviceRef.current) {
        serviceRef.current = new ChecklistsService({
            checklistName,
            type,
            enableOfflineSync: type === 'api'
        });
    }

    const service = serviceRef.current;

    const handleServiceResult = useCallback(<T>(result: ServiceResult<T>, successCallback?: (data: T) => void) => {
        if (result.success && result.data !== undefined) {
            setError(null);
            if (successCallback) {
                successCallback(result.data);
            }
            return result.data;
        } else {
            const errorMessage = result.error?.message || 'Unknown error occurred';
            setError(errorMessage);
            console.error('Service error:', errorMessage);
            return null;
        }
    }, []);

    useEffect(() => {
        const loadChecklist = async () => {
            try {
                setLoading(true);
                setError(null);
                
                // Get or create the checklist
                const result = await service.createOrGetChecklist(type);
                handleServiceResult(result, setChecklist);
            } catch (error) {
                console.error('Failed to load checklist:', error);
                setError(error instanceof Error ? error.message : 'Failed to load checklist');
            } finally {
                setLoading(false);
            }
        };

        loadChecklist();
    }, [checklistName, type, service, handleServiceResult]);

    const addItem = useCallback(async (title: string) => {
        if (!checklist || !service) return { success: false, error: new Error('Checklist not ready') };

        const result = await service.addItem(title);
        const newItem = handleServiceResult(result);
        
        if (newItem) {
            setChecklist(prev => prev ? {
                ...prev,
                items: [...prev.items, newItem],
                updatedAt: new Date().toISOString()
            } : null);
        }
        
        return result;
    }, [checklist, service, handleServiceResult]);

    const toggleItem = useCallback(async (itemId: string) => {
        if (!checklist || !service) return { success: false, error: new Error('Checklist not ready') };

        const result = await service.toggleItem(itemId);
        const updatedItem = handleServiceResult(result);
        
        if (updatedItem) {
            setChecklist(prev => prev ? {
                ...prev,
                items: prev.items.map(item =>
                    item.id === itemId ? updatedItem : item
                ),
                updatedAt: new Date().toISOString()
            } : null);
        }
        
        return result;
    }, [checklist, service, handleServiceResult]);

    const deleteItem = useCallback(async (itemId: string) => {
        if (!checklist || !service) return { success: false, error: new Error('Checklist not ready') };

        const result = await service.deleteItem(itemId);
        
        if (result.success) {
            setChecklist(prev => prev ? {
                ...prev,
                items: prev.items.filter(item => item.id !== itemId),
                updatedAt: new Date().toISOString()
            } : null);
        }
        
        return result;
    }, [checklist, service]);

    const updateChecklist = useCallback(async (updates: Partial<Pick<Checklist, 'name' | 'mode'>>) => {
        if (!checklist || !service) return { success: false, error: new Error('Checklist not ready') };

        const result = await service.updateChecklist(updates);
        const updatedChecklist = handleServiceResult(result);
        
        if (updatedChecklist) {
            setChecklist(updatedChecklist);
        }
        
        return result;
    }, [checklist, service, handleServiceResult]);

    const syncChanges = useCallback(async () => {
        if (!service) return { success: false, syncedItems: 0, errors: [] };
        return await service.syncPendingChanges();
    }, [service]);

    const getSyncStatus = useCallback(() => {
        if (!service) return { hasPendingChanges: false };
        return service.getSyncStatus();
    }, [service]);

    const updateItem = useCallback(async (itemId: string, newTitle: string) => {
        if (!checklist || !service) return { success: false, error: new Error('Checklist not ready') };

        const result = await service.updateItem(itemId, newTitle);
        const updatedItem = handleServiceResult(result);
        
        if (updatedItem) {
            setChecklist(prev => prev ? {
                ...prev,
                items: prev.items.map(item =>
                    item.id === itemId ? updatedItem : item
                ),
                updatedAt: new Date().toISOString()
            } : null);
        }
        
        return result;
    }, [checklist, service, handleServiceResult]);

    const duplicateItem = useCallback(async (itemId: string) => {
        if (!checklist || !service) return { success: false, error: new Error('Checklist not ready') };

        const result = await service.duplicateItem(itemId);
        
        if (result.success) {
            // Reload the entire checklist to get the updated item order
            const refreshResult = await service.getChecklist();
            if (refreshResult.success && refreshResult.data) {
                setChecklist(refreshResult.data);
            }
        }
        
        return result;
    }, [checklist, service]);

    const deleteChecklist = useCallback(async () => {
        if (!service) return { success: false, error: new Error('Service not ready') };
        return await service.deleteChecklist();
    }, [service]);

    return {
        checklist,
        loading,
        error,
        addItem,
        toggleItem,
        deleteItem,
        updateItem,
        duplicateItem,
        updateChecklist,
        syncChanges,
        getSyncStatus,
        deleteChecklist
    };
};
