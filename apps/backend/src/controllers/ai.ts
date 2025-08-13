import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { OpenAIService } from '../services/openai';

const prisma = new PrismaClient();

export class AIController {
  static async chat(req: AuthenticatedRequest, res: Response) {
    try {
      console.log('[AI Controller] Chat request received');
      console.log('[AI Controller] User ID:', req.user?.id);
      console.log('[AI Controller] Project shortId:', req.params.shortId);
      console.log('[AI Controller] Message:', req.body.message);
      
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { shortId } = req.params;
      const { message, threadId } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Get project and check AI access
      const project = await prisma.project.findFirst({
        where: {
          shortId,
          userId: req.user.id,
        },
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check user subscription
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (user?.subscriptionStatus === 'FREE') {
        return res.status(403).json({ 
          error: 'AI chat is only available for Premium users. Upgrade to use AI assistance.' 
        });
      }

      console.log('[AI Controller] Processing AI chat for project:', project.id, 'threadId:', threadId);
      
      // Process AI chat
      const result = await OpenAIService.chatWithProject(project.id, message, threadId);

      console.log('[AI Controller] AI chat result:', JSON.stringify(result, null, 2));

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('AI chat error:', error);
      res.status(500).json({ error: 'Failed to process AI chat' });
    }
  }

  static async getChatHistory(req: AuthenticatedRequest, res: Response) {
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

      const chatHistory = await prisma.aiChatMessage.findMany({
        where: { projectId: project.id },
        orderBy: { createdAt: 'asc' },
        take: 50, // Limit to last 50 messages
      });

      res.json({
        success: true,
        data: chatHistory,
      });
    } catch (error) {
      console.error('Get chat history error:', error);
      res.status(500).json({ error: 'Failed to fetch chat history' });
    }
  }

  static async clearChatHistory(req: AuthenticatedRequest, res: Response) {
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

      await prisma.aiChatMessage.deleteMany({
        where: { projectId: project.id },
      });

      res.json({
        success: true,
        message: 'Chat history cleared successfully',
      });
    } catch (error) {
      console.error('Clear chat history error:', error);
      res.status(500).json({ error: 'Failed to clear chat history' });
    }
  }

  static async getChatThreads(req: AuthenticatedRequest, res: Response) {
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

      const threads = await prisma.aiChatThread.findMany({
        where: { projectId: project.id },
        orderBy: { lastMessageAt: 'desc' },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1, // Get last message for preview
          },
        },
      });

      res.json({
        success: true,
        data: threads,
      });
    } catch (error) {
      console.error('Get chat threads error:', error);
      res.status(500).json({ error: 'Failed to fetch chat threads' });
    }
  }

  static async getActiveThread(req: AuthenticatedRequest, res: Response) {
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

      // Find the most recent active thread (within last 24 hours)
      const activeThread = await prisma.aiChatThread.findFirst({
        where: {
          projectId: project.id,
          lastMessageAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        orderBy: {
          lastMessageAt: 'desc'
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      res.json({
        success: true,
        data: activeThread,
      });
    } catch (error) {
      console.error('Get active thread error:', error);
      res.status(500).json({ error: 'Failed to fetch active thread' });
    }
  }

  static async getChatThread(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { shortId, threadId } = req.params;

      const project = await prisma.project.findFirst({
        where: {
          shortId,
          userId: req.user.id,
        },
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const thread = await prisma.aiChatThread.findFirst({
        where: { 
          id: threadId,
          projectId: project.id 
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (!thread) {
        return res.status(404).json({ error: 'Chat thread not found' });
      }

      res.json({
        success: true,
        data: thread,
      });
    } catch (error) {
      console.error('Get chat thread error:', error);
      res.status(500).json({ error: 'Failed to fetch chat thread' });
    }
  }

  static async deleteChatThread(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { shortId, threadId } = req.params;

      const project = await prisma.project.findFirst({
        where: {
          shortId,
          userId: req.user.id,
        },
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const thread = await prisma.aiChatThread.findFirst({
        where: { 
          id: threadId,
          projectId: project.id 
        },
      });

      if (!thread) {
        return res.status(404).json({ error: 'Chat thread not found' });
      }

      await prisma.aiChatThread.delete({
        where: { id: threadId }
      });

      res.json({
        success: true,
        message: 'Chat thread deleted successfully',
      });
    } catch (error) {
      console.error('Delete chat thread error:', error);
      res.status(500).json({ error: 'Failed to delete chat thread' });
    }
  }
}