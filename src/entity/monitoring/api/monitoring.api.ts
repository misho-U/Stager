import {
  monitoringTestResultSchema,
  type MonitoringTestResult,
} from '@/entity/monitoring/model/monitoring.model';
import { clientFetch } from '@pkg/http/fetcher';

/** Asks the server to send Sentry a test error (owner only). */
export async function sendTestError(): Promise<MonitoringTestResult> {
  const raw = await clientFetch<unknown>('/api/admin/monitoring', { method: 'POST' });
  return monitoringTestResultSchema.parse(raw);
}
