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
  createdAt: Date;
  updatedAt: Date;
  inspirationLinks: InspirationLink[];
  materials: MaterialItem[];
  checklistItems: ChecklistItem[];
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
}

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