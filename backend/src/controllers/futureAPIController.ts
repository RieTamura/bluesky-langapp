import { Request, Response } from 'express';
import FutureAPIService from '../services/futureAPIService.js';
import type { ApiResponse } from '../types/data.js';

const futureAPIService = new FutureAPIService();

/**
 * Get AT Protocol integration specification
 */
export async function getATProtocolIntegration(req: Request, res: Response): Promise<void> {
  try {
    const integration = futureAPIService.getATProtocolIntegration();
    
    const response: ApiResponse = {
      success: true,
      data: integration
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to get AT Protocol integration:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve AT Protocol integration specification'
    };
    res.status(500).json(response);
  }
}

/**
 * Get API integration roadmap
 */
export async function getAPIIntegrationPlan(req: Request, res: Response): Promise<void> {
  try {
    const plan = futureAPIService.getAPIIntegrationPlan();
    
    const response: ApiResponse = {
      success: true,
      data: plan
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to get API integration plan:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve API integration plan'
    };
    res.status(500).json(response);
  }
}

/**
 * Get planned features for future releases
 */
export async function getPlannedFeatures(req: Request, res: Response): Promise<void> {
  try {
    const features = futureAPIService.getPlannedFeatures();
    
    const response: ApiResponse = {
      success: true,
      data: features
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to get planned features:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve planned features'
    };
    res.status(500).json(response);
  }
}

/**
 * Get compatibility matrix for data formats
 */
export async function getCompatibilityMatrix(req: Request, res: Response): Promise<void> {
  try {
    const matrix = futureAPIService.getCompatibilityMatrix();
    
    const response: ApiResponse = {
      success: true,
      data: matrix
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to get compatibility matrix:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve compatibility matrix'
    };
    res.status(500).json(response);
  }
}

/**
 * Generate API documentation for future endpoints
 */
export async function generateAPIDocumentation(req: Request, res: Response): Promise<void> {
  try {
    const documentation = futureAPIService.generateAPIDocumentation();
    
    const response: ApiResponse = {
      success: true,
      data: documentation
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to generate API documentation:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to generate API documentation'
    };
    res.status(500).json(response);
  }
}