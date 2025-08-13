import { apiService } from './api';
import { 
  Project, 
  CreateProjectRequest, 
  UpdateProjectRequest, 
  CreateProjectData,
  AddInspirationRequest,
  AddMaterialRequest,
  AddChecklistItemRequest,
  InspirationLink,
  MaterialItem,
  ProjectChecklistItem
} from '../@types';

interface ProjectsResponse {
  success: boolean;
  data: Project[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface ProjectResponse {
  success: boolean;
  data: Project;
}

export class ProjectsService {
  static async getProjects(page: number = 1, search?: string): Promise<Project[]> {
    const response = await this.getUserProjects(page, search);
    return response.data;
  }

  static async getUserProjects(page: number = 1, search?: string): Promise<ProjectsResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    if (search) {
      params.append('search', search);
    }
    
    const response = await apiService.get<Project[]>(`/api/projects?${params.toString()}`);
    return {
      success: response.success,
      data: response.data || [],
      pagination: response.pagination
    };
  }

  static async getProject(shortId: string): Promise<ProjectResponse> {
    const response = await apiService.get<Project>(`/api/projects/${shortId}`);
    if (!response.data) {
      throw new Error('Project not found');
    }
    return {
      success: response.success,
      data: response.data
    };
  }

  static async createProject(data: CreateProjectData): Promise<Project> {
    const response = await apiService.post<Project>('/api/projects', data);
    if (!response.data) {
      throw new Error('Failed to create project');
    }
    return response.data;
  }

  static async updateProject(shortId: string, data: UpdateProjectRequest): Promise<ProjectResponse> {
    const response = await apiService.patch<Project>(`/api/projects/${shortId}`, data);
    if (!response.data) {
      throw new Error('Failed to update project');
    }
    return {
      success: response.success,
      data: response.data
    };
  }

  static async deleteProject(shortId: string): Promise<{ success: boolean }> {
    const response = await apiService.delete(`/api/projects/${shortId}`);
    return {
      success: response.success
    };
  }

  static async getProjectStats(shortId: string) {
    const response = await apiService.get(`/api/projects/${shortId}/stats`);
    return response;
  }

  // Add inspiration to project
  static async addInspiration(shortId: string, data: AddInspirationRequest): Promise<InspirationLink> {
    const response = await apiService.post<InspirationLink>(`/api/projects/${shortId}/inspiration`, data);
    if (!response.data) {
      throw new Error('Failed to add inspiration');
    }
    return response.data;
  }

  // Add material to project  
  static async addMaterial(shortId: string, data: AddMaterialRequest): Promise<MaterialItem> {
    const response = await apiService.post<MaterialItem>(`/api/projects/${shortId}/materials`, data);
    if (!response.data) {
      throw new Error('Failed to add material');
    }
    return response.data;
  }

  // Add checklist item to project
  static async addChecklistItem(shortId: string, data: AddChecklistItemRequest): Promise<ProjectChecklistItem> {
    const response = await apiService.post<ProjectChecklistItem>(`/api/projects/${shortId}/checklist`, data);
    if (!response.data) {
      throw new Error('Failed to add checklist item');
    }
    return response.data;
  }
}