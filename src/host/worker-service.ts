import { getWorkerService } from '../utils/worker-register';
import SceneWorker from 'worker-loader?filename=worker.[contenthash].js!../worker';

const workerService = getWorkerService(SceneWorker);
export default workerService;
