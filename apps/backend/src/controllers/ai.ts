import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { OpenAIService } from '../services/openai';

const prisma = new PrismaClient();

export class AIController {
  static async chat(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { shortId } = req.params;
      const { message } = req.body;

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

      // Check if AI is enabled for this project
      const config = project.config as any;
      if (!config.aiEnabled) {
        return res.status(403).json({ 
          error: 'AI features are disabled for this project. Upgrade to Premium to enable AI assistance.' 
        });
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

      // Process AI chat
      const result = await OpenAIService.chatWithProject(project.id, message);

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
}