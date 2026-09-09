import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, expect, it } from "vitest";
import { editorDisplayBranding } from "./editor-display.ts";

let editor: EditorView | undefined;
afterEach(() => {
  editor?.destroy();
  document.body.replaceChildren();
});

it("paints a mask while editor content, cursor, edits and selection retain original text", () => {
  const source = "/home/.OpenClaw/file\nOPENCLAW_HOME";
  editor = new EditorView({
    parent: document.body,
    state: EditorState.create({ doc: source, extensions: [editorDisplayBranding] }),
  });
  expect(editor.dom.querySelectorAll(".cm-maap-engine-name")).toHaveLength(2);
  expect(editor.state.sliceDoc()).toBe(source);
  editor.dispatch({ selection: EditorSelection.range(7, 15) });
  expect(editor.state.sliceDoc(7, 15)).toBe("OpenClaw");
  editor.dispatch({ changes: { from: 11, to: 15, insert: "Source" } });
  expect(editor.state.sliceDoc()).toBe("/home/.OpenSource/file\nOPENCLAW_HOME");
  expect(editor.dom.querySelectorAll(".cm-maap-engine-name")).toHaveLength(1);
});
