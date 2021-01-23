import { getOrCreate } from './helper-functions';
import { WorkerMessageService } from './message-service';
export type WorkerConstructor = typeof import('worker-loader?').default;

const workerMap = new WeakMap<WorkerConstructor, Worker>();
const workerServiceMap = new WeakMap<Worker, WorkerMessageService>();

export function getWorkerService(Worker?: WorkerConstructor | null) {
  if (!Worker) return WorkerMessageService.host;
  const instance = getOrCreate(workerMap, Worker, Worker);
  return getOrCreate(workerServiceMap, instance, WorkerMessageService, instance);
}
