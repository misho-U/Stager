import { z } from 'zod';

/** Whether the test error was sent: false while error reporting is off. */
export const monitoringTestResultSchema = z.object({ sent: z.boolean() });

export type MonitoringTestResult = z.infer<typeof monitoringTestResultSchema>;
