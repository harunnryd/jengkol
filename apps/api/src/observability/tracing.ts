import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { LangfuseSpanProcessor } from '@langfuse/otel';

/**
 * Must be imported and started before the Nest app is created — auto-instrumentation
 * patches modules (http, pg, etc.) at require-time, so this has to run first.
 */
export function startTracing(): NodeSDK {
  const serviceName = process.env.OTEL_SERVICE_NAME ?? 'jengkol-api';
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318';

  const spanProcessors = [];
  if (process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY) {
    spanProcessors.push(new LangfuseSpanProcessor());
  }

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
    }),
    traceExporter: new OTLPTraceExporter({
      url: `${endpoint}/v1/traces`,
    }),
    spanProcessors,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();
  process.on('SIGTERM', () => {
    sdk.shutdown().finally(() => process.exit(0));
  });

  return sdk;
}
