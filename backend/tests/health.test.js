import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

test('liveness endpoint returns request metadata', async () => {
  const response = await request(app).get('/api/v1/health/live').expect(200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.status, 'ok');
  assert.ok(response.body.requestId);
});

test('unknown routes use the centralized error response', async () => {
  const response = await request(app).get('/api/v1/missing-route').expect(404);
  assert.equal(response.body.success, false);
  assert.ok(response.body.requestId);
});

