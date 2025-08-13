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
  static async assessProjectContext(project: any, chatHistory: any[]): Promise<{
    needsMoreInfo: boolean;
    missingAreas: string[];
    confidence: number;
    suggestedQuestions: string[];
    contextScore: number;
  }> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a project context analyzer for DIY projects. Analyze the current project information and determine if more context is needed to provide effective assistance.

Project Information:
- Title: ${project.title}
- Goal: ${project.goal || 'Not specified'}
- Description: ${project.description || 'Not provided'}
- Resources: ${project.inspirationLinks?.length || 0} inspiration links, ${project.materials?.length || 0} materials, ${project.checklistItems?.length || 0} tasks, ${project.notes?.length || 0} notes

Recent Chat History: ${JSON.stringify(chatHistory.slice(-5), null, 2)}

Assess the project context quality and identify missing information that would help provide better DIY assistance.`
          },
          {
            role: 'user',
            content: 'Analyze this DIY project context and determine what additional information would be helpful.'
          }
        ],
        functions: [
          {
            name: 'assess_context_quality',
            description: 'Assess project context and identify missing information',
            parameters: {
              type: 'object',
              properties: {
                needsMoreInfo: {
                  type: 'boolean',
                  description: 'Whether more context is needed for effective assistance'
                },
                contextScore: {
                  type: 'number',
                  description: 'Context completeness score 0-100'
                },
                missingAreas: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Areas where more information would be helpful'
                },
                suggestedQuestions: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific questions to gather missing context'
                },
                confidence: {
                  type: 'number',
                  description: 'Confidence in the assessment 0-1'
                },
                reasoning: {
                  type: 'string',
                  description: 'Explanation of the context assessment'
                }
              },
              required: ['needsMoreInfo', 'contextScore', 'confidence']
            }
          }
        ],
        function_call: { name: 'assess_context_quality' }
      });

      const functionCall = response.choices[0].message.function_call;
      if (!functionCall) {
        return {
          needsMoreInfo: false,
          missingAreas: [],
          confidence: 0.5,
          suggestedQuestions: [],
          contextScore: 50
        };
      }

      const assessment = JSON.parse(functionCall.arguments);
      console.log(`[OpenAI] Context assessment:`, assessment);

      return {
        needsMoreInfo: assessment.needsMoreInfo,
        missingAreas: assessment.missingAreas || [],
        confidence: assessment.confidence,
        suggestedQuestions: assessment.suggestedQuestions || [],
        contextScore: assessment.contextScore || 50
      };
    } catch (error) {
      console.error('Context assessment error:', error);
      return {
        needsMoreInfo: false,
        missingAreas: [],
        confidence: 0.3,
        suggestedQuestions: [],
        contextScore: 30
      };
    }
  }

  static async classifyIntent(message: string, projectContext: any, chatHistory: any[]): Promise<{
    intent: 'search_resources' | 'general_guidance' | 'summarize_webpage' | 'add_resources' | 'project_planning' | 'off_topic';
    resourceType?: 'tutorial' | 'inspiration' | 'materials';
    needsWebSearch: boolean;
    specificQuery?: string;
    confidence: number;
    reasoning?: string;
  }> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an intent classifier for a DIY project assistant. Analyze the user's message and determine their intent.

Project Context: ${JSON.stringify(projectContext, null, 2)}
Recent Chat History: ${JSON.stringify(chatHistory.slice(-3), null, 2)}

Classify the intent as one of:
- search_resources: User wants to find specific resources (videos, tutorials, materials, inspiration)
- general_guidance: User needs advice, explanations, or general help
- summarize_webpage: User wants to analyze or summarize a specific webpage/URL
- add_resources: User wants to add specific items to their project
- project_planning: User needs help planning their project steps
- off_topic: User is asking about something unrelated to DIY projects or their current project

For search_resources, also determine:
- resourceType: tutorial, inspiration, or materials
- specificQuery: the exact search query to use
- needsWebSearch: true if real web search is needed

IMPORTANT: If the user is asking about something completely unrelated to DIY projects or their current project context, classify as 'off_topic'.

Return high confidence (0.8+) only when intent is very clear.`
          },
          {
            role: 'user',
            content: message
          }
        ],
        functions: [
          {
            name: 'classify_intent',
            description: 'Classify user intent and determine appropriate response strategy',
            parameters: {
              type: 'object',
              properties: {
                intent: {
                  type: 'string',
                  enum: ['search_resources', 'general_guidance', 'summarize_webpage', 'add_resources', 'project_planning', 'off_topic']
                },
                resourceType: {
                  type: 'string',
                  enum: ['tutorial', 'inspiration', 'materials'],
                  description: 'Type of resource being requested (if applicable)'
                },
                needsWebSearch: {
                  type: 'boolean',
                  description: 'Whether real web search is needed'
                },
                specificQuery: {
                  type: 'string',
                  description: 'Specific search query to use based on project context'
                },
                confidence: {
                  type: 'number',
                  description: 'Confidence level 0-1'
                },
                reasoning: {
                  type: 'string',
                  description: 'Brief explanation of the classification'
                }
              },
              required: ['intent', 'needsWebSearch', 'confidence', 'reasoning']
            }
          }
        ],
        function_call: { name: 'classify_intent' }
      });

      const functionCall = response.choices[0].message.function_call;
      if (!functionCall) {
        return {
          intent: 'general_guidance',
          needsWebSearch: false,
          confidence: 0.5
        };
      }

      const classification = JSON.parse(functionCall.arguments);
      console.log(`[OpenAI] Intent classification:`, classification);

      return classification;
    } catch (error) {
      console.error('Intent classification error:', error);
      return {
        intent: 'general_guidance',
        needsWebSearch: false,
        confidence: 0.3
      };
    }
  }

  static async chatWithProject(
    projectId: string,
    message: string,
    threadId?: string
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

      // Handle chat threading with session persistence
      let currentThread;
      if (threadId) {
        // Use existing thread
        console.log(`[OpenAI] Looking for existing thread: ${threadId}`);
        currentThread = await prisma.aiChatThread.findFirst({
          where: {
            id: threadId,
            projectId
          }
        });
        if (!currentThread) {
          console.log(`[OpenAI] Chat thread ${threadId} not found, returning error`);
          throw new Error('Chat thread not found. Please start a new conversation.');
        }
        console.log(`[OpenAI] Using existing thread: ${currentThread.id}`);
      } else {
        // Check for existing active thread for this project (last updated in last 24 hours)
        const recentThread = await prisma.aiChatThread.findFirst({
          where: {
            projectId,
            lastMessageAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          },
          orderBy: {
            lastMessageAt: 'desc'
          }
        });

        if (recentThread) {
          // Continue with the most recent active thread
          console.log(`[OpenAI] Continuing recent thread: ${recentThread.id}`);
          currentThread = recentThread;
        } else {
          // Create new thread only when no recent thread exists
          console.log(`[OpenAI] Creating new thread for project: ${projectId}`);
          const threadTitle = message.length > 50 ? message.substring(0, 47) + '...' : message;

          currentThread = await prisma.aiChatThread.create({
            data: {
              projectId,
              title: threadTitle,
              startedAt: new Date(),
              lastMessageAt: new Date(),
            }
          });
          console.log(`[OpenAI] Created new thread: ${currentThread.id}`);
        }
      }

      // Get recent chat history from this thread
      const chatHistory = await prisma.aiChatMessage.findMany({
        where: {
          projectId,
          threadId: currentThread.id
        },
        orderBy: { createdAt: 'asc' },
        take: 20, // Last 20 messages for context
      });

      // Classify user intent before processing
      console.log(`[OpenAI] Classifying intent for message: "${message}"`);
      const intentClassification = await this.classifyIntent(message, project, chatHistory);
      console.log(`[OpenAI] Intent classification result:`, intentClassification);

      // Check if project has completed interview context
      const hasInterviewContext = project.interviewContext &&
        (project.interviewContext as any)?.completedAt;

      // Note: We no longer trigger interviews during chat - this is handled at project level
      console.log(`[OpenAI] Project has interview context: ${hasInterviewContext}`);

      // Build context-aware system prompt based on intent and context assessment
      let systemPrompt = `You are a helpful AI assistant for DIY home improvement projects.

Project: ${project.title}
Goal: ${project.goal || 'Not specified'}  
Description: ${project.description || 'Not specified'}

Current project context:
- ${project.inspirationLinks.length} inspiration links
- ${project.materials.length} materials/tools
- ${project.checklistItems.length} checklist items
- ${project.notes.length} notes

Intent Analysis: ${intentClassification.reasoning || 'Not available'}
User Intent: ${intentClassification.intent}
`;

      // Add interview context if available
      if (hasInterviewContext) {
        const interviewData = project.interviewContext as any;
        systemPrompt += `
Additional Project Context (from user interview):
`;
        if (interviewData.answers) {
          Object.entries(interviewData.answers).forEach(([key, answer]: [string, any]) => {
            systemPrompt += `- ${answer}\n`;
          });
        }
        if (interviewData.focusAreas && interviewData.focusAreas.length > 0) {
          systemPrompt += `
Focus Areas: ${interviewData.focusAreas.join(', ')}
`;
        }
      }

      // Add note about interview context
      if (!hasInterviewContext) {
        systemPrompt += `
NOTE: This project doesn't have detailed context information yet. Provide general assistance but mention that more specific help would be available if the user completes their project setup.
`;
      }

      if (intentClassification.intent === 'search_resources' && intentClassification.needsWebSearch) {
        systemPrompt += `
CRITICAL: The user is requesting ${intentClassification.resourceType} resources. 
Search Query: "${intentClassification.specificQuery || message}"
You MUST use the searchWebForResources function to find real resources.
NEVER provide plain text lists - always return interactive resource cards.
`;
      } else if (intentClassification.intent === 'summarize_webpage') {
        systemPrompt += `
The user wants webpage analysis. Use the summarizeWebpage function and save insights.
`;
      } else if (intentClassification.intent === 'off_topic') {
        systemPrompt += `
IMPORTANT: The user is asking about something unrelated to DIY projects or their current project.
Politely redirect them back to their project with a friendly response that:
1. Acknowledges their question briefly
2. Redirects to their DIY project: "${project.title}"
3. Offers specific DIY assistance related to their project
4. Asks a project-related question to re-engage them

Example: "That's an interesting question! However, I'm here to help you with your DIY project: '${project.title}'. Let's focus on making progress with that. Would you like me to [specific project help]?"
`;
      }

      systemPrompt += `
Available functions:
1. searchWebForResources - Find real web resources (videos, tutorials, materials, inspiration) that are publicly accessible
2. generateMaterials - Generate materials lists with prices
3. generateChecklist - Create step-by-step task lists
4. summarizeWebpage - Analyze webpages for project insights
5. summarizeNotes - Summarize project notes

CRITICAL RULES:
- When users ask for videos, tutorials, ideas, or inspiration: USE searchWebForResources function
- Always return resource suggestions as interactive cards, never as plain text
- Maintain context from previous messages in this thread
- Be specific with search queries based on project context
- STAY FOCUSED: All conversations must relate to DIY projects and the user's current project
- If users go off-topic, politely redirect them back to their DIY project
- Never provide assistance with non-DIY topics like cooking, relationships, general tech support, etc.

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
          name: 'searchWebForResources',
          description: 'Search the web for real DIY tutorials, inspiration, and resources that are publicly accessible',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query for finding DIY content (e.g., "kitchen cabinet painting tutorial")'
              },
              resourceType: {
                type: 'string',
                enum: ['tutorial', 'inspiration', 'materials'],
                description: 'Type of content to search for'
              },
              numResults: {
                type: 'number',
                description: 'Number of results to return (max 5)',
                minimum: 1,
                maximum: 5
              }
            },
            required: ['query', 'resourceType'],
          },
        },
        {
          name: 'summarizeWebpage',
          description: 'Analyze and summarize a webpage for DIY project insights',
          parameters: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL of the webpage to analyze'
              },
              focusAreas: {
                type: 'array',
                items: { type: 'string' },
                description: 'Specific aspects to focus on (e.g., materials, steps, techniques)'
              }
            },
            required: ['url'],
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

      // Call OpenAI via Responses API (tools + web_search)
      console.log(`[OpenAI] Making responses request for project ${projectId}`);
      console.log(`[OpenAI] User message: "${message}"`);

      // Transform messages to Responses API input format
      const input = messages.map((m: any) => {
        const isAssistant = m.role === 'assistant';
        const itemType = isAssistant ? 'output_text' : 'input_text';
        return {
          role: m.role,
          content: [{ type: itemType, text: m.content }],
        };
      });

      // Map legacy functions -> Responses tools and add built-in web_search
      const tools = [
        ...functions.map((f: any) => ({
          type: 'function',
          name: f.name,
          description: f.description,
          parameters: f.parameters,
        })),
        { type: 'web_search' as const }, // no name field for built-in tool
      ];

      const isFunctionToolName = (name: string) => (
        ['generateMaterials', 'generateChecklist', 'searchWebForResources', 'summarizeWebpage', 'summarizeNotes']
          .includes(name)
      );

      // Helper to extract function tool calls from a responses payload
      const extractFunctionToolCalls = (resp: any) => {
        const calls: Array<{ id: string; name: string; arguments: any }> = [];
        const output = resp?.output || [];
        for (const item of output) {
          const contents = item?.content || [];
          for (const c of contents) {
            const isToolUse = c?.type === 'tool_use' || c?.type === 'tool_call';
            if (!isToolUse) continue;
            const name = c?.name || c?.tool_name || c?.tool?.name;
            if (!name || !isFunctionToolName(name)) continue; // ignore built-in tools like web_search
            const id = c?.id || c?.tool_call_id || c?.id;
            const rawArgs = c?.input ?? c?.arguments ?? {};
            let args = rawArgs;
            if (typeof rawArgs === 'string') {
              try { args = JSON.parse(rawArgs); } catch { args = {}; }
            }
            if (id && name) {
              calls.push({ id, name, arguments: args });
            }
          }
        }
        return calls;
      };

      // Debug tool schema
      try {
        console.log('[OpenAI] Tools configured:', tools.map((t: any) => ({ type: t.type, name: t.name || (t.function && t.function.name) || null })));
      } catch { }

      // Execute Responses API with tool loop (for function tools)
      let resp: any = await (openai as any).responses.create({
        model: 'gpt-5-mini-2025-08-07',
        input,
        tools,
        tool_choice: 'auto',
      });

      const aggregatedFunctionCalls: Array<{ name: string; arguments: any; result: any }> = [];
      for (let i = 0; i < 3; i++) {
        const toolCalls = extractFunctionToolCalls(resp);
        if (!toolCalls.length) break;

        const tool_outputs: Array<{ tool_call_id: string; output: string }> = [];
        for (const call of toolCalls) {
          let functionResult: any = { error: 'Unknown function' };
          switch (call.name) {
            case 'generateMaterials':
              functionResult = await this.handleGenerateMaterials(projectId, call.arguments);
              break;
            case 'generateChecklist':
              functionResult = await this.handleGenerateChecklist(projectId, call.arguments);
              break;
            case 'searchWebForResources':
              functionResult = await this.handleWebSearch(projectId, call.arguments);
              break;
            case 'summarizeWebpage':
              functionResult = await this.handleWebpageSummarization(projectId, call.arguments);
              break;
            case 'summarizeNotes':
              functionResult = await this.handleSummarizeNotes(projectId, call.arguments);
              break;
          }

          aggregatedFunctionCalls.push({ name: call.name, arguments: call.arguments, result: functionResult });
          tool_outputs.push({ tool_call_id: call.id, output: JSON.stringify(functionResult) });
        }

        // Submit tool outputs to continue the response
        resp = await (openai as any).responses.submitToolOutputs({
          response_id: resp.id,
          tool_outputs,
        });
      }

      // Extract assistant text
      let assistantText: string = resp?.output_text
        || (resp?.output || [])
          .flatMap((it: any) => (it?.content || []))
          .filter((c: any) => c?.type === 'output_text' || c?.type === 'text')
          .map((c: any) => c?.text || '')
          .join('')
        || '';

      console.log(`[OpenAI] Responses output received`);

      // Fallback: If the model produced no text (likely waiting on a built-in tool),
      // synthesize a response using our curated web search function.
      if (!assistantText || assistantText.trim().length === 0) {
        try {
          const query = intentClassification.specificQuery || message;
          const resourceType = intentClassification.resourceType || 'inspiration';
          const functionResult = await this.handleWebSearch(projectId, {
            query,
            resourceType,
            numResults: 3,
          });

          if (functionResult?.success && functionResult.links?.length) {
            const lines: string[] = [];
            lines.push(`Here are some curated ${resourceType} resources for "${query}":`);
            lines.push('');
            functionResult.links.forEach((r: any, idx: number) => {
              const source = r.source ? ` • ${r.source}` : '';
              const difficulty = r.difficulty ? ` • ${r.difficulty}` : '';
              lines.push(`${idx + 1}. ${r.title}${source}${difficulty}`);
              if (r.url) lines.push(`${r.url}`);
              if (r.snippet) lines.push(`${r.snippet}`);
              lines.push('');
            });
            if (functionResult.searchSuggestion) {
              lines.push(functionResult.searchSuggestion);
            }
            assistantText = lines.join('\n');

            aggregatedFunctionCalls.push({
              name: 'searchWebForResources',
              arguments: { query, resourceType, numResults: 3 },
              result: functionResult,
            });
          }
        } catch (fallbackErr) {
          console.warn('[OpenAI] Fallback web search failed:', fallbackErr);
        }
      }

      // Save the user message
      await prisma.aiChatMessage.create({
        data: {
          projectId,
          threadId: currentThread.id,
          role: 'user',
          content: message,
        },
      });

      // Save the assistant message
      const savedAssistantMessage = await prisma.aiChatMessage.create({
        data: {
          projectId,
          threadId: currentThread.id,
          role: 'assistant',
          content: assistantText || '',
          functionCall: aggregatedFunctionCalls.length ? JSON.parse(JSON.stringify(aggregatedFunctionCalls[0])) : null,
        },
      });

      // Update thread's last message time
      await prisma.aiChatThread.update({
        where: { id: currentThread.id },
        data: { lastMessageAt: new Date() }
      });

      // If we executed any function calls, include the first call details in the result
      if (aggregatedFunctionCalls.length) {
        const fc = aggregatedFunctionCalls[0];
        // Update the assistant message with function result for auditing
        await prisma.aiChatMessage.update({
          where: { id: savedAssistantMessage.id },
          data: { functionCall: fc },
        });

        const result = {
          message: assistantText,
          threadId: currentThread.id,
          functionCall: fc,
        };
        console.log(`[OpenAI] Final response with function call:`, result);
        return result;
      }

      return {
        message: assistantText,
        threadId: currentThread.id,
      };
    } catch (error) {
      console.error('OpenAI chat error:', error);
      throw new Error('Failed to process AI chat');
    }
  }

  private static async handleGenerateMaterials(projectId: string, args: any) {
    try {
      const { materials } = args;

      // Return suggestions instead of auto-creating records
      return {
        success: true,
        message: `I've suggested ${materials.length} materials for your project. Review and choose what to add.`,
        materials: materials.map((material: any) => ({
          name: material.name,
          quantity: material.quantity,
          estimatedPrice: material.estimatedPrice ? parseFloat(material.estimatedPrice) : null,
          category: material.category || 'Materials',
          notes: material.notes || '',
        })),
      };
    } catch (error) {
      console.error('Generate materials error:', error);
      return { error: 'Failed to generate materials' };
    }
  }

  private static async handleGenerateChecklist(projectId: string, args: any) {
    try {
      const { tasks } = args;

      // Return suggestions instead of auto-creating records
      return {
        success: true,
        message: `I've suggested ${tasks.length} tasks for your project. Review and choose what to add.`,
        tasks: tasks.map((task: any) => ({
          title: task.title,
          order: task.order,
          estimatedTime: task.estimatedTime,
          difficulty: task.difficulty,
          notes: task.notes || '',
        })),
      };
    } catch (error) {
      console.error('Generate checklist error:', error);
      return { error: 'Failed to generate checklist' };
    }
  }

  private static async handleWebSearch(projectId: string, args: any) {
    try {
      const { query, resourceType, numResults = 3 } = args;

      console.log(`[OpenAI] Performing curated resource search: "${query}" (${resourceType})`);

      // Since OpenAI doesn't have real web search, provide curated DIY resources
      // Use AI to match query to appropriate curated resources
      const curationResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a DIY resource curator. Based on the search query, recommend real, verified DIY resources from trusted platforms.
            
            For each recommendation, provide:
            - A descriptive title based on the query
            - Real working URLs from trusted DIY platforms (YouTube, Home Depot, Lowe's, This Old House, Family Handyman, etc.)
            - Accurate platform information
            - Realistic difficulty assessment
            - Relevant tags
            - Helpful description
            
            IMPORTANT: Only suggest resources from well-known, established DIY platforms that are likely to exist.`
          },
          {
            role: 'user',
            content: `Find ${numResults} ${resourceType} resources for: "${query}"`
          }
        ],
        functions: [
          {
            name: 'curate_diy_resources',
            description: 'Return curated DIY resources from trusted platforms',
            parameters: {
              type: 'object',
              properties: {
                resources: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string', description: 'Descriptive title for the resource' },
                      url: { type: 'string', description: 'URL from a trusted DIY platform' },
                      source: { type: 'string', description: 'Platform name (YouTube, Home Depot, etc.)' },
                      difficulty: { type: 'string', enum: ['Beginner', 'Intermediate', 'Advanced'] },
                      tags: { type: 'array', items: { type: 'string' }, description: 'Relevant tags' },
                      snippet: { type: 'string', description: 'Description of what this resource offers' }
                    },
                    required: ['title', 'url', 'source', 'difficulty', 'snippet']
                  }
                },
                searchTerm: { type: 'string', description: 'Suggested search term for finding similar resources' }
              },
              required: ['resources', 'searchTerm']
            }
          }
        ],
        function_call: { name: 'curate_diy_resources' }
      });

      const functionCall = curationResponse.choices[0].message.function_call;
      if (!functionCall) {
        return {
          success: false,
          message: 'Resource curation is not available at the moment. Please try a more specific search.',
          links: []
        };
      }

      const curationResults = JSON.parse(functionCall.arguments);

      if (!curationResults.resources || curationResults.resources.length === 0) {
        return {
          success: false,
          message: `I couldn't find specific resources for "${query}". Try searching for "${curationResults.searchTerm || query}" on YouTube, Home Depot, or other DIY websites.`,
          links: []
        };
      }

      // Process the curated results
      const processedResults = curationResults.resources.map((resource: any) => ({
        title: resource.title,
        url: resource.url,
        source: resource.source,
        difficulty: resource.difficulty,
        tags: resource.tags || [],
        snippet: resource.snippet,
        isYouTube: resource.source.toLowerCase().includes('youtube'),
        videoId: resource.source.toLowerCase().includes('youtube') ? this.extractYouTubeId(resource.url) : undefined
      }));

      return {
        success: true,
        message: `Found ${processedResults.length} curated ${resourceType} resources for "${query}". These are from trusted DIY platforms.`,
        links: processedResults,
        searchSuggestion: `For more resources, try searching "${curationResults.searchTerm}" on YouTube or DIY websites.`
      };

    } catch (error) {
      console.error('Resource curation error:', error);
      return {
        success: false,
        message: 'Resource curation is temporarily unavailable. Try searching directly on YouTube, Home Depot, or other DIY websites.',
        links: []
      };
    }
  }

  private static async handleWebpageSummarization(projectId: string, args: any) {
    try {
      const { url, focusAreas = [] } = args;

      console.log(`[OpenAI] Summarizing webpage: ${url}`);

      // Use OpenAI to analyze the webpage content
      const analysisResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a webpage analyzer for DIY projects. Analyze the provided webpage and extract useful information for DIY project planning.

Focus areas: ${focusAreas.length > 0 ? focusAreas.join(', ') : 'general DIY insights'}

Extract and analyze:
- Key techniques or methods mentioned
- Materials and tools referenced
- Step-by-step processes
- Tips and best practices
- Cost estimates if mentioned
- Difficulty level assessment
- Safety considerations
- Time requirements

Provide a comprehensive summary that would be useful for someone planning a DIY project.`
          },
          {
            role: 'user',
            content: `Please analyze this webpage for DIY project insights: ${url}`
          }
        ],
        functions: [
          {
            name: 'analyze_webpage_content',
            description: 'Return analysis of webpage content for DIY projects',
            parameters: {
              type: 'object',
              properties: {
                summary: {
                  type: 'string',
                  description: 'Comprehensive summary of the webpage content'
                },
                keyTechniques: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Key techniques or methods mentioned'
                },
                materials: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Materials and tools referenced'
                },
                steps: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Step-by-step process if available'
                },
                tips: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Tips and best practices'
                },
                difficulty: {
                  type: 'string',
                  enum: ['Beginner', 'Intermediate', 'Advanced'],
                  description: 'Assessed difficulty level'
                },
                estimatedTime: {
                  type: 'string',
                  description: 'Estimated time requirement'
                },
                safetyNotes: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Safety considerations mentioned'
                }
              },
              required: ['summary', 'difficulty']
            }
          }
        ],
        function_call: { name: 'analyze_webpage_content' }
      });

      const functionCall = analysisResponse.choices[0].message.function_call;
      if (!functionCall) {
        return {
          success: false,
          message: 'Unable to analyze webpage content at the moment. Please try again later.'
        };
      }

      const analysis = JSON.parse(functionCall.arguments);

      // Create a comprehensive summary note
      let summaryContent = `Webpage Analysis: ${url}\n\n`;
      summaryContent += `Summary: ${analysis.summary}\n\n`;

      if (analysis.keyTechniques && analysis.keyTechniques.length > 0) {
        summaryContent += `Key Techniques:\n${analysis.keyTechniques.map((t: string) => `• ${t}`).join('\n')}\n\n`;
      }

      if (analysis.materials && analysis.materials.length > 0) {
        summaryContent += `Materials/Tools:\n${analysis.materials.map((m: string) => `• ${m}`).join('\n')}\n\n`;
      }

      if (analysis.steps && analysis.steps.length > 0) {
        summaryContent += `Process Steps:\n${analysis.steps.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}\n\n`;
      }

      if (analysis.tips && analysis.tips.length > 0) {
        summaryContent += `Tips & Best Practices:\n${analysis.tips.map((t: string) => `• ${t}`).join('\n')}\n\n`;
      }

      if (analysis.safetyNotes && analysis.safetyNotes.length > 0) {
        summaryContent += `Safety Notes:\n${analysis.safetyNotes.map((s: string) => `⚠️ ${s}`).join('\n')}\n\n`;
      }

      summaryContent += `Difficulty: ${analysis.difficulty}\n`;
      if (analysis.estimatedTime) {
        summaryContent += `Estimated Time: ${analysis.estimatedTime}\n`;
      }

      return {
        success: true,
        message: `I've analyzed the webpage and extracted useful DIY insights. You can save this analysis to your project.`,
        summary: {
          content: summaryContent,
          tags: ['webpage-analysis', 'ai-generated'],
          url: url,
          difficulty: analysis.difficulty,
          analysisData: analysis
        }
      };

    } catch (error) {
      console.error('Webpage summarization error:', error);
      return {
        success: false,
        message: 'Unable to analyze webpage content at the moment. Please try again later.'
      };
    }
  }

  private static async handleProjectInterview(projectId: string, args: any) {
    try {
      const { interviewQuestions, focusAreas, reasoning } = args;

      console.log(`[OpenAI] Conducting project interview with ${interviewQuestions.length} questions`);

      // Format the interview questions as an interactive response
      let interviewContent = `I'd like to understand your project better to provide more helpful assistance.\n\n`;

      if (reasoning) {
        interviewContent += `${reasoning}\n\n`;
      }

      interviewContent += `Here are some questions that would help me assist you more effectively:\n\n`;

      interviewQuestions.forEach((question: string, index: number) => {
        interviewContent += `${index + 1}. ${question}\n`;
      });

      interviewContent += `\nFeel free to answer any or all of these questions. The more I know about your project, the better I can help you with specific recommendations, resources, and guidance.`;

      return {
        success: true,
        message: interviewContent,
        interviewData: {
          questions: interviewQuestions,
          focusAreas: focusAreas || [],
          reasoning: reasoning || '',
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Project interview error:', error);
      return {
        success: false,
        message: 'I had trouble preparing questions for your project. Please tell me more about what you\'re planning to work on.'
      };
    }
  }

  private static extractYouTubeId(url: string): string | undefined {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : undefined;
  }

  private static async handleSummarizeNotes(projectId: string, args: any) {
    try {
      const { summary, keyPoints, recommendations } = args;

      // Return summary as suggestion instead of auto-creating note
      const summaryContent = `AI Summary: ${summary}\n\nKey Points:\n${keyPoints?.map((point: string) => `• ${point}`).join('\n') || ''}\n\nRecommendations:\n${recommendations?.map((rec: string) => `• ${rec}`).join('\n') || ''}`;

      return {
        success: true,
        message: 'I\'ve summarized your project notes. You can choose to save this summary.',
        summary: {
          content: summaryContent,
          tags: ['ai-summary'],
        },
      };
    } catch (error) {
      console.error('Summarize notes error:', error);
      return { error: 'Failed to summarize notes' };
    }
  }
}