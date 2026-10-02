import { describe, it, expect, beforeAll } from 'vitest';
import { buildServer } from '../../server/src/index.js';
import { runMigrations } from '../../server/src/db/migrate.js';
import { UserRepository } from '../../server/src/repositories/user-repository.js';
import { db } from '../../server/src/db/connection.js';
import { v4 as uuidv4 } from 'uuid';

describe('Feature 002: Authentication, Multi-User & Theme Quickstart Validation', () => {
  const app = buildServer();
  const userRepo = new UserRepository();

  const userAna = {
    username: 'anasilva_' + Date.now(),
    email: `ana_${Date.now()}@exemplo.com`,
    password: 'SenhaSegura123',
    display_name: 'Ana Silva',
  };

  const userCarlos = {
    username: 'carlossouza_' + Date.now(),
    email: `carlos_${Date.now()}@exemplo.com`,
    password: 'OutraSenha456',
    display_name: 'Carlos Souza',
  };

  let tokenAna = '';
  let idAna = '';
  let tokenCarlos = '';
  let idCarlos = '';

  beforeAll(() => {
    runMigrations();
  });

  it('Scenario 1: User Registration & Initial Session (P1)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: userAna,
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.token).toBeDefined();
    expect(body.user.username).toBe(userAna.username);
    expect(body.user.display_name).toBe(userAna.display_name);

    tokenAna = body.token;
    idAna = body.user.id;

    // Verify GET /me
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${tokenAna}`,
      },
    });

    expect(meRes.statusCode).toBe(200);
    const meBody = JSON.parse(meRes.payload);
    expect(meBody.user.id).toBe(idAna);
    expect(meBody.preferences.theme_mode).toBe('system');
  });

  it('Scenario 2: Multi-User Data Isolation (P1/P3)', async () => {
    // 1. Ana logs overtime: 18:00 to 20:00 (2h = 120m)
    const recId = uuidv4();
    const recordRes = await app.inject({
      method: 'POST',
      url: '/api/v1/records',
      headers: {
        authorization: `Bearer ${tokenAna}`,
      },
      payload: {
        id: recId,
        record_date: '2026-10-01',
        start_time: '18:00',
        end_time: '20:00',
        break_duration_minutes: 0,
        description: 'Ana Overtime Shift',
      },
    });

    expect(recordRes.statusCode).toBe(201);

    // 2. Register Carlos
    const regCarlos = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: userCarlos,
    });

    expect(regCarlos.statusCode).toBe(201);
    const carlosBody = JSON.parse(regCarlos.payload);
    tokenCarlos = carlosBody.token;
    idCarlos = carlosBody.user.id;

    // 3. Carlos checks records
    const carlosRecords = await app.inject({
      method: 'GET',
      url: '/api/v1/records',
      headers: {
        authorization: `Bearer ${tokenCarlos}`,
      },
    });

    expect(carlosRecords.statusCode).toBe(200);
    expect(JSON.parse(carlosRecords.payload).length).toBe(0);

    // 4. Carlos checks balance
    const carlosBalance = await app.inject({
      method: 'GET',
      url: '/api/v1/balance',
      headers: {
        authorization: `Bearer ${tokenCarlos}`,
      },
    });

    expect(carlosBalance.statusCode).toBe(200);
    const balanceBody = JSON.parse(carlosBalance.payload);
    expect(balanceBody.total_positive_minutes).toBe(0);
    expect(balanceBody.net_balance_minutes).toBe(0);

    // 5. Ana checks balance -> 120m
    const anaBalance = await app.inject({
      method: 'GET',
      url: '/api/v1/balance',
      headers: {
        authorization: `Bearer ${tokenAna}`,
      },
    });
    expect(JSON.parse(anaBalance.payload).total_positive_minutes).toBe(120);
  });

  it('Scenario 3: Impeccable Theming & Dark/Light Switcher (P2)', async () => {
    // Light
    const resLight = await app.inject({
      method: 'PUT',
      url: '/api/v1/user/preferences',
      headers: {
        authorization: `Bearer ${tokenAna}`,
      },
      payload: { theme_mode: 'light' },
    });
    expect(resLight.statusCode).toBe(200);
    expect(JSON.parse(resLight.payload).theme_mode).toBe('light');

    // Dark
    const resDark = await app.inject({
      method: 'PUT',
      url: '/api/v1/user/preferences',
      headers: {
        authorization: `Bearer ${tokenAna}`,
      },
      payload: { theme_mode: 'dark' },
    });
    expect(resDark.statusCode).toBe(200);
    expect(JSON.parse(resDark.payload).theme_mode).toBe('dark');

    // System
    const resSys = await app.inject({
      method: 'PUT',
      url: '/api/v1/user/preferences',
      headers: {
        authorization: `Bearer ${tokenAna}`,
      },
      payload: { theme_mode: 'system' },
    });
    expect(resSys.statusCode).toBe(200);
    expect(JSON.parse(resSys.payload).theme_mode).toBe('system');
  });

  it('Scenario 4: Offline Session Continuity & Sync (P4)', async () => {
    const offlineRecId = uuidv4();
    const syncRes = await app.inject({
      method: 'POST',
      url: '/api/v1/sync',
      headers: {
        authorization: `Bearer ${tokenAna}`,
      },
      payload: {
        records: [
          {
            id: offlineRecId,
            user_id: idAna,
            record_date: '2026-10-02',
            start_time: '18:00',
            end_time: '19:00',
            break_duration_minutes: 0,
            description: 'Offline synced shift',
            client_updated_at: new Date().toISOString(),
          },
        ],
        client_sync_timestamp: new Date().toISOString(),
      },
    });

    expect(syncRes.statusCode).toBe(200);
    const syncBody = JSON.parse(syncRes.payload);
    expect(syncBody.applied_record_ids).toContain(offlineRecId);
    // Ana now has 120m + 60m = 180m
    expect(syncBody.balance.total_positive_minutes).toBe(180);
  });
});
