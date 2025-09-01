import { Router } from 'express';
import {
  initializeGitRepo,
  exportToGit,
  exportForTangled,
  exportToCSV,
  getGitStatus,
  listExports,
  downloadExport
} from '../controllers/gitDataController.js';

const router = Router();

// Git repository management
router.post('/git/init', initializeGitRepo);
router.post('/git/export', exportToGit);
router.get('/git/status', getGitStatus);

// Export functionality
router.post('/export/tangled/:userId', exportForTangled);
router.post('/export/csv', exportToCSV);
router.get('/exports', listExports);
router.get('/exports/:fileName', downloadExport);

export default router;