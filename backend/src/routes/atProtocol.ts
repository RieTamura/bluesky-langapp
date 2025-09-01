import { Router } from 'express';
import {
  initializeATProtocol,
  postLearningProgress,
  generateSharedData,
  getPostHistory,
  getPostTemplates,
  getAuthStatus,
  logout,
  autoPostMilestone
} from '../controllers/atProtocolController.js';
import {
  getATProtocolIntegration,
  getAPIIntegrationPlan,
  getPlannedFeatures,
  getCompatibilityMatrix,
  generateAPIDocumentation
} from '../controllers/futureAPIController.js';

const router = Router();

// Authentication and initialization
router.post('/init', initializeATProtocol);
router.get('/auth/status', getAuthStatus);
router.post('/auth/logout', logout);

// Learning progress posting
router.post('/post/progress', postLearningProgress);
router.post('/post/milestone', autoPostMilestone);

// Shared data generation
router.get('/shared-data/:userId', generateSharedData);

// Post management
router.get('/posts/history', getPostHistory);
router.get('/posts/templates', getPostTemplates);

// Future API integration endpoints
router.get('/integration/spec', getATProtocolIntegration);
router.get('/integration/roadmap', getAPIIntegrationPlan);
router.get('/integration/features', getPlannedFeatures);
router.get('/integration/compatibility', getCompatibilityMatrix);
router.get('/integration/docs', generateAPIDocumentation);

export default router;