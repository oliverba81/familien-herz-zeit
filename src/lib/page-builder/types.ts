export type BlockType =
  | "hero"
  | "text"
  | "image"
  | "video"
  | "features"
  | "testimonials"
  | "cta"
  | "spacer";

export interface Block {
  id: string;
  type: BlockType;
  data: Record<string, any>;
}

export interface PageContent {
  version: number;
  blocks: Block[];
}

// Block-spezifische Data-Typen (für Type-Safety)
export interface HeroBlockData {
  heading: string;
  subheading?: string;
  align?: "left" | "center" | "right";
}

export interface TextBlockData {
  text: string;
}

export interface ImageBlockData {
  src: string;
  alt?: string;
  caption?: string;
}

export interface VideoBlockData {
  src: string;
  title?: string;
}

export interface FeatureItem {
  title: string;
  text: string;
}

export interface FeaturesBlockData {
  items: FeatureItem[];
}

export interface TestimonialItem {
  name: string;
  text: string;
}

export interface TestimonialsBlockData {
  items: TestimonialItem[];
}

export interface CTABlockData {
  heading: string;
  text?: string;
  buttonLabel: string;
  buttonHref: string;
}

export interface SpacerBlockData {
  size: "sm" | "md" | "lg" | "xl";
}


