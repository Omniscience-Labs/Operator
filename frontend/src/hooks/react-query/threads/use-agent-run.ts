import { createMutationHook, createQueryHook } from "@/hooks/use-query";
import { threadKeys } from "./keys";
import { BillingError, getAgentRuns, startAgent, stopAgent } from "@/lib/api";

export const useAgentRunsQuery = (threadId: string) =>
  createQueryHook(
    threadKeys.agentRuns(threadId),
    () => getAgentRuns(threadId),
    {
      enabled: !!threadId,
      retry: 1,
    }
  )();

export const useStartAgentMutation = () =>
  createMutationHook(
    ({
      threadId,
      options,
    }: {
      threadId: string;
      options?: {
        model_name?: string;
        enable_thinking?: boolean;
        reasoning_effort?: string;
        stream?: boolean;
        agent_id?: string;
        user_name?: string;
      };
    }) => startAgent(threadId, options),
    {
      onError: (error) => {
        if (!(error instanceof BillingError)) {
          throw error;
        }
      },
    }
  )();

export const useStopAgentMutation = () =>
  createMutationHook((agentRunId: string) => stopAgent(agentRunId))();
