-- AlterTable
ALTER TABLE "ai_chat_messages" ADD COLUMN     "threadId" TEXT;

-- CreateTable
CREATE TABLE "ai_chat_threads" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_chat_threads_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ai_chat_threads" ADD CONSTRAINT "ai_chat_threads_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ai_chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
