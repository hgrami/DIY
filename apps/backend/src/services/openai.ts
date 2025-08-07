import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface AiFunctionCall {
  name: string;
  arguments: any;
}

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
  functionCall?: AiFunctionCall;
}

export class OpenAIService {
  static async chatWithProject(
    projectId: string,
    message: string,
    projectContext?: any
  ) {
    try {
      // Get project context
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          inspirationLinks: true,
          materials: true,
          checklistItems: true,
          notes: true,
        },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // Get recent chat history
      const chatHistory = await prisma.aiChatMessage.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' },
        take: 20, // Last 20 messages for context
      });

      // Build system prompt
      const systemPrompt = `You are a helpful AI assistant for DIY home improvement projects. 
      
Project: ${project.title}
Goal: ${project.goal || 'Not specified'}
Description: ${project.description || 'Not specified'}

Current project context:
- ${project.inspirationLinks.length} inspiration links
- ${project.materials.length} materials/tools
- ${project.checklistItems.length} checklist items
- ${project.notes.length} notes

You can help users by:
1. Generating materials lists from project descriptions
2. Creating step-by-step checklists
3. Finding inspiration links for DIY projects
4. Summarizing notes and project progress
5. Providing helpful DIY tips and advice

Always be encouraging and practical. Focus on safety and best practices for DIY projects.`;

      // Prepare messages for OpenAI
      const messages: any[] = [
        { role: 'system', content: systemPrompt },
        ...chatHistory.map(msg => ({
          role: msg.role,
          content: msg.content,
          ...(msg.functionCall && { function_call: msg.functionCall }),
        })),
        { role: 'user', content: message },
      ];

      // Define available functions
      const functions = [
        {
          name: 'generateMaterials',
          description: 'Generate a list of materials and tools needed for a DIY project',
          parameters: {
            type: 'object',
            properties: {
              materials: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Material or tool name' },
                    quantity: { type: 'string', description: 'Quantity needed (e.g., "2", "1 pack", "3 meters")' },
                    estimatedPrice: { type: 'number', description: 'Estimated cost in dollars' },
                    category: { type: 'string', description: 'Category: Tools, Materials, Safety, etc.' },
                    notes: { type: 'string', description: 'Additional notes or specifications' },
                  },
                  required: ['name', 'quantity'],
                },
              },
            },
            required: ['materials'],
          },
        },
        {
          name: 'generateChecklist',
          description: 'Generate a step-by-step checklist for a DIY project',
          parameters: {
            type: 'object',
            properties: {
              tasks: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', description: 'Task description' },
                    order: { type: 'number', description: 'Order in the sequence' },
                    estimatedTime: { type: 'string', description: 'Estimated time to complete' },
                    difficulty: { type: 'string', description: 'Difficulty level: Easy, Medium, Hard' },
                    notes: { type: 'string', description: 'Additional notes or tips' },
                  },
                  required: ['title', 'order'],
                },
              },
            },
            required: ['tasks'],
          },
        },
        {
          name: 'searchInspiration',
          description: 'Search for inspiration links for DIY projects',
          parameters: {
            type: 'object',
            properties: {
              links: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', description: 'Title of the tutorial or inspiration' },
                    url: { type: 'string', description: 'URL to the tutorial or inspiration' },
                    source: { type: 'string', description: 'Source platform (e.g., Pinterest, YouTube, Blog)' },
                    difficulty: { type: 'string', description: 'Difficulty level: Beginner, Intermediate, Advanced' },
                    tags: { type: 'array', items: { type: 'string' }, description: 'Relevant tags' },
                  },
                  required: ['title', 'url', 'source'],
                },
              },
            },
            required: ['links'],
          },
        },
        {
          name: 'summarizeNotes',
          description: 'Summarize project notes and provide insights',
          parameters: {
            type: 'object',
            properties: {
              summary: { type: 'string', description: 'Summary of the notes' },
              keyPoints: { type: 'array', items: { type: 'string' }, description: 'Key points from the notes' },
              recommendations: { type: 'array', items: { type: 'string' }, description: 'Recommendations based on the notes' },
            },
            required: ['summary'],
          },
        },
      ];

      // Call OpenAI
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        functions,
        function_call: 'auto',
        temperature: 0.7,
      });

      const response = completion.choices[0];
      const assistantMessage = response.message;

      // Save the user message
      await prisma.aiChatMessage.create({
        data: {
          projectId,
          role: 'user',
          content: message,
        },
      });

      // Save the assistant message
      const savedAssistantMessage = await prisma.aiChatMessage.create({
        data: {
          projectId,
          role: 'assistant',
          content: assistantMessage.content || '',
          functionCall: assistantMessage.function_call ? JSON.parse(JSON.stringify(assistantMessage.function_call)) : null,
        },
      });

      // If there's a function call, execute it
      if (assistantMessage.function_call) {
        const functionName = assistantMessage.function_call.name;
        const functionArgs = JSON.parse(assistantMessage.function_call.arguments);

        let functionResult: any = {};

        switch (functionName) {
          case 'generateMaterials':
            functionResult = await this.handleGenerateMaterials(projectId, functionArgs);
            break;
          case 'generateChecklist':
            functionResult = await this.handleGenerateChecklist(projectId, functionArgs);
            break;
          case 'searchInspiration':
            functionResult = await this.handleSearchInspiration(projectId, functionArgs);
            break;
          case 'summarizeNotes':
            functionResult = await this.handleSummarizeNotes(projectId, functionArgs);
            break;
          default:
            functionResult = { error: 'Unknown function' };
        }

        // Update the assistant message with function result
        await prisma.aiChatMessage.update({
          where: { id: savedAssistantMessage.id },
          data: {
            functionCall: {
              ...assistantMessage.function_call,
              result: functionResult,
            },
          },
        });

        return {
          message: assistantMessage.content,
          functionCall: {
            name: functionName,
            arguments: functionArgs,
            result: functionResult,
          },
        };
      }

      return {
        message: assistantMessage.content,
      };
    } catch (error) {
      console.error('OpenAI chat error:', error);
      throw new Error('Failed to process AI chat');
    }
  }

  private static async handleGenerateMaterials(projectId: string, args: any) {
    try {
      const { materials } = args;
      
      const createdMaterials = await Promise.all(
        materials.map(async (material: any) => {
          return await prisma.materialItem.create({
            data: {
              projectId,
              name: material.name,
              quantity: material.quantity,
              estimatedPrice: material.estimatedPrice ? parseFloat(material.estimatedPrice) : null,
              category: material.category || 'Materials',
            },
          });
        })
      );

      return {
        success: true,
        message: `Generated ${createdMaterials.length} materials for your project`,
        materials: createdMaterials,
      };
    } catch (error) {
      console.error('Generate materials error:', error);
      return { error: 'Failed to generate materials' };
    }
  }

  private static async handleGenerateChecklist(projectId: string, args: any) {
    try {
      const { tasks } = args;
      
      const createdTasks = await Promise.all(
        tasks.map(async (task: any) => {
          return await prisma.checklistItem.create({
            data: {
              projectId,
              title: task.title,
              order: task.order,
              createdBy: 'ai',
            },
          });
        })
      );

      return {
        success: true,
        message: `Generated ${createdTasks.length} tasks for your project`,
        tasks: createdTasks,
      };
    } catch (error) {
      console.error('Generate checklist error:', error);
      return { error: 'Failed to generate checklist' };
    }
  }

  private static async handleSearchInspiration(projectId: string, args: any) {
    try {
      const { links } = args;
      
      const createdLinks = await Promise.all(
        links.map(async (link: any) => {
          return await prisma.inspirationLink.create({
            data: {
              projectId,
              title: link.title,
              url: link.url,
              source: link.source,
              difficulty: link.difficulty,
              tags: link.tags || [],
            },
          });
        })
      );

      return {
        success: true,
        message: `Found ${createdLinks.length} inspiration links for your project`,
        links: createdLinks,
      };
    } catch (error) {
      console.error('Search inspiration error:', error);
      return { error: 'Failed to search inspiration' };
    }
  }

  private static async handleSummarizeNotes(projectId: string, args: any) {
    try {
      const { summary, keyPoints, recommendations } = args;
      
      // Create a summary note
      const summaryNote = await prisma.note.create({
        data: {
          projectId,
          content: `AI Summary: ${summary}\n\nKey Points:\n${keyPoints?.map((point: string) => `• ${point}`).join('\n') || ''}\n\nRecommendations:\n${recommendations?.map((rec: string) => `• ${rec}`).join('\n') || ''}`,
          tags: ['ai-summary'],
        },
      });

      return {
        success: true,
        message: 'Notes summarized and saved to your project',
        summary: summaryNote,
      };
    } catch (error) {
      console.error('Summarize notes error:', error);
      return { error: 'Failed to summarize notes' };
    }
  }
}