/*
import { getWorkerService } from '../utils/worker-register';
import SceneWorker from 'worker-loader?filename=worker.[contenthash].js!../worker';
*/
import { LoopbackMessageService } from '../utils/message-service';

// This was `getWorkerService(...)`, but as we are not using the remote worker renderer anymore, we just loopback the events in main world.
const workerService = new LoopbackMessageService();
export default workerService;
