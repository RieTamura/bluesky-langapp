import { Router } from 'express';
import {
  initializeData,
  getUsers,
  getUserById,
  saveUser,
  updateUser,
  getWords,
  getWordById,
  createWord,
  updateWord,
  deleteWord,
  createBackup,
  listBackups,
  restoreFromBackup,
  getStats
} from '../controllers/dataController.js';

const router = Router();

// Data initialization
router.post('/initialize', initializeData);

// Statistics
router.get('/stats', getStats);

// User routes
router.get('/users', getUsers);
router.get('/users/:userId', getUserById);
router.post('/users', saveUser);
router.put('/users/:userId', updateUser);

// Word routes
router.get('/words', getWords);
router.get('/words/:wordId', getWordById);
router.post('/words', createWord);
router.put('/words/:wordId', updateWord);
router.delete('/words/:wordId', deleteWord);

// Backup routes
router.post('/backup', createBackup);
router.get('/backups', listBackups);
router.post('/restore/:backupFileName', restoreFromBackup);

export default router;