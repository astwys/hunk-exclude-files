import { expect, mock, test } from "bun:test";
import type { HunkExtensionAPI } from "hunkdiff/extension";
import extension from "./index";

function load(config: Record<string, unknown>) {
  const transformChangeset = mock();
  const log = mock();

  extension({ config, log, transformChangeset } as unknown as HunkExtensionAPI);

  return { log, transformChangeset, transform: transformChangeset.mock.calls[0]?.[0] };
}

test("filters matching files and reports how many it hid", () => {
  const { transform, log } = load({ patterns: [".pi/**"] });
  const notify = mock();
  const changeset = {
    files: [{ path: ".pi/todos/task.md" }, { path: "src/index.ts" }],
  };

  expect(transform(changeset, { notify })).toEqual({
    files: [{ path: "src/index.ts" }],
  });
  expect(notify).toHaveBeenCalledWith("hunk-exclude-files: hid 1 file");
  expect(log).not.toHaveBeenCalled();
});

test("leaves a changeset unchanged when no files match", () => {
  const { transform } = load({ patterns: ["dist/**"] });
  const notify = mock();
  const changeset = { files: [{ path: "src/index.ts" }] };

  expect(transform(changeset, { notify })).toEqual(changeset);
  expect(notify).not.toHaveBeenCalled();
});

test("passes opaque file fields through untouched", () => {
  const { transform } = load({ patterns: ["dist/**"] });
  const metadata = { hunks: [] };
  const changeset = { files: [{ path: "src/index.ts", metadata }], label: "HEAD" };

  const result = transform(changeset, { notify: mock() });

  expect(result.label).toBe("HEAD");
  expect(result.files[0].metadata).toBe(metadata);
});

test("registers nothing when no patterns are configured", () => {
  expect(load({}).transformChangeset).not.toHaveBeenCalled();
});

test("warns once about unusable patterns", () => {
  const { transform, log } = load({ patterns: ["", "dist/**"] });
  const notify = mock();
  const changeset = { files: [{ path: "src/index.ts" }] };

  transform(changeset, { notify });
  transform(changeset, { notify });

  expect(log).toHaveBeenCalledTimes(1);
  expect(notify.mock.calls).toEqual([
    ["hunk-exclude-files: ignored an empty or non-string pattern", "warning"],
  ]);
});
