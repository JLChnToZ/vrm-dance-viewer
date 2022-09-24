// This file is a shim layer for removing unsupported remote renderer modal
// While maintaining the structure
import { MessageServiceBase } from '../utils/message-service';
import workerService from '../host/worker-service';

export namespace WorkerMessageService {
  export const host: MessageServiceBase = workerService;
}
