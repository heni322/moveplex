// ===================================================
// Updated FileUploadService with domain and port
// ===================================================

import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

export interface UploadResult {
  filename: string;
  originalName: string;
  relativePath: string;
  fullUrl: string;
  size: number;
  mimetype: string;
}

@Injectable()
export class FileUploadService {
  private readonly uploadsDir: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadsDir = this.configService.get<string>('UPLOADS_DIR', './uploads');
  }

  // Dynamically generate base URL from request
  private getBaseUrl(req?: any): string {
    // Try to get from request object if available
    if (req) {
      const protocol = req.protocol || (req.secure ? 'https' : 'http');
      const host = req.get('host') || req.headers.host;
      return `${protocol}://${host}`;
    }

    // Fallback to environment or auto-detection
    const port = this.configService.get<number>('PORT', 3000);
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    
    // Auto-detect based on environment
    if (nodeEnv === 'production') {
      
      const renderUrl = process.env.RENDER_EXTERNAL_URL;
      if (renderUrl) {
        return renderUrl;
      }
      
      // Default production assumption
      return `https://localhost:${port}`;
    }
    
    // Development fallback
    return `http://localhost:${port}`;
  }

  async uploadFile(file: Express.Multer.File, folder: string, req?: any): Promise<string> {
    try {
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'uploads', folder);
      await fs.mkdir(uploadsDir, { recursive: true });

      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExtension}`;
      const filePath = path.join(uploadsDir, fileName);

      // Save file
      await fs.writeFile(filePath, file.buffer);

      // Return full URL with dynamically detected domain and port
      const relativePath = `/uploads/${folder}/${fileName}`;
      const baseUrl = this.getBaseUrl(req);
      return `${baseUrl}${relativePath}`;
    } catch (error) {
      throw new BadRequestException('Failed to upload file');
    }
  }

  // Enhanced upload method that returns more details
  async uploadFileDetailed(file: Express.Multer.File, folder: string, req?: any): Promise<UploadResult> {
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads', folder);
      await fs.mkdir(uploadsDir, { recursive: true });

      const fileExtension = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExtension}`;
      const filePath = path.join(uploadsDir, fileName);

      await fs.writeFile(filePath, file.buffer);

      const relativePath = `/uploads/${folder}/${fileName}`;
      const baseUrl = this.getBaseUrl(req);
      const fullUrl = `${baseUrl}${relativePath}`;

      return {
        filename: fileName,
        originalName: file.originalname,
        relativePath,
        fullUrl,
        size: file.size,
        mimetype: file.mimetype,
      };
    } catch (error) {
      throw new BadRequestException('Failed to upload file');
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      // Handle both relative paths and full URLs
      let relativePath = filePath;
      if (filePath.startsWith('http')) {
        // Extract relative path from full URL
        const url = new URL(filePath);
        relativePath = url.pathname;
      }
      
      // Remove leading slash if present
      if (relativePath.startsWith('/')) {
        relativePath = relativePath.substring(1);
      }
      
      const fullPath = path.join(process.cwd(), relativePath);
      await fs.unlink(fullPath);
    } catch (error) {
      console.warn(`Failed to delete file: ${filePath}`, error);
    }
  }
}
