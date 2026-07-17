import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { LlmRouterService } from '@/modules/llm/llm-router.service';

function fakeConfig(env: Record<string, string>): ConfigService {
  return { get: (key: string) => env[key] } as unknown as ConfigService;
}

function rateLimitError() {
  return Object.assign(new Error('rate limited'), { status: 429 });
}

function authError() {
  return Object.assign(new Error('bad api key'), { status: 401 });
}

function badRequestError() {
  return Object.assign(new Error('malformed prompt'), { status: 400 });
}

describe('LlmRouterService', () => {
  it('picks the first key of the first configured provider by default', async () => {
    const service = new LlmRouterService(
      fakeConfig({ LLM_PROVIDER_ORDER: 'anthropic', ANTHROPIC_API_KEYS: 'key-a1,key-a2' }),
    );
    const buildModel = jest.spyOn(service as never, 'buildModel').mockReturnValue({} as never);

    await service.invokeWithFallback(async () => 'ok');

    expect(buildModel).toHaveBeenCalledTimes(1);
    expect(buildModel).toHaveBeenCalledWith('anthropic', 'key-a1', expect.any(String));
  });

  it('round-robins keys within a provider across calls', async () => {
    const service = new LlmRouterService(
      fakeConfig({ LLM_PROVIDER_ORDER: 'anthropic', ANTHROPIC_API_KEYS: 'key-a1,key-a2' }),
    );
    const buildModel = jest.spyOn(service as never, 'buildModel').mockReturnValue({} as never);

    await service.invokeWithFallback(async () => 'ok');
    await service.invokeWithFallback(async () => 'ok');
    await service.invokeWithFallback(async () => 'ok');

    expect(buildModel.mock.calls.map((call) => call[1])).toEqual(['key-a1', 'key-a2', 'key-a1']);
  });

  it('rotates to the next key on a retryable error, then succeeds', async () => {
    const service = new LlmRouterService(
      fakeConfig({ LLM_PROVIDER_ORDER: 'anthropic', ANTHROPIC_API_KEYS: 'key-a1,key-a2' }),
    );
    jest.spyOn(service as never, 'buildModel').mockReturnValue({} as never);

    let attempt = 0;
    const result = await service.invokeWithFallback(async () => {
      attempt += 1;
      if (attempt === 1) throw rateLimitError();
      return 'ok-on-second-key';
    });

    expect(result).toBe('ok-on-second-key');
    expect(attempt).toBe(2);
  });

  it('falls back to the next provider once a provider exhausts all its keys', async () => {
    const service = new LlmRouterService(
      fakeConfig({
        LLM_PROVIDER_ORDER: 'anthropic,openai',
        ANTHROPIC_API_KEYS: 'key-a1',
        OPENAI_API_KEYS: 'key-o1',
      }),
    );
    const buildModel = jest.spyOn(service as never, 'buildModel').mockReturnValue({} as never);

    let attempt = 0;
    const result = await service.invokeWithFallback(async () => {
      attempt += 1;
      if (attempt === 1) throw authError();
      return 'ok-from-openai';
    });

    expect(result).toBe('ok-from-openai');
    expect(buildModel.mock.calls.map((call) => call[0])).toEqual(['anthropic', 'openai']);
  });

  it('throws immediately on a non-retryable error without burning through other keys', async () => {
    const service = new LlmRouterService(
      fakeConfig({ LLM_PROVIDER_ORDER: 'anthropic', ANTHROPIC_API_KEYS: 'key-a1,key-a2' }),
    );
    const buildModel = jest.spyOn(service as never, 'buildModel').mockReturnValue({} as never);

    await expect(
      service.invokeWithFallback(async () => {
        throw badRequestError();
      }),
    ).rejects.toThrow('malformed prompt');

    expect(buildModel).toHaveBeenCalledTimes(1);
  });

  it('throws ServiceUnavailableException once every provider/key combination fails', async () => {
    const service = new LlmRouterService(
      fakeConfig({
        LLM_PROVIDER_ORDER: 'anthropic,openai',
        ANTHROPIC_API_KEYS: 'key-a1',
        OPENAI_API_KEYS: 'key-o1',
      }),
    );
    jest.spyOn(service as never, 'buildModel').mockReturnValue({} as never);

    await expect(
      service.invokeWithFallback(async () => {
        throw rateLimitError();
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('throws ServiceUnavailableException when no provider is configured at all', async () => {
    const service = new LlmRouterService(fakeConfig({}));

    await expect(service.invokeWithFallback(async () => 'unreachable')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
