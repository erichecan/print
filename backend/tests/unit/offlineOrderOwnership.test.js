/**
 * [2026-08-18] 线下订单「非创建者只读」权限守卫
 *
 * 规则：所有人一视同仁（含 ADMIN），别人创建的订单只能改 status；
 * 无归属的历史订单（metadata 里没有 submittedByUserId）保持所有人可编辑。
 */
const express = require('express');
const request = require('supertest');

const mockFindUnique = jest.fn();
jest.mock('../../src/lib/prisma', () => ({
  offlineOrder: { findUnique: (...args) => mockFindUnique(...args) },
}));

const {
  getOfflineOrderCreatorId,
  isOfflineOrderEditableBy,
  requireOfflineOrderOwner,
  restrictNonOwnerUpdateToStatus,
} = require('../../src/utils/offlineOrderOwnership');

const OWNER = 'user-owner';
const OTHER = 'user-other';

const buildApp = (guard, userId) => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = userId ? { id: userId } : undefined;
    next();
  });
  app.patch('/orders/:id', guard, (_req, res) => res.json({ ok: true }));
  return app;
};

beforeEach(() => {
  mockFindUnique.mockReset();
});

describe('getOfflineOrderCreatorId', () => {
  it('reads metadata.submittedByUserId', () => {
    expect(getOfflineOrderCreatorId({ metadata: { submittedByUserId: OWNER } })).toBe(OWNER);
  });

  it('treats missing / blank / non-object metadata as unowned', () => {
    expect(getOfflineOrderCreatorId({ metadata: null })).toBeNull();
    expect(getOfflineOrderCreatorId({ metadata: {} })).toBeNull();
    expect(getOfflineOrderCreatorId({ metadata: { submittedByUserId: '  ' } })).toBeNull();
    expect(getOfflineOrderCreatorId({ metadata: 'oops' })).toBeNull();
  });
});

describe('isOfflineOrderEditableBy', () => {
  const owned = { metadata: { submittedByUserId: OWNER } };

  it('allows the creator', () => {
    expect(isOfflineOrderEditableBy(owned, OWNER)).toBe(true);
  });

  it('blocks everyone else, including anonymous', () => {
    expect(isOfflineOrderEditableBy(owned, OTHER)).toBe(false);
    expect(isOfflineOrderEditableBy(owned, undefined)).toBe(false);
  });

  it('keeps legacy unowned orders editable so old data is not locked forever', () => {
    expect(isOfflineOrderEditableBy({ metadata: null }, OTHER)).toBe(true);
  });
});

describe('requireOfflineOrderOwner', () => {
  it('404s when the order does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = await request(buildApp(requireOfflineOrderOwner, OWNER)).patch('/orders/x');
    expect(res.status).toBe(404);
  });

  it('lets the creator through', async () => {
    mockFindUnique.mockResolvedValue({ id: 'x', metadata: { submittedByUserId: OWNER } });
    const res = await request(buildApp(requireOfflineOrderOwner, OWNER)).patch('/orders/x');
    expect(res.status).toBe(200);
  });

  it('403s a non-creator', async () => {
    mockFindUnique.mockResolvedValue({ id: 'x', metadata: { submittedByUserId: OWNER } });
    const res = await request(buildApp(requireOfflineOrderOwner, OTHER)).patch('/orders/x');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('OFFLINE_ORDER_NOT_OWNER');
  });
});

describe('restrictNonOwnerUpdateToStatus', () => {
  const app = (userId) => buildApp(restrictNonOwnerUpdateToStatus, userId);

  beforeEach(() => {
    mockFindUnique.mockResolvedValue({ id: 'x', metadata: { submittedByUserId: OWNER } });
  });

  it('lets a non-creator change status (optionally with a note)', async () => {
    const res = await request(app(OTHER)).patch('/orders/x').send({ status: '已完成' });
    expect(res.status).toBe(200);

    const withNote = await request(app(OTHER))
      .patch('/orders/x')
      .send({ status: '已完成', note: '客户确认' });
    expect(withNote.status).toBe(200);
  });

  it('403s a non-creator on any other field', async () => {
    for (const patch of [
      { quantity: 10 },
      { totalAmount: 99 },
      { configuration: {} },
      { metadata: { submittedByUserId: OTHER } }, // 归属劫持
      { status: '已完成', quantity: 10 }, // 夹带
    ]) {
      const res = await request(app(OTHER)).patch('/orders/x').send(patch);
      expect(res.status).toBe(403);
    }
  });

  it('403s a non-creator uploading files', async () => {
    const appWithFiles = express();
    appWithFiles.use(express.json());
    appWithFiles.use((req, _res, next) => {
      req.user = { id: OTHER };
      req.files = { assets: [{ originalname: 'a.png' }] };
      next();
    });
    appWithFiles.patch('/orders/:id', restrictNonOwnerUpdateToStatus, (_req, res) => res.json({ ok: true }));

    const res = await request(appWithFiles).patch('/orders/x').send({ status: '已完成' });
    expect(res.status).toBe(403);
  });

  it('lets the creator submit anything, and exposes the original creator id for metadata preservation', async () => {
    let seenCreatorId;
    const appOwner = express();
    appOwner.use(express.json());
    appOwner.use((req, _res, next) => { req.user = { id: OWNER }; next(); });
    appOwner.patch('/orders/:id', restrictNonOwnerUpdateToStatus, (req, res) => {
      seenCreatorId = req.offlineOrderCreatorId;
      res.json({ ok: true });
    });

    const res = await request(appOwner).patch('/orders/x').send({ quantity: 10, metadata: {} });
    expect(res.status).toBe(200);
    expect(seenCreatorId).toBe(OWNER);
  });
});
