import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createCheckEnvironment,
  parseRestoreCheckDatabase,
  productionDatabaseEnvironment,
  productionReadyUrl,
} from "../scripts/production-environment.mjs";

test("prod check exige dois bancos isolados e remove configuração de produção", () => {
  assert.throws(() => createCheckEnvironment({}), /CHECK_DATABASE_URL/);

  const environment = createCheckEnvironment({
    CHECK_DATABASE_URL: "postgresql://user:pass@127.0.0.1:5435/lingo_check",
    CHECK_TEST_DATABASE_URL:
      "postgresql://user:pass@127.0.0.1:5435/lingo_check_test",
    DATABASE_DIRECT_URL: "postgresql://prod:secret@prod.example/prod",
    LINGO_PRODUCTION_READY_URL: "https://example.com/api/health/ready",
    VERCEL_TOKEN: "secret",
  });

  assert.equal(
    environment.DATABASE_URL,
    "postgresql://user:pass@127.0.0.1:5435/lingo_check",
  );
  assert.equal(
    environment.TEST_DATABASE_URL,
    "postgresql://user:pass@127.0.0.1:5435/lingo_check_test",
  );
  assert.equal(environment.LINGO_PROFILE, "test");
  assert.equal(environment.DATABASE_DIRECT_URL, undefined);
  assert.equal(environment.LINGO_PRODUCTION_READY_URL, undefined);
  assert.equal(environment.VERCEL_TOKEN, undefined);
});

test("prod check recusa runtime e testes no mesmo banco semanticamente", () => {
  assert.throws(
    () =>
      createCheckEnvironment({
        CHECK_DATABASE_URL:
          "postgresql://runtime:a@db.example:5432/same_test?sslmode=require",
        CHECK_TEST_DATABASE_URL:
          "postgresql://tester:b@db.example/same_test?sslmode=verify-full",
      }),
    /devem ser diferentes/,
  );
});

test("produção exige conexão PostgreSQL explícita e readiness HTTPS", () => {
  assert.throws(() => productionDatabaseEnvironment({}), /DATABASE_DIRECT_URL/);
  assert.throws(
    () =>
      productionReadyUrl({
        LINGO_PRODUCTION_READY_URL: "http://example.com/ready",
      }),
    /https:\/\//,
  );

  const environment = productionDatabaseEnvironment({
    DATABASE_DIRECT_URL: "postgresql://prod:secret@prod.example/lingo",
    TEST_DATABASE_URL: "postgresql://test:test@test.example/lingo_test",
  });
  assert.equal(environment.LINGO_PROFILE, "production");
  assert.equal(environment.DATABASE_URL.includes("prod.example"), true);
  assert.equal(environment.TEST_DATABASE_URL, undefined);
});

test("restore-check exige confirmação e recusa o banco de produção", () => {
  assert.throws(
    () =>
      parseRestoreCheckDatabase({
        RESTORE_CHECK_DATABASE_URL:
          "postgresql://restore:secret@restore.example/neondb",
      }),
    /RESTORE_CHECK_CONFIRM/,
  );

  assert.throws(
    () =>
      parseRestoreCheckDatabase({
        DATABASE_DIRECT_URL:
          "postgresql://prod:secret@db.example/neondb?sslmode=require",
        RESTORE_CHECK_CONFIRM: "lingo-pilot-restore-check",
        RESTORE_CHECK_DATABASE_URL:
          "postgresql://restore:other@db.example:5432/neondb?sslmode=verify-full",
      }),
    /não pode apontar para o banco de produção/,
  );
});

test("scripts de produção não carregam .env.local implicitamente", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  for (const name of [
    "prod:check",
    "prod:migrate",
    "prod:verify",
    "prod:backup",
  ]) {
    assert.equal(packageJson.scripts[name].includes(".env.local"), false, name);
  }

  const migrate = await readFile("scripts/migrate-production.mjs", "utf8");
  assert.equal(migrate.includes("run-with-runtime-env"), false);
});

test("readiness valida PostgreSQL e schema mínimo sem expor diagnóstico", async () => {
  const route = await readFile(
    "apps/web/app/api/health/ready/route.ts",
    "utf8",
  );
  assert.match(route, /app_metadata/);
  assert.match(route, /503/);
  assert.equal(route.includes("DATABASE_URL:"), false);
});
