import { StateField } from "@codemirror/state";
import { Decoration, EditorView, type DecorationSet } from "@codemirror/view";

const engineMarks = StateField.define<DecorationSet>({
  create: (state) => markEngineNames(state.doc.toString()),
  update: (marks, transaction) =>
    transaction.docChanged ? markEngineNames(transaction.state.doc.toString()) : marks,
  // Outer marks remain one element even when syntax highlighting splits the text.
  provide: (field) => EditorView.outerDecorations.from(field),
});

function markEngineNames(text: string): DecorationSet {
  const mark = Decoration.mark({ class: "cm-maap-engine-name" });
  return Decoration.set(
    Array.from(text.matchAll(/openclaw/gi), (match) => mark.range(match.index, match.index + 8)),
  );
}

/** Paint over engine names without replacing any editor document or selection positions. */
export const editorDisplayBranding = [
  engineMarks,
  EditorView.baseTheme({
    ".cm-maap-engine-name": {
      position: "relative",
      color: "transparent !important",
      "-webkit-text-fill-color": "transparent !important",
      textShadow: "none !important",
    },
    ".cm-maap-engine-name *": {
      color: "transparent !important",
      "-webkit-text-fill-color": "transparent !important",
      textShadow: "none !important",
    },
    ".cm-maap-engine-name::after": {
      content: '"*******"',
      position: "absolute",
      inset: "0",
      color: "var(--text)",
      "-webkit-text-fill-color": "var(--text)",
      textAlign: "center",
      letterSpacing: "0.1ch",
      pointerEvents: "none",
    },
  }),
];
