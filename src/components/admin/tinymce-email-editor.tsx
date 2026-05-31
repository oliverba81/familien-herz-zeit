"use client";

import { Editor } from "@tinymce/tinymce-react";
import { useRef } from "react";

interface TinyMCEEmailEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export default function TinyMCEEmailEditor({
  content,
  onChange,
}: TinyMCEEmailEditorProps) {
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
        onEditorChange={(content) => {
          onChange(content);
        }}
        init={{
          height: 520, // 30% höher als 400px
          menubar: false,
          toolbar_mode: "wrap", // Erlaubt zweireihige Toolbar
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
            "code",
            "help",
            "wordcount",
            "textcolor",
            "colorpicker",
            "fontsize",
            "fontfamily",
          ],
          toolbar:
            "undo redo | blocks | " +
            "fontfamily fontsize | " +
            "bold italic underline strikethrough | forecolor backcolor | " +
            "alignleft aligncenter alignright alignjustify | " +
            "bullist numlist | outdent indent | " +
            "removeformat | help | code",
          // Schriftgrößen in Pixel
          fontsize_formats: "8px 10px 12px 14px 16px 18px 20px 24px 28px 32px 36px 48px 60px 72px",
          // Schriftarten
          font_family_formats:
            "Andale Mono=andale mono,times; " +
            "Arial=arial,helvetica,sans-serif; " +
            "Arial Black=arial black,avant garde; " +
            "Book Antiqua=book antiqua,palatino; " +
            "Comic Sans MS=comic sans ms,sans-serif; " +
            "Courier New=courier new,courier; " +
            "Georgia=georgia,palatino; " +
            "Helvetica=helvetica; " +
            "Impact=impact,chicago; " +
            "Symbol=symbol; " +
            "Tahoma=tahoma,arial,helvetica,sans-serif; " +
            "Terminal=terminal,monaco; " +
            "Times New Roman=times new roman,times; " +
            "Trebuchet MS=trebuchet ms,geneva; " +
            "Verdana=verdana,geneva; " +
            "Webdings=webdings; " +
            "Wingdings=wingdings,zapf dingbats",
          content_style:
            "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; }",
          // Stelle sicher, dass Platzhalter wie {{courseTitle}} nicht verändert werden
          valid_elements: "*[*]",
          extended_valid_elements: "*[*]",
          // Erlaube alle HTML-Attribute (wichtig für E-Mail-Templates mit inline styles)
          valid_children: "+body[style]",
          // Behalte alle Styles beim Einfügen
          paste_retain_style_properties: "all",
          // Erlaube alle HTML-Tags
          allow_script_urls: false,
          // Stelle sicher, dass Platzhalter erhalten bleiben
          forced_root_block: "p",
          forced_root_block_attrs: {},
        }}
      />
    </div>
  );
}

