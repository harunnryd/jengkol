import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { BaseMessage } from '@langchain/core/messages';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { LlmProviderName, LlmProviderState, isRetryableLlmError } from './llm-router.types';

/**
 * The router only ever calls `.invoke()`, so it depends on this minimal structural
 * shape rather than LangChain's `BaseChatModel<CallOptions, OutputMessageType>` —
 * each provider class parameterizes those generics slightly differently, which makes
 * the concrete classes structurally incompatible with a bare `BaseChatModel` return type.
 */
export interface ChatModelLike {
  invoke(messages: BaseMessage[]): Promise<{ content: unknown }>;
}

const DEFAULT_MODELS: Record<LlmProviderName, string> = {
  anthropic: 'claude-3-5-haiku-latest',
  openai: 'gpt-4o-mini',
};

/**
 * Rotates across API keys within a provider (round-robin) and falls back to the next
 * configured provider once a provider's keys are exhausted. Only providers with at
 * least one non-empty key are included, in the order given by LLM_PROVIDER_ORDER.
 */
@Injectable()
export class LlmRouterService {
  private readonly logger = new Logger(LlmRouterService.name);
  private readonly providers: LlmProviderState[];

  constructor(private readonly config: ConfigService) {
    this.providers = this.buildProviderStates();
  }

  private buildProviderStates(): LlmProviderState[] {
    const order = (this.config.get<string>('LLM_PROVIDER_ORDER') ?? 'anthropic,openai')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean) as LlmProviderName[];

    const keysByProvider: Record<LlmProviderName, string> = {
      anthropic: this.config.get<string>('ANTHROPIC_API_KEYS') ?? '',
      openai: this.config.get<string>('OPENAI_API_KEYS') ?? '',
    };

    const modelByProvider: Record<LlmProviderName, string> = {
      anthropic: this.config.get<string>('ANTHROPIC_MODEL') ?? DEFAULT_MODELS.anthropic,
      openai: this.config.get<string>('OPENAI_MODEL') ?? DEFAULT_MODELS.openai,
    };

    return order
      .map((name) => ({
        name,
        keys: keysByProvider[name]
          .split(',')
          .map((key) => key.trim())
          .filter(Boolean),
        keyIndex: 0,
        model: modelByProvider[name],
      }))
      .filter((provider) => provider.keys.length > 0);
  }

  protected buildModel(
    providerName: LlmProviderName,
    apiKey: string,
    model: string,
  ): ChatModelLike {
    switch (providerName) {
      case 'anthropic':
        return new ChatAnthropic({ apiKey, model });
      case 'openai':
        return new ChatOpenAI({ apiKey, model });
    }
  }

  /**
   * Runs `fn` against the next available provider/key. On a rate-limit or auth error
   * it rotates to the next key, then the next provider, until one succeeds or every
   * configured key has failed. Non-retryable errors (e.g. a bad prompt) bubble up
   * immediately instead of burning through every key.
   *
   * Known limitation: `provider.keyIndex` is shared mutable state read-then-incremented
   * before the `await` below, so concurrent calls can interleave and briefly break the
   * round-robin fairness guarantee (two concurrent requests could land on the same key).
   * Not fixed here — this is a low-throughput endpoint and a real fix needs a mutex/queue
   * that isn't worth the added complexity at this scale.
   */
  async invokeWithFallback<T>(fn: (model: ChatModelLike) => Promise<T>): Promise<T> {
    if (this.providers.length === 0) {
      throw new ServiceUnavailableException(
        'No LLM provider configured — set ANTHROPIC_API_KEYS and/or OPENAI_API_KEYS in .env',
      );
    }

    let lastError: unknown;
    for (const provider of this.providers) {
      for (let attempt = 0; attempt < provider.keys.length; attempt++) {
        const key = provider.keys[provider.keyIndex];
        provider.keyIndex = (provider.keyIndex + 1) % provider.keys.length;

        try {
          const model = this.buildModel(provider.name, key, provider.model);
          return await fn(model);
        } catch (error) {
          lastError = error;
          if (!isRetryableLlmError(error)) {
            throw error;
          }
          this.logger.warn(
            `${provider.name} key failed (retryable), rotating: ${(error as Error).message}`,
          );
        }
      }
    }

    throw new ServiceUnavailableException(
      `All configured LLM providers/keys failed: ${(lastError as Error)?.message}`,
    );
  }
}
