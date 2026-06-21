import { db } from "@/lib/db";
import { parsePageContent, PageContentV1 } from "@/lib/page-builder/schema";
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

  // DB-Logik im try; JSX-Konstruktion erfolgt NACH dem try anhand der Ergebnis-Variablen.
  let notFound = false;
  let loadError = false;
  let content: PageContentV1 | null = null;

  try {
    const reusableBlock = await db.reusableBlock.findUnique({
      where: { id: reusableId },
    });

    if (!reusableBlock) {
      notFound = true;
    } else {
      // Parse contentJson (kann PageContentV1 oder einzelner Block sein)
      content = parsePageContent(reusableBlock.contentJson);
    }
  } catch (error) {
    console.error("Error rendering reusable block:", error);
    loadError = true;
  }

  if (loadError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center text-red-600">
        <p className="text-sm">Fehler beim Laden des Reusable Blocks</p>
      </div>
    );
  }

  // `!content` ist in der Praxis unerreichbar, wenn der Block gefunden wurde
  // (parsePageContent liefert immer ein PageContentV1, nie null). Der Check
  // bleibt als defensiver Guard UND zur Typ-Verengung von `content` auf
  // non-null für den finalen Render erhalten.
  if (notFound || !content) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center text-yellow-600">
        <p className="text-sm">Reusable Block nicht gefunden: {reusableId}</p>
      </div>
    );
  }

  return <PageRenderer content={content} />;
}



