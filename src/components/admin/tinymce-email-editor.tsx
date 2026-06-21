"use client";

import { WysiwygEditor } from "@/vendor/wysiwyg-editor/react";
import { EMAIL_TOOLBAR } from "@/lib/wysiwyg/toolbars";
import { uploadImageToMedia } from "@/lib/wysiwyg/upload-image";

interface TinyMCEEmailEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export default function TinyMCEEmailEditor({
  content,
  onChange,
}: TinyMCEEmailEditorProps) {
  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <WysiwygEditor
        value={content}
        onChange={onChange}
        toolbar={EMAIL_TOOLBAR}
        minHeight="520px"
        locale="de"
        onImageUpload={uploadImageToMedia}
        // E-Mail-HTML kommt vertrauenswürdig aus dem Admin und nutzt Inline-Styles
        // sowie {{platzhalter}}-Tokens, die unangetastet bleiben müssen.
        sanitize={false}
      />
    </div>
  );
}
