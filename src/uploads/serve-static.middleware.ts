import { join } from 'path';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

/**
 * Serves files from the uploads/ directory.
 * Applied to GET /uploads/* via UploadsModule.configure().
 * Running as NestJS middleware ensures it executes before the NestJS router
 * so that uploaded files are served even though there is no explicit GET controller.
 */
@Injectable()
export class ServeStaticMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Extract the filename from the URL: /uploads/<filename>
    const parts = req.url.split('?')[0].split('/');
    // Under NestJS middleware, req.url is the full path e.g. /uploads/abc.png
    // Find the segment after 'uploads'
    const uploadsIdx = parts.findIndex(p => p === 'uploads');
    const filename =
      uploadsIdx >= 0 ? parts.slice(uploadsIdx + 1).join('/') : '';
    if (!filename) {
      next();
      return;
    }
    const filePath = join(process.cwd(), 'uploads', filename);
    res.sendFile(filePath, err => {
      if (err) {
        next();
      }
    });
  }
}
