import { createMutationHook, createQueryHook } from "@/hooks/use-query";
import { threadKeys } from "./keys";
import { addUserMessage, getMessages, editMessage } from "@/lib/api";

export const useMessagesQuery = (threadId: string) =>
  createQueryHook(
    threadKeys.messages(threadId),
    () => getMessages(threadId),
    {
      enabled: !!threadId,
      retry: 1,
    }
  )();

export const useAddUserMessageMutation = () =>
  createMutationHook(
    ({
      threadId,
      message,
    }: {
      threadId: string;
      message: string;
    }) => addUserMessage(threadId, message)
  )();

export const useEditMessage = () =>
  createMutationHook(
    async ({ 
      threadId, 
      messageId, 
      newContent 
    }: {
      threadId: string;
      messageId: string;
      newContent: string;
    }) => {
      const result = await editMessage(threadId, messageId, newContent);
      return result;
    },
    {
      errorContext: {
        operation: 'edit message',
        resource: 'message'
      }
    }
  )();
