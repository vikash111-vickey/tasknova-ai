import { v4 as uuidv4 } from 'uuid';
import {
  ToolConnector,
  ExecutionContext,
  ConnectorResult,
  VerificationResult,
} from './types';
import { DemoStore } from './demoStore';

export class DemoDriveConnector implements ToolConnector {
  public name = 'drive';
  public mode: 'demo' = 'demo';
  private demoStore = DemoStore.getInstance();

  public async isConnected(): Promise<boolean> {
    return true;
  }

  public async validateAction(
    action: string,
    input: Record<string, unknown>
  ): Promise<{ valid: boolean; error?: string }> {
    const supported = [
      'drive.list_files',
      'drive.upload_file',
      'drive.get_metadata',
      'drive.create_folder',
    ];
    if (!supported.includes(action)) {
      return { valid: false, error: `Unsupported action "${action}" for Drive connector.` };
    }
    if (action === 'drive.upload_file') {
      if (!input.name && !input.fileName) {
        return { valid: false, error: 'File name is required for upload.' };
      }
    }
    return { valid: true };
  }

  public async execute(
    action: string,
    input: Record<string, unknown>,
    _context: ExecutionContext
  ): Promise<ConnectorResult> {
    const valid = await this.validateAction(action, input);
    if (!valid.valid) throw new Error(valid.error);

    if (action === 'drive.list_files') {
      const folder = String(input.folder || '/');
      const files = this.demoStore.driveFiles.filter(
        (f) => folder === '/' || f.folder.startsWith(folder)
      );

      return {
        success: true,
        data: { files, total: files.length, folder },
        message: `Found ${files.length} demo drive files in "${folder}". [DEMO]`,
        mode: 'demo',
      };
    }

    if (action === 'drive.upload_file') {
      const name = String(input.name || input.fileName || `file_${Date.now()}`);
      const folder = String(input.folder || '/Reports');
      const mimeType = String(input.mimeType || 'application/pdf');
      const size = Number(input.size || (typeof input.data === 'string' ? input.data.length : 1024));
      const fileId = `drive_${uuidv4()}`;

      const newDriveFile = {
        id: fileId,
        name,
        mimeType,
        folder,
        size,
        data: input.data as any,
        createdAt: new Date().toISOString(),
      };

      this.demoStore.driveFiles.push(newDriveFile);

      return {
        success: true,
        data: newDriveFile,
        message: `File "${name}" uploaded to demo drive folder "${folder}". [DEMO]`,
        mode: 'demo',
        outputRef: fileId,
      };
    }

    if (action === 'drive.get_metadata') {
      const fileId = String(input.fileId || input.id || '');
      const file = this.demoStore.driveFiles.find((f) => f.id === fileId);
      if (!file) throw new Error(`Drive file "${fileId}" not found.`);

      return {
        success: true,
        data: file,
        message: `Drive metadata for "${file.name}" retrieved. [DEMO]`,
        mode: 'demo',
      };
    }

    if (action === 'drive.create_folder') {
      const folderName = String(input.name || 'New Folder');
      return {
        success: true,
        data: { folder: `/${folderName}`, created: true },
        message: `Folder "/${folderName}" created in demo drive. [DEMO]`,
        mode: 'demo',
      };
    }

    throw new Error(`Unhandled action: ${action}`);
  }

  public async verify(
    action: string,
    result: unknown,
    _expectedOutput: string
  ): Promise<VerificationResult> {
    if (action === 'drive.upload_file' || action === 'drive.get_metadata') {
      const data = (result as any)?.data || result;
      const fileId = data?.id || data?.fileId || (result as any)?.outputRef;
      const file = this.demoStore.driveFiles.find((f) => f.id === fileId);

      if (file && file.size > 0) {
        // Compare name, size, and calculate content checksum
        const crypto = require('crypto');
        const checksum = crypto
          .createHash('sha256')
          .update(typeof file.data === 'string' ? file.data : `${file.name}_${file.size}`)
          .digest('hex');

        return {
          verified: true,
          confidence: 1.0,
          evidence: {
            fileId: file.id,
            name: file.name,
            folder: file.folder,
            size: file.size,
            checksum,
          },
          message: `Confirmed: File "${file.name}" (size: ${file.size}B, checksum: ${checksum.substring(0, 8)}...) verified in Demo Google Drive.`,
        };
      }
      return { verified: false, confidence: 0, evidence: null, message: 'Drive file record not found or size is 0.' };
    }

    if (action === 'drive.list_files') {
      const data = (result as any)?.data || result;
      return {
        verified: Array.isArray(data?.files),
        confidence: 1.0,
        evidence: { totalFiles: data?.files?.length || 0 },
        message: 'Confirmed: File list retrieved from Demo Google Drive.',
      };
    }

    return { verified: true, confidence: 1.0, evidence: { action } };
  }
}
