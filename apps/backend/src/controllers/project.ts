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

      const projects = await prisma.project.findMany({
        where: { userId: req.user.id },
        select: {
          id: true,
          shortId: true,
          title: true,
          goal: true,
          deadline: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              inspirationLinks: true,
              materials: true,
              checklistItems: true,
              notes: true,
              photos: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      res.json({
        success: true,
        data: projects,
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
}