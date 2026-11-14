import { Router, Request, Response } from 'express';
import fs from 'fs';
import { getRepository } from '../repository';
import { requireAuth } from '../middleware/auth';
import { formatSuccessResponse, formatErrorResponse } from '../types';

export const filesRouter = Router();

// GET /api/files (List user's generated files)
filesRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const files = await repo.getGeneratedFiles(req.user!.id);
  res.json(formatSuccessResponse(files, 'Generated files retrieved'));
});

// GET /api/files/:id (download alias)
filesRouter.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const file = await repo.getGeneratedFileById(req.params.id);

  if (!file || !fs.existsSync(file.storagePath)) {
    res.status(404).json(formatErrorResponse('File not found.'));
    return;
  }

  res.setHeader('Content-Type', file.mimeType || 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);

  const fileStream = fs.createReadStream(file.storagePath);
  fileStream.pipe(res);
});

// GET /api/files/:id/download
filesRouter.get('/:id/download', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const file = await repo.getGeneratedFileById(req.params.id);

  if (!file) {
    res.status(404).json(formatErrorResponse('File not found.'));
    return;
  }

  // Ensure file exists on disk
  if (!fs.existsSync(file.storagePath)) {
    res.status(404).json(formatErrorResponse('File storage payload missing or removed.'));
    return;
  }

  res.setHeader('Content-Type', file.mimeType || 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);

  const fileStream = fs.createReadStream(file.storagePath);
  fileStream.pipe(res);
});

// GET /api/files/:id/view (inline view for PDF preview)
filesRouter.get('/:id/view', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const file = await repo.getGeneratedFileById(req.params.id);

  if (!file || !fs.existsSync(file.storagePath)) {
    res.status(404).json(formatErrorResponse('File not found.'));
    return;
  }

  res.setHeader('Content-Type', file.mimeType || 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${file.fileName}"`);

  const fileStream = fs.createReadStream(file.storagePath);
  fileStream.pipe(res);
});

// DELETE /api/files/:id
filesRouter.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const repo = getRepository();
  const file = await repo.getGeneratedFileById(req.params.id, req.user!.id);

  if (!file) {
    res.status(404).json(formatErrorResponse('File not found or unauthorized'));
    return;
  }

  // Remove from disk if exists
  if (fs.existsSync(file.storagePath)) {
    try {
      fs.unlinkSync(file.storagePath);
    } catch {
      // Ignore unlink errors
    }
  }

  await repo.deleteGeneratedFile(req.params.id, req.user!.id);
  res.json(formatSuccessResponse({ deleted: true }, 'File deleted successfully'));
});
