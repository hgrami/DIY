// Project types
export interface Project {
  id: string;
  shortId: string;
  userId: string;
  title: string;
  goal?: string;
  description?: string;
  deadline?: Date;
  config: ProjectConfig;
  interviewContext?: any; // JSON data for AI interview responses
  createdAt: Date;
  updatedAt: Date;
  inspirationLinks: InspirationLink[];
  materials: MaterialItem[];
  checklistItems: ProjectChecklistItem[];
  notes: Note[];
  photos: ProjectPhoto[];
  aiChatHistory: AiChatMessage[];
}

export interface ProjectConfig {
  aiEnabled: boolean;
  showInspiration: boolean;
  showMaterials: boolean;
  showChecklist: boolean;
  showNotes: boolean;
  showPhotos: boolean;
}

export interface InspirationLink {
  id: string;
  projectId: string;
  title: string;
  url: string;
  imageUrl?: string;
  source?: string;
  difficulty?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MaterialItem {
  id: string;
  projectId: string;
  name: string;
  quantity: string;
  estimatedPrice?: number;
  affiliateUrl?: string;
  checked: boolean;
  thumbnail?: string;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Note {
  id: string;
  projectId: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectPhoto {
  id: string;
  projectId: string;
  stage: 'before' | 'during' | 'after';
  url: string;
  caption?: string;
  uploadedAt: Date;
}

export interface ProjectChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  projectId?: string;
  dueDate?: Date;
  createdBy?: 'user' | 'ai';
  order?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AiChatMessage {
  id: string;
  projectId: string;
  role: 'user' | 'assistant';
  content: string;
  functionCall?: any;
  createdAt: Date;
}

export interface ProjectStats {
  counts: {
    inspirationLinks: number;
    materials: number;
    checklistItems: number;
    notes: number;
    photos: number;
  };
  budget: {
    total: number;
    spent: number;
  };
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
}

// API Response types
export interface CreateProjectRequest {
  title: string;
  goal?: string;
  description?: string;
  deadline?: Date;
  config?: Partial<ProjectConfig>;
  inspiration?: Omit<InspirationLink, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[];
  materials?: Omit<MaterialItem, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'checked'>[];
  checklists?: {
    title: string;
    items: Omit<ProjectChecklistItem, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[];
  }[];
}

export type CreateProjectData = CreateProjectRequest;

export interface UpdateProjectRequest {
  title?: string;
  goal?: string;
  description?: string;
  deadline?: Date;
  config?: Partial<ProjectConfig>;
}

export interface AiChatRequest {
  message: string;
}

export interface AiChatResponse {
  message?: string;
  functionCall?: {
    name: string;
    arguments: any;
    result: any;
  };
}

// Individual resource types for adding to projects
export interface AddInspirationRequest {
  title: string;
  url: string;
  imageUrl?: string;
  description?: string;
  source?: string;
  difficulty?: string;
  tags?: string[];
}

export interface AddMaterialRequest {
  name: string;
  quantity: string;
  estimatedPrice?: number;
  url?: string;
  notes?: string;
  checked: boolean;
}

export interface AddChecklistItemRequest {
  title: string;
  description?: string;
  completed: boolean;
  order: number;
}