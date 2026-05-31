import {
  PageContent,
  Block,
  HeroBlockData,
  TextBlockData,
  ImageBlockData,
  VideoBlockData,
  FeaturesBlockData,
  TestimonialsBlockData,
  CTABlockData,
  SpacerBlockData,
} from "@/lib/page-builder/types";

interface PageRendererProps {
  content: PageContent;
}

export default function PageRenderer({ content }: PageRendererProps) {
  if (!content || !Array.isArray(content.blocks) || content.blocks.length === 0) {
    return (
      <div className="p-8 bg-gray-50 rounded-lg text-center text-gray-600">
        <p>Inhalt noch nicht definiert.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {content.blocks.map((block: Block) => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </div>
  );
}

function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case "hero":
      return <HeroBlock data={block.data as HeroBlockData} />;
    case "text":
      return <TextBlock data={block.data as TextBlockData} />;
    case "image":
      return <ImageBlock data={block.data as ImageBlockData} />;
    case "video":
      return <VideoBlock data={block.data as VideoBlockData} />;
    case "features":
      return <FeaturesBlock data={block.data as FeaturesBlockData} />;
    case "testimonials":
      return <TestimonialsBlock data={block.data as TestimonialsBlockData} />;
    case "cta":
      return <CTABlock data={block.data as CTABlockData} />;
    case "spacer":
      return <SpacerBlock data={block.data as SpacerBlockData} />;
    default:
      return null;
  }
}

function HeroBlock({ data }: { data: HeroBlockData }) {
  const alignClass = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  }[data.align || "center"];

  return (
    <div className={`bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 rounded-2xl p-12 ${alignClass}`}>
      <h2 className="text-4xl font-bold text-gray-900 mb-4">
        {data.heading || "Überschrift"}
      </h2>
      {data.subheading && (
        <p className="text-xl text-gray-700">{data.subheading}</p>
      )}
    </div>
  );
}

function TextBlock({ data }: { data: TextBlockData }) {
  return (
    <div className="prose max-w-none">
      <p className="text-gray-700 leading-relaxed whitespace-pre-line">
        {data.text || ""}
      </p>
    </div>
  );
}

function ImageBlock({ data }: { data: ImageBlockData }) {
  if (!data.src) {
    return (
      <div className="p-8 bg-gray-100 rounded-lg text-center text-gray-500">
        Kein Bild angegeben
      </div>
    );
  }

  return (
    <figure className="space-y-2">
      <img
        src={data.src}
        alt={data.alt || "Bild"}
        className="w-full rounded-lg shadow-lg"
      />
      {data.caption && (
        <figcaption className="text-sm text-gray-600 text-center">
          {data.caption}
        </figcaption>
      )}
    </figure>
  );
}

function VideoBlock({ data }: { data: VideoBlockData }) {
  if (!data.src) {
    return (
      <div className="p-8 bg-gray-100 rounded-lg text-center text-gray-500">
        Kein Video angegeben
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.title && (
        <h3 className="text-lg font-semibold text-gray-900">{data.title}</h3>
      )}
      <video
        src={data.src}
        controls
        className="w-full rounded-lg shadow-lg"
      >
        Ihr Browser unterstützt das Video-Element nicht.
      </video>
    </div>
  );
}

function FeaturesBlock({ data }: { data: FeaturesBlockData }) {
  const items = data.items || [];

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item, index) => (
        <div
          key={index}
          className="p-6 bg-white rounded-lg shadow-md border border-gray-200"
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {item.title}
          </h3>
          <p className="text-gray-600">{item.text}</p>
        </div>
      ))}
    </div>
  );
}

function TestimonialsBlock({ data }: { data: TestimonialsBlockData }) {
  const items = data.items || [];

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {items.map((item, index) => (
        <div
          key={index}
          className="p-6 bg-rose-50 rounded-lg border-l-4 border-rose-500"
        >
          <p className="text-gray-700 mb-4 italic">"{item.text}"</p>
          <p className="text-sm font-semibold text-gray-900">— {item.name}</p>
        </div>
      ))}
    </div>
  );
}

function CTABlock({ data }: { data: CTABlockData }) {
  return (
    <div className="bg-gradient-to-r from-rose-500 to-orange-500 rounded-2xl p-12 text-center text-white">
      <h2 className="text-3xl font-bold mb-4">{data.heading || "Call to Action"}</h2>
      {data.text && <p className="text-xl mb-6 opacity-90">{data.text}</p>}
      <a
        href={data.buttonHref || "#"}
        className="inline-block bg-white text-rose-500 font-semibold px-8 py-3 rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
      >
        {data.buttonLabel || "Jetzt starten"}
      </a>
    </div>
  );
}

function SpacerBlock({ data }: { data: SpacerBlockData }) {
  const sizeMap: Record<string, string> = {
    sm: "h-4",
    md: "h-8",
    lg: "h-16",
    xl: "h-24",
  };
  const size = data.size || "md";
  return <div className={sizeMap[size] || sizeMap.md} />;
}


