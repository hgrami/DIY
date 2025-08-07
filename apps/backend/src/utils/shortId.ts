import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Generate a random string of specified length
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate a unique shortId for projects
export async function generateShortId(length: number = 8): Promise<string> {
  let shortId: string;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    shortId = generateRandomString(length);
    
    // Check if this shortId already exists
    const existingProject = await prisma.project.findUnique({
      where: { shortId },
    });

    if (!existingProject) {
      isUnique = true;
    } else {
      attempts++;
    }
  }

  if (!isUnique) {
    throw new Error('Failed to generate unique shortId after maximum attempts');
  }

  return shortId!;
}

// Validate shortId format
export function isValidShortId(shortId: string): boolean {
  // Allow alphanumeric characters, 6-12 characters long
  const shortIdRegex = /^[a-zA-Z0-9]{6,12}$/;
  return shortIdRegex.test(shortId);
}