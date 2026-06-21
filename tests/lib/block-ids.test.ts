import { assignBlockIds } from "@/lib/block-ids";

test("assigns sequential data-block-id to block elements", () => {
  const html = "<p>First</p><p>Second</p><h2>Heading</h2>";
  const result = assignBlockIds(html);
  expect(result).toContain('data-block-id="b0"');
  expect(result).toContain('data-block-id="b1"');
  expect(result).toContain('data-block-id="b2"');
});

test("does not assign block-id to inline elements inside blocks", () => {
  const html = "<p>Text <strong>bold</strong></p>";
  const result = assignBlockIds(html);
  expect(result).not.toContain('data-block-id="b1"');
  expect(result).toContain('data-block-id="b0"');
});

test("returns empty string for empty input", () => {
  expect(assignBlockIds("")).toBe("");
});
