"use client";

import { WysiwygEditor } from "@/vendor/wysiwyg-editor/react";
import { BLOCK_TOOLBAR } from "@/lib/wysiwyg/toolbars";
import { uploadImageToMedia } from "@/lib/wysiwyg/upload-image";

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
  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <WysiwygEditor
        value={content}
        onChange={onChange}
        toolbar={BLOCK_TOOLBAR}
        minHeight={compact ? "600px" : "800px"}
        locale="de"
        onImageUpload={uploadImageToMedia}
        sanitize
      />
    </div>
  );
}
