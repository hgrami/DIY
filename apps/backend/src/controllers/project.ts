import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { generateShortId } from '../utils/shortId';

const prisma = new PrismaClient();

export class ProjectController {
  static async createProject(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { title, goal, description, deadline, config } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'Project title is required' });
      }

      // Check subscription limits for free users
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
          projects: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Free users are limited to 3 projects
      if (user.subscriptionStatus === 'FREE' && user.projects.length >= 3) {
        return res.status(403).json({ 
          error: 'Free users are limited to 3 projects. Upgrade to create unlimited projects.' 
        });
      }

      // Generate unique shortId
      const shortId = await generateShortId();

      const project = await prisma.project.create({
        data: {
          shortId,
          userId: req.user.id,
          title,
          goal,
          description,
          deadline: deadline ? new Date(deadline) : null,
          config: config || {
            aiEnabled: user.subscriptionStatus !== 'FREE',
            showInspiration: true,
            showMaterials: true,
            showChecklist: true,
            showNotes: true,
            showPhotos: true,
          },
        },
        include: {
          inspirationLinks: true,
          materials: true,
          checklistItems: true,
          notes: true,
          photos: true,
        },
      });

      res.status(201).json({
        success: true,
        data: project,
      });
    } catch (error) {
      console.error('Create project error:', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  }

  static async getUserProjects(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const skip = (page - 1) * limit;

      // Build where clause with search
      const whereClause: any = { userId: req.user.id };
      
      if (search) {
        whereClause.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { goal: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          where: whereClause,
          select: {
            id: true,
            shortId: true,
            title: true,
            goal: true,
            deadline: true,
            createdAt: true,
            updatedAt: true,
            inspirationLinks: {
              select: { id: true },
            },
            materials: {
              select: { id: true },
            },
            checklistItems: {
              select: { id: true, completed: true },
            },
            notes: {
              select: { id: true },
            },
            photos: {
              select: { id: true },
            },
          },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.project.count({ where: whereClause }),
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: projects,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });
    } catch (error) {
      console.error('Get user projects error:', error);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  }

  static async getProject(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { shortId } = req.params;

      const project = await prisma.project.findFirst({
        where: {
          shortId,
          userId: req.user.id,
        },
        include: {
          inspirationLinks: {
            orderBy: { createdAt: 'desc' },
          },
          materials: {
            orderBy: { createdAt: 'desc' },
          },
          checklistItems: {
            orderBy: { order: 'asc' },
          },
          notes: {
            orderBy: { createdAt: 'desc' },
          },
          photos: {
            orderBy: { uploadedAt: 'desc' },
          },
          aiChatHistory: {
            orderBy: { createdAt: 'asc' },
            take: 50, // Limit to last 50 messages
          },
        },
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.json({
        success: true,
        data: project,
      });
    } catch (error) {
      console.error('Get project error:', error);
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  }

  static async updateProject(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { shortId } = req.params;
      const { title, goal, description, deadline, config } = req.body;

      const project = await prisma.project.findFirst({
        where: {
          shortId,
          userId: req.user.id,
        },
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const updatedProject = await prisma.project.update({
        where: { id: project.id },
        data: {
          title,
          goal,
          description,
          deadline: deadline ? new Date(deadline) : null,
          config,
        },
        include: {
          inspirationLinks: true,
          materials: true,
          checklistItems: true,
          notes: true,
          photos: true,
        },
      });

      res.json({
        success: true,
        data: updatedProject,
      });
    } catch (error) {
      console.error('Update project error:', error);
      res.status(500).json({ error: 'Failed to update project' });
    }
  }

  static async deleteProject(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { shortId } = req.params;

      const project = await prisma.project.findFirst({
        where: {
          shortId,
          userId: req.user.id,
        },
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      await prisma.project.delete({
        where: { id: project.id },
      });

      res.json({
        success: true,
        message: 'Project deleted successfully',
      });
    } catch (error) {
      console.error('Delete project error:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  }

  static async getProjectStats(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { shortId } = req.params;

      const project = await prisma.project.findFirst({
        where: {
          shortId,
          userId: req.user.id,
        },
        include: {
          _count: {
            select: {
              inspirationLinks: true,
              materials: true,
              checklistItems: true,
              notes: true,
              photos: true,
            },
          },
          materials: {
            select: {
              estimatedPrice: true,
              checked: true,
            },
          },
          checklistItems: {
            select: {
              completed: true,
            },
          },
        },
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const totalBudget = project.materials.reduce((sum, item) => {
        return sum + (item.estimatedPrice ? Number(item.estimatedPrice) : 0);
      }, 0);

      const completedTasks = project.checklistItems.filter(item => item.completed).length;
      const totalTasks = project.checklistItems.length;
      const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      const stats = {
        counts: project._count,
        budget: {
          total: totalBudget,
          spent: project.materials
            .filter(item => item.checked)
            .reduce((sum, item) => sum + (item.estimatedPrice ? Number(item.estimatedPrice) : 0), 0),
        },
        progress: {
          completed: completedTasks,
          total: totalTasks,
          percentage: Math.round(progress),
        },
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Get project stats error:', error);
      res.status(500).json({ error: 'Failed to fetch project stats' });
    }
  }

  // Resource management endpoints
  static async addMaterial(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { shortId } = req.params;
      const { name, quantity, estimatedPrice, category, notes } = req.body;

      if (!name || !quantity) {
        return res.status(400).json({ error: 'Name and quantity are required' });
      }

      const project = await prisma.project.findFirst({
        where: {
          shortId,
          userId: req.user.id,
        },
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const material = await prisma.materialItem.create({
        data: {
          projectId: project.id,
          name,
          quantity,
          estimatedPrice: estimatedPrice ? parseFloat(estimatedPrice) : null,
          category: category || 'Materials',
        },
      });

      res.status(201).json({
        success: true,
        data: material,
      });
    } catch (error) {
      console.error('Add material error:', error);
      res.status(500).json({ error: 'Failed to add material' });
    }
  }

  static async addTask(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { shortId } = req.params;
      const { title, description, estimatedTime, difficulty, order } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }

      const project = await prisma.project.findFirst({
        where: {
          shortId,
          userId: req.user.id,
        },
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const task = await prisma.checklistItem.create({
        data: {
          projectId: project.id,
          title,
          order: order || 0,
          createdBy: 'user',
        },
      });

      res.status(201).json({
        success: true,
        data: task,
      });
    } catch (error) {
      console.error('Add task error:', error);
      res.status(500).json({ error: 'Failed to add task' });
    }
  }

  static async addInspiration(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { shortId } = req.params;
      const { title, url, description, source, difficulty, tags } = req.body;

      if (!title || !url) {
        return res.status(400).json({ error: 'Title and URL are required' });
      }

      const project = await prisma.project.findFirst({
        where: {
          shortId,
          userId: req.user.id,
        },
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const inspiration = await prisma.inspirationLink.create({
        data: {
          projectId: project.id,
          title,
          url,
          source: source || 'User Added',
          difficulty,
          tags: tags || [],
        },
      });

      res.status(201).json({
        success: true,
        data: inspiration,
      });
    } catch (error) {
      console.error('Add inspiration error:', error);
      res.status(500).json({ error: 'Failed to add inspiration' });
    }
  }

  static async addNote(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { shortId } = req.params;
      const { content, tags } = req.body;

      if (!content) {
        return res.status(400).json({ error: 'Content is required' });
      }

      const project = await prisma.project.findFirst({
        where: {
          shortId,
          userId: req.user.id,
        },
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const note = await prisma.note.create({
        data: {
          projectId: project.id,
          content,
          tags: tags || [],
        },
      });

      res.status(201).json({
        success: true,
        data: note,
      });
    } catch (error) {
      console.error('Add note error:', error);
      res.status(500).json({ error: 'Failed to add note' });
    }
  }

  static async updateInterviewContext(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { shortId } = req.params;
      const { interviewContext } = req.body;

      if (!interviewContext) {
        return res.status(400).json({ error: 'Interview context is required' });
      }

      // Find the project and verify ownership
      const project = await prisma.project.findFirst({
        where: {
          shortId,
          userId: req.user.id,
        },
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Update the project with interview context
      const updatedProject = await prisma.project.update({
        where: { id: project.id },
        data: {
          interviewContext,
        },
      });

      console.log(`[Project] Interview context saved for project ${shortId}:`, interviewContext);

      res.json({ 
        success: true, 
        message: 'Interview context saved successfully',
        data: { interviewContext: updatedProject.interviewContext }
      });
    } catch (error) {
      console.error('Update interview context error:', error);
      res.status(500).json({ error: 'Failed to save interview context' });
    }
  }

  static async getInterviewQuestions(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { shortId } = req.params;

      // Find the project and verify ownership
      const project = await prisma.project.findFirst({
        where: {
          shortId,
          userId: req.user.id,
        },
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if project already has interview context
      if (project.interviewContext && (project.interviewContext as any)?.completedAt) {
        return res.json({
          success: true,
          hasInterview: true,
          data: { interviewContext: project.interviewContext }
        });
      }

      // Analyze project to generate intelligent, context-aware questions
      const projectAnalysis = await ProjectController.analyzeProjectForQuestions(project);
      const { questions, focusAreas, reasoning } = projectAnalysis;

      const interviewData = {
        questions,
        focusAreas,
        reasoning: "To provide you with the most helpful and personalized guidance, I'd like to understand more about your situation and goals for this project.",
        timestamp: new Date().toISOString()
      };

      console.log(`[Project] Generated interview questions for project ${shortId}`);

      res.json({
        success: true,
        hasInterview: false,
        data: { interviewData }
      });
    } catch (error) {
      console.error('Get interview questions error:', error);
      res.status(500).json({ error: 'Failed to get interview questions' });
    }
  }

  static async analyzeProjectForQuestions(project: any): Promise<{
    questions: string[];
    focusAreas: string[];
    reasoning: string;
  }> {
    try {
      const projectTitle = project.title.toLowerCase();
      const projectGoal = (project.goal || '').toLowerCase();
      const projectDescription = (project.description || '').toLowerCase();
      const fullContext = `${projectTitle} ${projectGoal} ${projectDescription}`;

      // Detect project type and generate appropriate questions
      let projectType = 'general';
      let questions: string[] = [];
      let focusAreas: string[] = [];
      let reasoning = '';

      // Website/Web Development Projects
      if (fullContext.includes('website') || fullContext.includes('webpage') || 
          fullContext.includes('web') || fullContext.includes('revamp') ||
          fullContext.includes('redesign') || fullContext.includes('ui') || 
          fullContext.includes('ux') || fullContext.includes('html') || 
          fullContext.includes('css')) {
        
        projectType = 'web_development';
        questions = [
          'What type of website are you working on (business, portfolio, blog, e-commerce, etc.)?',
          'Do you have existing content/branding, or are you starting from scratch?',
          'What\'s the main purpose or goal you want visitors to achieve on this site?',
          'Do you need any specific functionality (contact forms, user accounts, payments, etc.)?',
          'What\'s your target timeline for completing this project?'
        ];
        focusAreas = ['website_type', 'content_strategy', 'user_goals', 'functionality', 'timeline'];
        reasoning = 'I\'d like to understand your website goals and requirements to provide more targeted guidance for your web project.';

      // Home Improvement/Construction Projects
      } else if (fullContext.includes('kitchen') || fullContext.includes('bathroom') || 
                 fullContext.includes('room') || fullContext.includes('wall') || 
                 fullContext.includes('floor') || fullContext.includes('paint') ||
                 fullContext.includes('tile') || fullContext.includes('cabinet')) {
        
        projectType = 'home_improvement';
        questions = [
          'What\'s your experience level with home improvement projects?',
          'What\'s your budget range for this project?',
          'Do you have access to power tools, or will you be using basic hand tools?',
          'Are there any structural or safety considerations I should know about?',
          'What\'s your timeline for completing this project?'
        ];
        focusAreas = ['experience_level', 'budget', 'tools', 'safety', 'timeline'];
        reasoning = 'To provide the most helpful guidance for your home improvement project, I need to understand your experience level and constraints.';

      // Garden/Outdoor Projects
      } else if (fullContext.includes('garden') || fullContext.includes('outdoor') || 
                 fullContext.includes('deck') || fullContext.includes('patio') || 
                 fullContext.includes('landscaping') || fullContext.includes('plant')) {
        
        projectType = 'outdoor';
        questions = [
          'What\'s the size and current condition of your outdoor space?',
          'What\'s your climate/growing zone?',
          'Do you have any specific plants or features in mind?',
          'What\'s your experience with gardening or outdoor projects?',
          'What\'s your budget and timeline for this project?'
        ];
        focusAreas = ['space_size', 'climate', 'preferences', 'experience', 'budget'];
        reasoning = 'Outdoor projects depend heavily on your specific environment and preferences. Let me understand your space better.';

      // Craft/Creative Projects
      } else if (fullContext.includes('craft') || fullContext.includes('art') || 
                 fullContext.includes('sewing') || fullContext.includes('woodwork') || 
                 fullContext.includes('jewelry') || fullContext.includes('creative')) {
        
        projectType = 'creative';
        questions = [
          'What\'s your experience level with this type of creative project?',
          'What materials do you already have available?',
          'Are you making this for yourself or as a gift?',
          'Do you have a specific style or theme in mind?',
          'What\'s your timeline and any budget considerations?'
        ];
        focusAreas = ['experience', 'materials', 'purpose', 'style', 'constraints'];
        reasoning = 'Creative projects are very personal. I\'d like to understand your vision and resources to guide you better.';

      // Tech/Electronics Projects
      } else if (fullContext.includes('tech') || fullContext.includes('electronic') || 
                 fullContext.includes('arduino') || fullContext.includes('raspberry') || 
                 fullContext.includes('programming') || fullContext.includes('app')) {
        
        projectType = 'technology';
        questions = [
          'What\'s your programming/technical experience level?',
          'What specific technologies or platforms are you planning to use?',
          'What\'s the main problem you\'re trying to solve with this project?',
          'Do you have the necessary hardware/software already?',
          'Are you building this for learning, personal use, or to share with others?'
        ];
        focusAreas = ['technical_skills', 'technology_stack', 'problem_solving', 'resources', 'purpose'];
        reasoning = 'Technical projects require understanding your skill level and available resources to provide appropriate guidance.';

      // Repair/Maintenance Projects
      } else if (fullContext.includes('repair') || fullContext.includes('fix') || 
                 fullContext.includes('maintenance') || fullContext.includes('broken') || 
                 fullContext.includes('replace')) {
        
        projectType = 'repair';
        questions = [
          'What exactly is broken or needs repair?',
          'When did you first notice the issue?',
          'Have you attempted any repairs already?',
          'What\'s your comfort level with repair work?',
          'Do you have any relevant tools or replacement parts?'
        ];
        focusAreas = ['problem_description', 'timeline', 'previous_attempts', 'skill_level', 'resources'];
        reasoning = 'For repair projects, I need to understand the specific problem and your situation to provide the best troubleshooting guidance.';

      // Default/General Projects
      } else {
        projectType = 'general';
        questions = [
          'What inspired you to start this project?',
          'What\'s your main goal or desired outcome?',
          'What experience do you have with similar projects?',
          'What resources (time, budget, materials) do you have available?',
          'Are there any specific challenges or constraints I should know about?'
        ];
        focusAreas = ['inspiration', 'goals', 'experience', 'resources', 'constraints'];
        reasoning = 'To provide you with the most helpful and personalized guidance, I\'d like to understand more about your project goals and situation.';
      }

      console.log(`[Project Analysis] Detected project type: ${projectType} for "${project.title}"`);
      
      return {
        questions: questions.slice(0, 5), // Limit to 5 questions max
        focusAreas,
        reasoning
      };

    } catch (error) {
      console.error('Project analysis error:', error);
      // Fallback to general questions
      return {
        questions: [
          'What\'s your main goal for this project?',
          'What\'s your experience level with projects like this?',
          'What resources do you have available (time, budget, etc.)?'
        ],
        focusAreas: ['goals', 'experience', 'resources'],
        reasoning: 'I\'d like to understand your project better to provide more helpful guidance.'
      };
    }
  }
}