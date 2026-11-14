import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { ProofLedgerEntry, EvidenceRecord } from '../../types/models';
import { getRepository } from '../../repository';

export const GENESIS_HASH = '0'.repeat(64);

export interface ChainVerificationResult {
  valid: boolean;
  chainLength: number;
  rootHash: string | null;
  latestHash: string | null;
  brokenLinkIndex?: number;
  brokenRecordId?: string;
  reason?: string;
  expectedHash?: string;
  actualHash?: string;
}

/**
 * Deterministically serialize any JavaScript object or value into canonical JSON.
 * Keys in objects are recursively sorted alphabetically.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalJson(v)).join(',')}]`;
  }

  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const entries: string[] = [];

  for (const key of sortedKeys) {
    const val = obj[key];
    if (val !== undefined) {
      entries.push(`${JSON.stringify(key)}:${canonicalJson(val)}`);
    }
  }

  return `{${entries.join(',')}}`;
}

/**
 * Computes standard SHA-256 hex digest.
 */
export function sha256(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

export class ProofLedger {
  private static instance: ProofLedger;

  private constructor() {}

  public static getInstance(): ProofLedger {
    if (!ProofLedger.instance) {
      ProofLedger.instance = new ProofLedger();
    }
    return ProofLedger.instance;
  }

  /**
   * Appends an evidence record to the cryptographic hash chain.
   * hash = sha256(previous_hash + canonical_json(record))
   */
  public async appendEvidence(
    taskId: string,
    userId: string,
    evidence: EvidenceRecord
  ): Promise<ProofLedgerEntry> {
    const repo = getRepository();
    const existingChain = await repo.getProofLedgerByTaskId(taskId);

    let previousHash = GENESIS_HASH;
    if (existingChain.length > 0) {
      previousHash = existingChain[existingChain.length - 1].proofHash;
    }

    // Strip sensitive fields or unpredictable metadata before hashing
    const recordData: Record<string, unknown> = {
      evidenceId: evidence.id,
      operationId: evidence.operationId,
      taskId: evidence.taskId,
      userId: evidence.userId,
      tool: evidence.tool,
      method: evidence.method,
      status: evidence.status,
      mode: evidence.mode,
      providerReferenceId: evidence.providerReferenceId || null,
      evidenceSummary: evidence.evidenceSummary,
      timestamp: evidence.timestamp,
      details: evidence.details || {},
    };

    const canonicalDataStr = canonicalJson(recordData);
    const proofHash = sha256(previousHash + canonicalDataStr);

    const entry: ProofLedgerEntry = {
      id: uuidv4(),
      taskId,
      userId,
      stepId: evidence.operationId,
      action: evidence.method,
      evidenceId: evidence.id,
      recordData,
      proofHash,
      previousHash,
      timestamp: new Date().toISOString(),
    };

    return repo.recordProof(entry);
  }

  /**
   * Recomputes every hash along the chain from genesis to tip.
   * Pinpoints the exact index and record of the first broken link.
   */
  public async verifyChain(taskId: string): Promise<ChainVerificationResult> {
    const repo = getRepository();
    const entries = await repo.getProofLedgerByTaskId(taskId);

    if (!entries || entries.length === 0) {
      return {
        valid: true,
        chainLength: 0,
        rootHash: null,
        latestHash: null,
      };
    }

    for (let i = 0; i < entries.length; i++) {
      const current = entries[i];

      // 1. Check link to previous block
      if (i === 0) {
        if (current.previousHash !== GENESIS_HASH) {
          return {
            valid: false,
            chainLength: entries.length,
            rootHash: entries[0].proofHash,
            latestHash: entries[entries.length - 1].proofHash,
            brokenLinkIndex: 0,
            brokenRecordId: current.id,
            reason: 'Genesis block previous hash is invalid',
            expectedHash: GENESIS_HASH,
            actualHash: current.previousHash,
          };
        }
      } else {
        const prev = entries[i - 1];
        if (current.previousHash !== prev.proofHash) {
          return {
            valid: false,
            chainLength: entries.length,
            rootHash: entries[0].proofHash,
            latestHash: entries[entries.length - 1].proofHash,
            brokenLinkIndex: i,
            brokenRecordId: current.id,
            reason: `Broken chain link: entry at index ${i} has previousHash mismatch with index ${i - 1}`,
            expectedHash: prev.proofHash,
            actualHash: current.previousHash,
          };
        }
      }

      // 2. Recompute current block hash
      const canonicalDataStr = canonicalJson(current.recordData || {});
      const expectedHash = sha256(current.previousHash + canonicalDataStr);

      if (current.proofHash !== expectedHash) {
        return {
          valid: false,
          chainLength: entries.length,
          rootHash: entries[0].proofHash,
          latestHash: entries[entries.length - 1].proofHash,
          brokenLinkIndex: i,
          brokenRecordId: current.id,
          reason: `Cryptographic tamper detected: recomputed hash does not match stored block hash at index ${i}`,
          expectedHash,
          actualHash: current.proofHash,
        };
      }
    }

    return {
      valid: true,
      chainLength: entries.length,
      rootHash: entries[0].proofHash,
      latestHash: entries[entries.length - 1].proofHash,
    };
  }
}
