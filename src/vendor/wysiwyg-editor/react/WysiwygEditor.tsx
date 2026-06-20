'use client';

import '../styles/index.css';
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  forwardRef,
} from 'react';
import type { Editor } from '../core/Editor';
import type { EditorOptions, SelectionState } from '../core/types';

export interface WysiwygEditorProps extends Omit<EditorOptions, 'container' | 'onReady'> {
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  focusOnMount?: boolean;
  focusTrigger?: boolean;
  onReady?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export interface WysiwygEditorHandle {
  getEditor: () => Editor | null;
  focus: () => void;
  blur: () => void;
  setReadonly: (readonly: boolean) => void;
  getHTML: () => string;
  destroy: () => void;
}

export const WysiwygEditor = forwardRef<WysiwygEditorHandle, WysiwygEditorProps>(
  function WysiwygEditor(props, ref) {
    return <WysiwygEditorInner {...props} forwardedRef={ref} />;
  }
);

WysiwygEditor.displayName = 'WysiwygEditor';

type InnerProps = WysiwygEditorProps & { forwardedRef: React.ForwardedRef<WysiwygEditorHandle> };

function WysiwygEditorInner(props: InnerProps) {
  const {
    value,
    defaultValue,
    disabled,
    focusOnMount,
    focusTrigger = false,
    className,
    style,
    onReady,
    forwardedRef,
    ...editorRest
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const prevValueRef = useRef<string | undefined>(undefined);
  const prevFocusTriggerRef = useRef<boolean | undefined>(undefined);
  const [editorReady, setEditorReady] = useState(false);

  const onChangeRef = useRef(editorRest.onChange);
  const onBlurRef = useRef(editorRest.onBlur);
  const onFocusRef = useRef(editorRest.onFocus);
  const onSelectionChangeRef = useRef(editorRest.onSelectionChange);
  const onErrorRef = useRef(editorRest.onError);

  useLayoutEffect(() => {
    onChangeRef.current = editorRest.onChange;
    onBlurRef.current = editorRest.onBlur;
    onFocusRef.current = editorRest.onFocus;
    onSelectionChangeRef.current = editorRest.onSelectionChange;
    onErrorRef.current = editorRest.onError;
  });

  const stableOnChange = useCallback((html: string) => {
    onChangeRef.current?.(html);
  }, []);

  const stableOnBlur = useCallback(() => {
    onBlurRef.current?.();
  }, []);

  const stableOnFocus = useCallback(() => {
    onFocusRef.current?.();
  }, []);

  const stableOnSelectionChange = useCallback((state: SelectionState) => {
    onSelectionChangeRef.current?.(state);
  }, []);

  const stableOnError = useCallback((err: { type: 'imageUpload' | 'general'; message: string }) => {
    onErrorRef.current?.(err);
  }, []);

  useImperativeHandle(
    forwardedRef,
    () => ({
      getEditor: () => editorRef.current,
      focus: () => {
        editorRef.current?.focus();
      },
      blur: () => {
        editorRef.current?.blur();
      },
      setReadonly: (readonly: boolean) => {
        editorRef.current?.setReadonly(readonly);
      },
      getHTML: () => editorRef.current?.getHTML() ?? '',
      destroy: () => {
        const ed = editorRef.current;
        if (ed) {
          ed.destroy();
          editorRef.current = null;
          setEditorReady(false);
        }
      },
    }),
    [editorReady]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;

    const run = async () => {
      try {
        const mod = await import('../index');
        if (cancelled || !containerRef.current) return;

        const initialHTML = value !== undefined ? (value ?? '') : (defaultValue ?? '');

        const editorOptions: EditorOptions = {
          ...editorRest,
          container: containerRef.current,
          initialHTML,
          locale: editorRest.locale ?? 'de',
          autofocus: focusOnMount ?? editorRest.autofocus ?? false,
          readonly: Boolean(editorRest.readonly) || Boolean(disabled),
          onChange: stableOnChange,
          onBlur: stableOnBlur,
          onFocus: stableOnFocus,
          onSelectionChange: stableOnSelectionChange,
          onError: editorRest.onError ? stableOnError : undefined,
        };

        // Use the factory so plugins AND the toolbar are wired up; `new Editor()`
        // alone has a no-op _loadPlugins and never builds a toolbar.
        const editor = mod.createEditor(editorOptions);
        if (cancelled) {
          editor.destroy();
          return;
        }

        editorRef.current = editor;
        prevValueRef.current = initialHTML;
        setEditorReady(true);

        queueMicrotask(() => {
          if (!cancelled && onReady) {
            onReady();
          }
        });
      } catch (err) {
        console.error('[WysiwygEditor] init failed', err);
        setEditorReady(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
      setEditorReady(false);
      const ed = editorRef.current;
      if (ed) {
        ed.destroy();
        editorRef.current = null;
      }
    };
    // Intentionally mount-only: EditorOptions snapshot at first render (see plan).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!editorReady || !editorRef.current) return;
    if (value === undefined) return;
    const ed = editorRef.current;
    if (value !== prevValueRef.current && value !== ed.getHTML()) {
      prevValueRef.current = value;
      ed.setHTML(value);
    }
  }, [value, editorReady]);

  useEffect(() => {
    if (!editorReady || !editorRef.current) return;
    editorRef.current.setReadonly(Boolean(editorRest.readonly || disabled));
  }, [editorReady, editorRest.readonly, disabled]);

  useEffect(() => {
    if (!editorReady || !editorRef.current) return;
    const ed = editorRef.current;
    const t = editorRest.theme;
    if (t === 'light' || t === 'dark') {
      ed.setTheme(t);
    }
  }, [editorReady, editorRest.theme]);

  useEffect(() => {
    if (!editorReady || !editorRef.current) return;
    const ed = editorRef.current;
    const prev = prevFocusTriggerRef.current;
    if (focusTrigger && (prev === false || prev === undefined)) {
      ed.focus();
    }
    prevFocusTriggerRef.current = focusTrigger;
  }, [focusTrigger, editorReady]);

  return <div ref={containerRef} className={className} style={style} />;
}
