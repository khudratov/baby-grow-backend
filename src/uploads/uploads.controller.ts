import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { uploadsMulterOptions } from './uploads.config';

@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  @Post()
  @UseInterceptors(FileInterceptor('file', uploadsMulterOptions))
  async upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      return { error: 'Missing file' };
    }
    return { url: `/uploads/${file.filename}` };
  }
}
