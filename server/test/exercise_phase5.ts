import request from 'supertest';
import { createApp } from '../src/app';
import { getRepository } from '../src/repository';

const app = createApp();

async function main() {
  console.log('--- STARTING LIVE EXERCISE OF PHASE 5 FEATURES ---');

  // 1. Authenticate / Login or Register Demo User
  console.log('[1/8] Authenticating demo user...');
  let loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'demo@tasknova.local', password: 'demo12345' });

  if (!loginRes.body.success) {
    // Register if not yet seeded
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'demo@tasknova.local',
        password: 'demo12345',
        fullName: 'Demo Operator',
      });
    loginRes = regRes;
  }

  if (!loginRes.body.success) {
    throw new Error('Failed to authenticate demo user: ' + JSON.stringify(loginRes.body));
  }
  const token = loginRes.body.data.token;
  const user = loginRes.body.data.user;
  console.log(`  -> Demo user authenticated: ${user.email} (ID: ${user.id})`);

  // 2. Inject Chaos Fault: drive network timeout
  console.log('[2/8] Injecting Chaos Fault: drive network_timeout...');
  const faultRes = await request(app)
    .post('/api/chaos/inject')
    .set('Authorization', `Bearer ${token}`)
    .send({
      target: 'drive',
      faultType: 'network_timeout',
      occurrences: 1,
    });

  if (!faultRes.body.success) {
    throw new Error('Failed to inject chaos fault: ' + JSON.stringify(faultRes.body));
  }
  console.log(`  -> Chaos Fault injected: ${faultRes.body.data.faultType} on target: "${faultRes.body.data.target}"`);

  // 3. Generate Plan for Weekly Report
  console.log('[3/8] Generating Execution Plan for "Generate weekly sales report and send summary email to team"...');
  const planRes = await request(app)
    .post('/api/planning/generate')
    .set('Authorization', `Bearer ${token}`)
    .send({
      instruction: 'Generate weekly sales report and send summary email to team',
    });

  if (!planRes.body.success) {
    throw new Error('Failed to generate plan: ' + JSON.stringify(planRes.body));
  }
  const task = planRes.body.data.task;
  const plan = planRes.body.data.plan;
  console.log(`  -> Plan created: "${plan.title}" with ${plan.steps.length} steps. Task ID: ${task.id}`);

  // 4. Approve Plan and Start Execution
  console.log('[4/8] Approving plan and starting orchestrator...');
  const approvePlanRes = await request(app)
    .post(`/api/planning/${task.id}/approve-plan`)
    .set('Authorization', `Bearer ${token}`)
    .send({});

  if (!approvePlanRes.body.success) {
    throw new Error('Failed to approve plan: ' + JSON.stringify(approvePlanRes.body));
  }

  // Trigger execution
  const runRes = await request(app)
    .post(`/api/executions/${task.id}/run`)
    .set('Authorization', `Bearer ${token}`);
  if (!runRes.body.success) {
    throw new Error('Failed to start execution: ' + JSON.stringify(runRes.body));
  }
  console.log('  -> Task execution triggered on Orchestrator.');

  // Poll task execution until it completes, approving any pending approvals along the way
  let currentTask = task;
  let attempts = 0;
  while (attempts < 60) {
    await new Promise((r) => setTimeout(r, 400));
    const tRes = await request(app)
      .get(`/api/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`);
    currentTask = tRes.body.data;

    if (currentTask.status === 'COMPLETED' || currentTask.status === 'FAILED') {
      break;
    }

    if (currentTask.status === 'AWAITING_APPROVAL') {
      const approvalsRes = await request(app)
        .get('/api/approvals')
        .set('Authorization', `Bearer ${token}`);
      const pendingApproval = (approvalsRes.body.data || []).find(
        (a: any) => a.taskId === task.id && a.status.toLowerCase() === 'pending'
      );
      if (pendingApproval) {
        console.log(`  -> Found pending approval for step "${pendingApproval.stepId}". Approving...`);
        const postApproveRes = await request(app)
          .post(`/api/approvals/${pendingApproval.id}/approve`)
          .set('Authorization', `Bearer ${token}`)
          .send({});
        if (!postApproveRes.body.success) {
          throw new Error('Failed to approve step: ' + JSON.stringify(postApproveRes.body));
        }
        console.log('  -> Step approved.');
      }
    }
    attempts++;
  }

  console.log(`  -> Final task status: ${currentTask.status}`);
  console.log(`  -> Trust Score: ${currentTask.trustScore}/100`);
  if (currentTask.status !== 'COMPLETED') {
    throw new Error(`Task expected COMPLETED but got ${currentTask.status}`);
  }

  // 5. Verify Proof Ledger Cryptographic Chain
  console.log('[5/8] Verifying Proof Ledger via POST /api/tasks/:id/proof/verify...');
  const verifyLedgerRes = await request(app)
    .post(`/api/tasks/${task.id}/proof/verify`)
    .set('Authorization', `Bearer ${token}`);

  if (!verifyLedgerRes.body.success) {
    throw new Error('Proof verification failed: ' + JSON.stringify(verifyLedgerRes.body));
  }
  const proofResult = verifyLedgerRes.body.data;
  console.log(`  -> Chain Valid: ${proofResult.valid}, Entries: ${proofResult.totalEntries}, Trust Score: ${proofResult.trustScore}`);
  if (!proofResult.valid) {
    throw new Error('Expected valid proof ledger but got invalid!');
  }

  // 6. Download and Inspect Proof Certificate PDF
  console.log('[6/8] Generating Proof Certificate PDF via GET /api/tasks/:id/proof/certificate...');
  const certRes = await request(app)
    .get(`/api/tasks/${task.id}/proof/certificate`)
    .set('Authorization', `Bearer ${token}`);

  if (certRes.status !== 200) {
    throw new Error('Failed to download certificate: ' + certRes.status);
  }
  const pdfBuffer = certRes.body;
  const isPdf = pdfBuffer.slice(0, 5).toString('ascii') === '%PDF-';
  console.log(`  -> Proof Certificate received: ${pdfBuffer.length} bytes, Header: ${pdfBuffer.slice(0, 5).toString('ascii')} (Valid PDF: ${isPdf})`);
  if (!isPdf || pdfBuffer.length < 1000) {
    throw new Error('Invalid PDF certificate content');
  }

  // 7. Test Proof Ledger Tamper Detection
  console.log('[7/8] Tampering with proof ledger entry to verify tamper detection...');
  const repo = getRepository();
  const ledgerEntries = await repo.getProofLedgerByTaskId(task.id);
  const firstEntry = ledgerEntries[0];
  const originalRecordData = firstEntry.recordData;

  // Tamper recordData
  await repo.updateProofLedgerEntry(firstEntry.id, {
    recordData: { ...originalRecordData, summary: 'TAMPERED_RECORD_CONTENT_ATTACK' },
  });

  const tamperVerifyRes = await request(app)
    .post(`/api/tasks/${task.id}/proof/verify`)
    .set('Authorization', `Bearer ${token}`);

  const tamperResult = tamperVerifyRes.body.data;
  console.log(`  -> Tamper Verification Result: valid=${tamperResult.valid}, brokenIndex=${tamperResult.brokenLinkIndex}, error="${tamperResult.error}"`);
  if (tamperResult.valid !== false || tamperResult.brokenLinkIndex !== 0) {
    throw new Error(`Expected tamper detection at index 0 but got valid=${tamperResult.valid}, brokenIndex=${tamperResult.brokenLinkIndex}`);
  }
  console.log('  -> Tamper detection correctly pinpointed broken link at index 0 and invalidated trust score!');

  // Restore original data
  await repo.updateProofLedgerEntry(firstEntry.id, {
    recordData: originalRecordData,
  });

  // 8. Clean up chaos faults
  console.log('[8/8] Cleaning up chaos faults...');
  await request(app)
    .delete('/api/chaos/faults')
    .set('Authorization', `Bearer ${token}`);
  console.log('  -> Chaos faults cleared.');

  console.log('\n======================================================');
  console.log('ALL PHASE 5 LIVE EXERCISES COMPLETED & VERIFIED 100%!');
  console.log('======================================================');
  process.exit(0);
}

main().catch((err) => {
  console.error('LIVE EXERCISE FAILED:', err);
  process.exit(1);
});
