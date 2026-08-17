import { expect, test } from "bun:test";
import { compileRules, shouldExclude } from "./matches";

function rules(value: unknown) {
  return compileRules(value, () => {});
}

test("matches file and folder globs", () => {
  const configured = rules(["*.lock", "dist/**", "**/*.snap", "docs/?.md"]);

  expect(shouldExclude("bun.lock", configured)).toBe(true);
  expect(shouldExclude("dist/client/app.js", configured)).toBe(true);
  expect(shouldExclude("src/view.test.snap", configured)).toBe(true);
  expect(shouldExclude("view.test.snap", configured)).toBe(true);
  expect(shouldExclude("docs/a.md", configured)).toBe(true);
  expect(shouldExclude("docs/ab.md", configured)).toBe(false);
  expect(shouldExclude("src/app.ts", configured)).toBe(false);
});

test("a star stays inside one path part", () => {
  const configured = rules(["src/*.ts"]);

  expect(shouldExclude("src/app.ts", configured)).toBe(true);
  expect(shouldExclude("src/deep/app.ts", configured)).toBe(false);
});

test("later negated rules include a matching file", () => {
  const configured = rules(["generated/**", "!generated/keep.ts"]);

  expect(shouldExclude("generated/output.ts", configured)).toBe(true);
  expect(shouldExclude("generated/keep.ts", configured)).toBe(false);
});

test("an earlier negated rule loses to a later exclusion", () => {
  const configured = rules(["!generated/keep.ts", "generated/**"]);

  expect(shouldExclude("generated/keep.ts", configured)).toBe(true);
});

test("glob metacharacters in a path are literal", () => {
  const configured = rules(["a+b/(x).ts"]);

  expect(shouldExclude("a+b/(x).ts", configured)).toBe(true);
  expect(shouldExclude("aab/x.ts", configured)).toBe(false);
});

test("ignores malformed configuration entries", () => {
  const messages: string[] = [];
  const configured = compileRules(["", 42, "!"], (message) => messages.push(message));

  expect(configured).toEqual([]);
  expect(messages).toHaveLength(3);
});

test("ignores a patterns value that is not an array", () => {
  const messages: string[] = [];

  expect(compileRules("*.lock", (message) => messages.push(message))).toEqual([]);
  expect(messages).toHaveLength(1);
  expect(compileRules(undefined, (message) => messages.push(message))).toEqual([]);
  expect(messages).toHaveLength(1);
});
