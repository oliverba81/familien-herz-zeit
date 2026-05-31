interface ContentBlock {
  type: string;
  [key: string]: any;
}

interface ContentRendererProps {
  contentJson: any;
}

export default function ContentRenderer({ contentJson }: ContentRendererProps) {
  if (!contentJson || typeof contentJson !== "object") {
    return (
      <div className="p-8 bg-gray-50 rounded-lg text-center text-gray-600">
        <p>Inhalt noch nicht definiert.</p>
      </div>
    );
  }

  const blocks = contentJson.blocks || [];

  if (!Array.isArray(blocks) || blocks.length === 0) {
    return (
      <div className="p-8 bg-gray-50 rounded-lg text-center text-gray-600">
        <p>Inhalt noch nicht definiert.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {blocks.map((block: ContentBlock, index: number) => {
        switch (block.type) {
          case "hero":
            return (
              <div
                key={index}
                className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 rounded-2xl p-12 text-center"
              >
                <h2 className="text-4xl font-bold text-gray-900 mb-4">
                  {block.heading || "Überschrift"}
                </h2>
                {block.subheading && (
                  <p className="text-xl text-gray-700">{block.subheading}</p>
                )}
              </div>
            );

          case "text":
            return (
              <div key={index} className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {block.text || ""}
                </p>
              </div>
            );

          case "spacer":
            const sizeMap: Record<string, string> = {
              sm: "h-4",
              md: "h-8",
              lg: "h-16",
              xl: "h-24",
            };
            const size = block.size || "md";
            return (
              <div
                key={index}
                className={sizeMap[size] || sizeMap.md}
              />
            );

          default:
            return null;
        }
      })}
    </div>
  );
}


