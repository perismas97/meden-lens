import { ChatOllama } from "@langchain/ollama";
import type { BaseMessage } from "langchain";
import type { z } from "zod";

export interface ProviderTokenUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

export interface AgentToolCall {
  name: string;
  args: Record<string, unknown>;
  id?: string;
}

export type AgentModelMessage = BaseMessage & {
  tool_calls?: AgentToolCall[];
  usage_metadata?: ProviderTokenUsage;
};

export interface StructuredAgentResponse {
  raw: AgentModelMessage;
  parsed: unknown;
}

export interface AgentModel {
  invokeWithTools(
    messages: BaseMessage[],
    tools: readonly unknown[],
  ): Promise<AgentModelMessage>;
  invokeStructured(
    messages: BaseMessage[],
    schema: z.ZodType,
  ): Promise<StructuredAgentResponse>;
}

export interface OllamaAgentModelOptions {
  model: string;
  baseUrl: string;
}

export class OllamaAgentModel implements AgentModel {
  private readonly model: ChatOllama;

  constructor(options: OllamaAgentModelOptions) {
    this.model = new ChatOllama({
      model: options.model,
      baseUrl: options.baseUrl,
      temperature: 0,
      maxRetries: 0,
      think: false,
    });
  }

  async invokeWithTools(
    messages: BaseMessage[],
    tools: readonly unknown[],
  ): Promise<AgentModelMessage> {
    const toolEnabledModel = this.model.bindTools(
      tools as Parameters<ChatOllama["bindTools"]>[0],
    );
    return (await toolEnabledModel.invoke(messages)) as AgentModelMessage;
  }

  async invokeStructured(
    messages: BaseMessage[],
    schema: z.ZodType,
  ): Promise<StructuredAgentResponse> {
    const structuredModel = this.model.withStructuredOutput(schema, {
      includeRaw: true,
    });
    const response = await structuredModel.invoke(messages);

    return {
      raw: response.raw as AgentModelMessage,
      parsed: response.parsed,
    };
  }
}
