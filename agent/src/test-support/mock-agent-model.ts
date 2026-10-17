import { AIMessage, type BaseMessage } from "langchain";
import type { z } from "zod";

import type {
  AgentModel,
  AgentModelMessage,
  AgentToolCall,
  ProviderTokenUsage,
  StructuredAgentResponse,
} from "../model/agent-model.ts";

interface MockAgentModelOptions {
  toolCall: AgentToolCall;
  structuredResponses: unknown[];
  usage?: ProviderTokenUsage[];
}

export class MockAgentModel implements AgentModel {
  private readonly toolCall: AgentToolCall;
  private readonly structuredResponses: unknown[];
  private readonly usage: ProviderTokenUsage[];
  private callIndex = 0;

  constructor(options: MockAgentModelOptions) {
    this.toolCall = options.toolCall;
    this.structuredResponses = [...options.structuredResponses];
    this.usage = options.usage ?? [
      { input_tokens: 10, output_tokens: 2, total_tokens: 12 },
      { input_tokens: 20, output_tokens: 8, total_tokens: 28 },
    ];
  }

  async invokeWithTools(
    _messages: BaseMessage[],
    _tools: readonly unknown[],
  ): Promise<AgentModelMessage> {
    return this.message([this.toolCall]);
  }

  async invokeStructured(
    _messages: BaseMessage[],
    _schema: z.ZodType,
  ): Promise<StructuredAgentResponse> {
    const parsed = this.structuredResponses.shift();
    if (parsed === undefined) {
      throw new Error("Mock model has no structured response remaining.");
    }

    return {
      raw: this.message([]),
      parsed,
    };
  }

  private message(toolCalls: AgentToolCall[]): AgentModelMessage {
    const usage = this.usage[this.callIndex];
    this.callIndex += 1;
    return new AIMessage({
      content: "",
      tool_calls: toolCalls,
      ...(usage ? { usage_metadata: usage } : {}),
    }) as AgentModelMessage;
  }
}
