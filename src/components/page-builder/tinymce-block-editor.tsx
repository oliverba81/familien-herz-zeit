"use client";

import { Editor } from "@tinymce/tinymce-react";
import { useRef } from "react";

interface TinyMCEBlockEditorProps {
  content: string;
  onChange: (html: string) => void;
  compact?: boolean;
}

export default function TinyMCEBlockEditor({
  content,
  onChange,
  compact = false,
}: TinyMCEBlockEditorProps) {
  const editorRef = useRef<any>(null);

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <Editor
        apiKey={
          process.env.NEXT_PUBLIC_TINYMCE_API_KEY ||
          "pbh7342n8ezrtnqzp9ykk6x8bd5wu8roanu67oa5091kekr9"
        }
        onInit={(evt, editor) => {
          editorRef.current = editor;
        }}
        value={content}
        onEditorChange={(newContent) => {
          onChange(newContent);
        }}
        onBlur={() => {
          if (editorRef.current) {
            const html = editorRef.current.getContent();
            onChange(html);
          }
        }}
        init={{
          height: compact ? 600 : 800,
          menubar: false,
          toolbar_mode: "wrap",
          plugins: [
            "advlist",
            "autolink",
            "lists",
            "link",
            "image",
            "charmap",
            "preview",
            "anchor",
            "searchreplace",
            "visualblocks",
            "code",
            "fullscreen",
            "insertdatetime",
            "media",
            "table",
            "help",
            "wordcount",
          ],
          toolbar:
            "undo redo | blocks | " +
            "bold italic underline strikethrough | forecolor backcolor | " +
            "alignleft aligncenter alignright alignjustify | " +
            "bullist numlist | outdent indent | " +
            "removeformat | help | code",
          content_style:
            "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; line-height: 1.5; } " +
            "table { border-collapse: collapse; width: 100%; margin: 0.75em 0; } " +
            "td, th { padding: 0.4em 0.6em; vertical-align: top; } " +
            "th { font-weight: bold; background: #f5f5f5; } " +
            "h1 { font-size: 2em; font-weight: bold; margin: 0.67em 0; } " +
            "h2 { font-size: 1.5em; font-weight: bold; margin: 0.75em 0; } " +
            "h3 { font-size: 1.25em; font-weight: bold; margin: 0.83em 0; } " +
            "p { margin: 0.5em 0; } " +
            "ul, ol { padding-left: 1.5em; margin: 0.5em 0; }",
          valid_elements: "*[*]",
          extended_valid_elements: "*[*]",
          valid_children: "+body[style]",
          paste_retain_style_properties: "all",
          allow_script_urls: false,
          forced_root_block: "p",
          forced_root_block_attrs: {},
        }}
      />
    </div>
  );
}

