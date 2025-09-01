import { Request, Response } from 'express';
import GitDataService from '../services/gitDataService.js';
import { ApiResponse } from '../types/data.js';

const gitDataService = new GitDataService();

/**
 * Initialize Git repository
 */
export async function initializeGitRepo(req: Request, res: Response): Promise<void> {
  try {
    await gitDataService.initializeGitRepo();
    
    const response: ApiResponse = {
      success: true,
      message: 'Git repository initialized successfully'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to initialize Git repository:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to initialize Git repository'
    };
    res.status(500).json(response);
  }
}

/**
 * Export data to Git repository
 */
export async function exportToGit(req: Request, res: Response): Promise<void> {
  try {
    const { userId, commitMessage } = req.body;
    const gitPath = await gitDataService.exportToGit(userId, commitMessage);
    
    const response: ApiResponse = {
      success: true,
      data: { gitPath },
      message: 'Data exported to Git repository successfully'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to export to Git:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to export data to Git repository'
    };
    res.status(500).json(response);
  }
}

/**
 * Create Tangled-compatible export
 */
export async function exportForTangled(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: 'User ID is required'
      };
      res.status(400).json(response);
      return;
    }
    
    const exportPath = await gitDataService.exportForTangled(userId);
    
    const response: ApiResponse = {
      success: true,
      data: { exportPath },
      message: 'Tangled export created successfully'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to create Tangled export:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create Tangled export'
    };
    res.status(500).json(response);
  }
}

/**
 * Create CSV export
 */
export async function exportToCSV(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.query;
    const exportPath = await gitDataService.exportToCSV(userId as string);
    
    const response: ApiResponse = {
      success: true,
      data: { exportPath },
      message: 'CSV export created successfully'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to create CSV export:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to create CSV export'
    };
    res.status(500).json(response);
  }
}

/**
 * Get Git repository status
 */
export async function getGitStatus(req: Request, res: Response): Promise<void> {
  try {
    const status = await gitDataService.getGitStatus();
    
    const response: ApiResponse = {
      success: true,
      data: status
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to get Git status:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get Git repository status'
    };
    res.status(500).json(response);
  }
}

/**
 * List available exports
 */
export async function listExports(req: Request, res: Response): Promise<void> {
  try {
    const exports = await gitDataService.listExports();
    
    const response: ApiResponse = {
      success: true,
      data: exports
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to list exports:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to list exports'
    };
    res.status(500).json(response);
  }
}

/**
 * Download export file
 */
export async function downloadExport(req: Request, res: Response): Promise<void> {
  try {
    const { fileName } = req.params;
    const exports = await gitDataService.listExports();
    const exportFile = exports.find(e => e.fileName === fileName);
    
    if (!exportFile) {
      const response: ApiResponse = {
        success: false,
        error: 'Export file not found'
      };
      res.status(404).json(response);
      return;
    }
    
    // Set appropriate headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Send file
    res.sendFile(exportFile.filePath);
  } catch (error) {
    console.error('Failed to download export:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to download export file'
    };
    res.status(500).json(response);
  }
}