import { useRef, useEffect, useState } from 'react';
import type { SelectionState } from '../core/types';

export function useEditor() {
  const editorRef = useRef<unknown>(null);
  const [selectionState, setSelectionState] = useState<SelectionState | null>(null);

  useEffect(() => {
    const editor = editorRef.current as {
      on?: (event: string, handler: (...args: unknown[]) => void) => () => void;
    } | null;
    if (!editor?.on) return;
    const unsub = editor.on('selectionChange', (state) => {
      setSelectionState(state as SelectionState);
    });
    return unsub;
  });

  return { editorRef, selectionState };
}
