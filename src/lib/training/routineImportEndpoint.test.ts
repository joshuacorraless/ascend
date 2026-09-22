import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../../../api/analyze-routine';
import { routineDocumentSchema } from './routineImportDocument';

const generated = vi.hoisted(() => vi.fn());
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: generated };
  },
}));
let ip = 0;

async function request(body: unknown, method = 'POST') {
  let status = 200;
  let result: unknown;
  const res = {
    setHeader: vi.fn(),
    status(code: number) {
      status = code;
      return this;
    },
    json(value: unknown) {
      result = value;
    },
  };
  await handler(
    { method, body, headers: {}, socket: { remoteAddress: `test-${++ip}` } } as VercelRequest,
    res as unknown as VercelResponse,
  );
  return { status, body: result, headers: res.setHeader };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('routine analysis endpoint boundary', () => {
  it('rejects malformed bodies and spoofed document content before calling AI', async () => {
    expect((await request('{')).status).toBe(400);
    expect((await request({ text: 'x'.repeat(50_001) })).status).toBe(400);
    expect(
      (
        await request({
          base64: Buffer.from('not a PDF').toString('base64'),
          mimeType: 'application/pdf',
        })
      ).status,
    ).toBe(415);
    expect(generated).not.toHaveBeenCalled();
  });

  it('reports unavailable configuration without exposing server secrets', async () => {
    vi.stubEnv('AI_PROVIDER', 'google');
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.stubEnv('GOOGLE_API_KEY', '');
    expect((await request({}, 'GET')).body).toEqual({ available: false });
    expect((await request({ text: 'Lunes: Press 2 × 8' })).status).toBe(503);
  });

  it('accepts null prescriptions for review and uses the correct Gemini PDF payload', async () => {
    vi.stubEnv('AI_PROVIDER', 'google');
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    const analysis = {
      routines: [
        {
          name: 'Lunes',
          description: '',
          daysOfWeek: [1],
          exercises: [
            {
              name: 'Press',
              targetSets: null,
              repRangeMin: null,
              repRangeMax: null,
              toFailure: null,
              restSeconds: null,
              equipment: null,
              primaryMuscle: null,
              prescribedSets: null,
              notes: '',
              source: 'Press',
            },
          ],
        },
      ],
      warnings: ['Faltan las series.'],
    };
    generated.mockResolvedValueOnce({ text: JSON.stringify(analysis) });
    const base64 = Buffer.from('%PDF-1.4 mock document').toString('base64');
    const result = await request({ mimeType: 'application/pdf', base64 });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ analysis: routineDocumentSchema.parse(analysis) });
    expect(generated.mock.calls[0]![0].contents[0]).toEqual({
      inlineData: { mimeType: 'application/pdf', data: base64 },
    });
  });

  it('does not return unvalidated, empty or oversized model output', async () => {
    vi.stubEnv('AI_PROVIDER', 'google');
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    generated.mockResolvedValueOnce({ text: '{"routines":[],"warnings":[]}' });
    expect((await request({ text: 'Unclear plan' })).status).toBe(502);
  });

  it('returns a recoverable error and retry hint when Gemini is overloaded', async () => {
    vi.stubEnv('AI_PROVIDER', 'google');
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    generated.mockRejectedValueOnce(new Error('429 RESOURCE_EXHAUSTED'));
    const result = await request({ text: 'Plan' });
    expect(result.status).toBe(429);
    expect(result.headers).toHaveBeenCalledWith('Retry-After', '60');
    expect(JSON.stringify(result.body)).toContain('mismo archivo');
  });
});
