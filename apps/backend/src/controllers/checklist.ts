import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';

// Define types locally to match mobile app structure
export type StorageMode = 'api' | 'local';

export interface ChecklistItem {
    id: string;
    title: string;
    completed: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Checklist {
    id: string;
    slug: string;
    name: string;
    mode: StorageMode;
    items: ChecklistItem[];
    createdAt: string;
    updatedAt: string;
}

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

const prisma = new PrismaClient();

// Helper function to create slug from name
const createSlug = (name: string): string => {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove non-alphanumeric characters except spaces and hyphens
        .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, and multiple hyphens with single hyphen
        .replace(/^-+|-+$/g, ''); // Remove leading and trailing hyphens
};

// Transform database models to API format
const transformChecklist = (dbChecklist: {
    id: string;
    slug: string;
    name: string;
    mode: string;
    items?: Array<{
        id: string;
        title: string;
        completed: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    createdAt: Date;
    updatedAt: Date;
}): Checklist => ({
    id: dbChecklist.id,
    slug: dbChecklist.slug,
    name: dbChecklist.name,
    mode: dbChecklist.mode as 'api' | 'local',
    items: dbChecklist.items?.map(transformChecklistItem) || [],
    createdAt: dbChecklist.createdAt.toISOString(),
    updatedAt: dbChecklist.updatedAt.toISOString(),
});

const transformChecklistItem = (dbItem: {
    id: string;
    title: string;
    completed: boolean;
    createdAt: Date;
    updatedAt: Date;
}): ChecklistItem => ({
    id: dbItem.id,
    title: dbItem.title,
    completed: dbItem.completed,
    createdAt: dbItem.createdAt.toISOString(),
    updatedAt: dbItem.updatedAt.toISOString(),
});

export const checklistController = {
    // GET /api/checklists - Get all user's checklists
    async getUserChecklists(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const checklists = await prisma.checklist.findMany({
                where: { userId },
                include: { 
                    items: {
                        orderBy: { createdAt: 'asc' }
                    }
                },
                orderBy: { updatedAt: 'desc' }
            });

            const transformedChecklists = checklists.map(transformChecklist);
            
            return res.json({ 
                success: true, 
                checklists: transformedChecklists 
            });
        } catch (error) {
            console.error('Error fetching user checklists:', error);
            return res.status(500).json({ 
                success: false, 
                error: 'Internal server error' 
            });
        }
    },

    // GET /api/checklists/:slug - Get specific checklist by slug
    async getChecklist(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const { slug } = req.params;

            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const checklist = await prisma.checklist.findFirst({
                where: { 
                    slug,
                    userId // Ensure user can only access their own checklists
                },
                include: { 
                    items: {
                        orderBy: { createdAt: 'asc' }
                    }
                }
            });

            if (!checklist) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Checklist not found' 
                });
            }

            const transformedChecklist = transformChecklist(checklist);

            return res.json({ 
                success: true, 
                checklist: transformedChecklist 
            });
        } catch (error) {
            console.error('Error fetching checklist:', error);
            return res.status(500).json({ 
                success: false, 
                error: 'Internal server error' 
            });
        }
    },

    // POST /api/checklists - Create new checklist
    async createChecklist(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const { name, mode = 'api' }: CreateChecklistRequest = req.body;

            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            if (!name?.trim()) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Checklist name is required' 
                });
            }

            const slug = createSlug(name);
            if (!slug) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Invalid checklist name' 
                });
            }

            // Check if checklist with this slug already exists for user
            const existingChecklist = await prisma.checklist.findFirst({
                where: { userId, slug }
            });

            if (existingChecklist) {
                return res.status(409).json({ 
                    success: false, 
                    error: 'Checklist with this name already exists' 
                });
            }

            const checklist = await prisma.checklist.create({
                data: {
                    slug,
                    name: name.trim(),
                    mode,
                    userId
                },
                include: { 
                    items: {
                        orderBy: { createdAt: 'asc' }
                    }
                }
            });

            const transformedChecklist = transformChecklist(checklist);

            return res.status(201).json({ 
                success: true, 
                checklist: transformedChecklist 
            });
        } catch (error) {
            console.error('Error creating checklist:', error);
            return res.status(500).json({ 
                success: false, 
                error: 'Internal server error' 
            });
        }
    },

    // PUT /api/checklists/:slug - Update or create checklist (upsert)
    async upsertChecklist(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const { slug } = req.params;
            const checklistData: Checklist = req.body;


            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            // Validate the checklist data
            if (!checklistData.name?.trim()) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Checklist name is required' 
                });
            }

            // Use transaction to ensure data consistency
            const result = await prisma.$transaction(async (tx) => {
                // Find existing checklist
                let checklist = await tx.checklist.findFirst({
                    where: { userId, slug },
                    include: { items: true }
                });

                if (checklist) {
                    // Update existing checklist
                    checklist = await tx.checklist.update({
                        where: { id: checklist!.id },
                        data: {
                            name: checklistData.name.trim(),
                            mode: checklistData.mode,
                            updatedAt: new Date()
                        },
                        include: { items: true }
                    });

                    // Get existing item IDs
                    const existingItemIds = new Set(checklist.items.map(item => item.id));
                    const newItemIds = new Set(checklistData.items.map(item => item.id));

                    // Delete items that are no longer present
                    const itemsToDelete = checklist.items.filter(item => !newItemIds.has(item.id));
                    if (itemsToDelete.length > 0) {
                        await tx.checklistItem.deleteMany({
                            where: { 
                                id: { in: itemsToDelete.map(item => item.id) }
                            }
                        });
                    }

                    // Upsert items
                    for (const item of checklistData.items) {
                        if (existingItemIds.has(item.id)) {
                            // Update existing item
                            await tx.checklistItem.update({
                                where: { id: item.id },
                                data: {
                                    title: item.title,
                                    completed: item.completed,
                                    updatedAt: new Date(item.updatedAt)
                                }
                            });
                        } else {
                            // Create new item
                            await tx.checklistItem.create({
                                data: {
                                    id: item.id,
                                    title: item.title,
                                    completed: item.completed,
                                    checklistId: checklist!.id,
                                    createdAt: new Date(item.createdAt),
                                    updatedAt: new Date(item.updatedAt)
                                }
                            });
                        }
                    }
                } else {
                    // Create new checklist
                    checklist = await tx.checklist.create({
                        data: {
                            id: checklistData.id,
                            slug,
                            name: checklistData.name.trim(),
                            mode: checklistData.mode,
                            userId,
                            createdAt: new Date(checklistData.createdAt),
                            updatedAt: new Date(checklistData.updatedAt)
                        },
                        include: { items: true }
                    });

                    // Create all items
                    if (checklistData.items.length > 0) {
                        await tx.checklistItem.createMany({
                            data: checklistData.items.map((item: ChecklistItem) => ({
                                id: item.id,
                                title: item.title,
                                completed: item.completed,
                                checklistId: checklist!.id,
                                createdAt: new Date(item.createdAt),
                                updatedAt: new Date(item.updatedAt)
                            }))
                        });
                    }
                }

                // Fetch updated checklist with items
                return await tx.checklist.findUnique({
                    where: { id: checklist!.id },
                    include: { 
                        items: {
                            orderBy: { createdAt: 'asc' }
                        }
                    }
                });
            });

            if (!result) {
                throw new Error('Failed to create or update checklist');
            }
            
            const transformedChecklist = transformChecklist(result);

            return res.json({ 
                success: true, 
                checklist: transformedChecklist 
            });
        } catch (error) {
            console.error('Error upserting checklist:', error);
            return res.status(500).json({ 
                success: false, 
                error: 'Internal server error' 
            });
        }
    },

    // DELETE /api/checklists/:slug - Delete checklist
    async deleteChecklist(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const { slug } = req.params;

            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const checklist = await prisma.checklist.findFirst({
                where: { userId, slug }
            });

            if (!checklist) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Checklist not found' 
                });
            }

            await prisma.checklist.delete({
                where: { id: checklist.id }
            });

            return res.json({ 
                success: true, 
                message: 'Checklist deleted successfully' 
            });
        } catch (error) {
            console.error('Error deleting checklist:', error);
            return res.status(500).json({ 
                success: false, 
                error: 'Internal server error' 
            });
        }
    },

    // POST /api/checklists/:slug/items - Add item to checklist
    async addItem(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const { slug } = req.params;
            const { title }: AddItemRequest = req.body;

            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            if (!title?.trim()) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Item title is required' 
                });
            }

            const checklist = await prisma.checklist.findFirst({
                where: { userId, slug }
            });

            if (!checklist) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Checklist not found' 
                });
            }

            const item = await prisma.checklistItem.create({
                data: {
                    title: title.trim(),
                    checklistId: checklist.id
                }
            });

            // Update checklist timestamp
            await prisma.checklist.update({
                where: { id: checklist!.id },
                data: { updatedAt: new Date() }
            });

            const transformedItem = transformChecklistItem(item);

            return res.status(201).json({ 
                success: true, 
                item: transformedItem 
            });
        } catch (error) {
            console.error('Error adding item:', error);
            return res.status(500).json({ 
                success: false, 
                error: 'Internal server error' 
            });
        }
    },

    // PUT /api/checklists/:slug/items/:itemId - Update item
    async updateItem(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const { slug, itemId } = req.params;
            const { title, completed }: UpdateItemRequest = req.body;

            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const checklist = await prisma.checklist.findFirst({
                where: { userId, slug }
            });

            if (!checklist) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Checklist not found' 
                });
            }

            const existingItem = await prisma.checklistItem.findFirst({
                where: { id: itemId, checklistId: checklist.id }
            });

            if (!existingItem) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Item not found' 
                });
            }

            const updateData: any = {};
            if (title !== undefined) updateData.title = title.trim();
            if (completed !== undefined) updateData.completed = completed;

            const item = await prisma.checklistItem.update({
                where: { id: itemId },
                data: updateData
            });

            // Update checklist timestamp
            await prisma.checklist.update({
                where: { id: checklist!.id },
                data: { updatedAt: new Date() }
            });

            const transformedItem = transformChecklistItem(item);

            return res.json({ 
                success: true, 
                item: transformedItem 
            });
        } catch (error) {
            console.error('Error updating item:', error);
            return res.status(500).json({ 
                success: false, 
                error: 'Internal server error' 
            });
        }
    },

    // DELETE /api/checklists/:slug/items/:itemId - Delete item
    async deleteItem(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const { slug, itemId } = req.params;

            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const checklist = await prisma.checklist.findFirst({
                where: { userId, slug }
            });

            if (!checklist) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Checklist not found' 
                });
            }

            const existingItem = await prisma.checklistItem.findFirst({
                where: { id: itemId, checklistId: checklist.id }
            });

            if (!existingItem) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Item not found' 
                });
            }

            await prisma.checklistItem.delete({
                where: { id: itemId }
            });

            // Update checklist timestamp
            await prisma.checklist.update({
                where: { id: checklist!.id },
                data: { updatedAt: new Date() }
            });

            return res.json({ 
                success: true, 
                message: 'Item deleted successfully' 
            });
        } catch (error) {
            console.error('Error deleting item:', error);
            return res.status(500).json({ 
                success: false, 
                error: 'Internal server error' 
            });
        }
    }
};