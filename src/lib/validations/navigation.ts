import { z } from "zod";

export const navigationItemSchema = z.object({
  location: z.enum(["HEADER", "FOOTER"]),
  label: z.string().min(1, "Label ist erforderlich"),
  href: z.string().optional().nullable(),
  order: z.number().int().min(0).default(0),
  parentId: z.string().optional().nullable(),
});

export type NavigationItemData = z.infer<typeof navigationItemSchema>;

