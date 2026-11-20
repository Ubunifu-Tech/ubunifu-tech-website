/**
 * Tiptap's core for check:editor, loaded the way src/lib/console/editor-extensions.ts
 * loads it. The check is an ES module and the app's .ts files load as CommonJS
 * under tsx, so importing @tiptap/core from the check directly gave it a second
 * copy of ProseMirror that the editor's own extensions could not work with.
 */
export { Editor, generateJSON, getSchema } from '@tiptap/core';
export { default as StarterKit } from '@tiptap/starter-kit';
