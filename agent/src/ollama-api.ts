export type OllamaRole = "system" | "user" | "assistant" | "tool";

export interface OllamaToolCall {
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

export interface OllamaMessage {
  role: OllamaRole;
  content: string;
  tool_calls?: OllamaToolCall[];
  tool_name?: string;
}

export interface OllamaTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      required: string[];
      properties: Record<string, Record<string, unknown>>;
    };
  };
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  tools?: OllamaTool[];
  stream: false;
  think?: boolean;
  keep_alive?: string;
  options?: {
    temperature?: number;
    seed?: number;
  };
}

export interface OllamaChatResponse {
  model: string;
  message: OllamaMessage;
  done: boolean;
  done_reason?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export interface OllamaModelSummary {
  name: string;
  model: string;
  size: number;
  digest: string;
  details?: {
    family?: string;
    parameter_size?: string;
    quantization_level?: string;
  };
}

export interface OllamaRunningModel extends OllamaModelSummary {
  size_vram: number;
  context_length: number;
}

export interface OllamaApi {
  listModels(): Promise<OllamaModelSummary[]>;
  listRunningModels(): Promise<OllamaRunningModel[]>;
  chat(request: OllamaChatRequest): Promise<OllamaChatResponse>;
}

export class OllamaHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "OllamaHttpError";
    this.status = status;
  }
}

export class OllamaHttpClient implements OllamaApi {
  readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(baseUrl = "http://localhost:11434", timeoutMs = 180_000) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.timeoutMs = timeoutMs;
  }

  async listModels(): Promise<OllamaModelSummary[]> {
    const response = await this.request<{ models: OllamaModelSummary[] }>("/api/tags");
    return response.models;
  }

  async listRunningModels(): Promise<OllamaRunningModel[]> {
    const response = await this.request<{ models: OllamaRunningModel[] }>("/api/ps");
    return response.models;
  }

  chat(request: OllamaChatRequest): Promise<OllamaChatResponse> {
    return this.request<OllamaChatResponse>("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Cannot reach Ollama at ${this.baseUrl}: ${reason}`);
    }

    if (!response.ok) {
      const body = await response.text();
      throw new OllamaHttpError(response.status, body || response.statusText);
    }

    return (await response.json()) as T;
  }
}
