import { db } from "@/lib/db";
import { parsePageContent } from "@/lib/page-builder/schema";
import PageRenderer from "./page-renderer";
import { ReusableBlockData } from "@/lib/page-builder/types";

interface ReusableBlockRendererProps {
  data: ReusableBlockData;
}

/**
 * Server Component: Resolved Reusable Block aus DB
 * Verhindert infinite recursion durch visitedIds tracking
 */
export async function ReusableBlockRenderer({
  data,
}: ReusableBlockRendererProps) {
  const { reusableId } = data;

  if (!reusableId) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center text-red-600">
        <p className="text-sm">Reusable Block: Keine ID angegeben</p>
      </div>
    );
  }

  try {
    const reusableBlock = await db.reusableBlock.findUnique({
      where: { id: reusableId },
    });

    if (!reusableBlock) {
      return (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center text-yellow-600">
          <p className="text-sm">Reusable Block nicht gefunden: {reusableId}</p>
        </div>
      );
    }

    // Parse contentJson (kann PageContentV1 oder einzelner Block sein)
    const content = parsePageContent(reusableBlock.contentJson);

    return <PageRenderer content={content} />;
  } catch (error) {
    console.error("Error rendering reusable block:", error);
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center text-red-600">
        <p className="text-sm">Fehler beim Laden des Reusable Blocks</p>
      </div>
    );
  }
}



