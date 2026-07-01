import test from 'node:test';
import assert from 'node:assert/strict';
import { supabase } from '../src/config/supabase.js';
import { createRefund } from '../src/controllers/refundController.js';

// Regression test for the refund_requests insert column mapping.
//
// `createRefund` builds a row object and runs it through the real `toSnakeObj`
// helper before inserting. The foreign-key columns in `refund_requests` are
// `patient_id` and `appointment_id` (see infra/supabase_schema.sql and the
// `.eq('patient_id', ...)` read path in `myRefunds`). A previous version passed
// `patient`/`appointment`, which `toSnakeObj` left as `patient`/`appointment` —
// columns that do not exist — so the insert errored and patients could not file
// refund requests. This test captures the payload actually sent to Supabase and
// asserts the correct snake_case FK columns are used.
test('createRefund inserts using patient_id/appointment_id columns', async () => {
  const originalFrom = supabase.from;
  let insertedTable = null;
  let insertedPayload = null;

  supabase.from = (table) => {
    insertedTable = table;
    return {
      insert: (payload) => {
        insertedPayload = payload;
        return {
          select: async () => ({ data: [{ id: 'refund-1', ...payload }], error: null })
        };
      }
    };
  };

  try {
    const req = {
      user: { _id: 'patient-123' },
      body: {
        appointmentId: 'appointment-456',
        reason: 'Doctor unavailable',
        emergencyExplanation: 'Family emergency',
        proofUrl: 'https://example.com/proof.png'
      }
    };
    let statusCode = null;
    let jsonBody = null;
    const res = {
      status(code) { statusCode = code; return this; },
      json(body) { jsonBody = body; return this; }
    };
    const next = (err) => { if (err) throw err; };

    await createRefund(req, res, next);

    assert.equal(insertedTable, 'refund_requests');
    // The columns that must exist for the insert to succeed.
    assert.equal(insertedPayload.patient_id, 'patient-123');
    assert.equal(insertedPayload.appointment_id, 'appointment-456');
    assert.equal(insertedPayload.emergency_explanation, 'Family emergency');
    assert.equal(insertedPayload.proof_url, 'https://example.com/proof.png');
    // Guard against the previous bug's non-existent columns.
    assert.equal('patient' in insertedPayload, false);
    assert.equal('appointment' in insertedPayload, false);

    assert.equal(statusCode, 201);
    assert.ok(jsonBody.refund);
    assert.equal(jsonBody.refund.patientId, 'patient-123');
    assert.equal(jsonBody.refund.appointmentId, 'appointment-456');
  } finally {
    supabase.from = originalFrom;
  }
});
