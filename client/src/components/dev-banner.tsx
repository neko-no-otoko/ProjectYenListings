import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";

export function DevBanner() {
  const { data } = useQuery<{ liveCount: number; isDev: boolean }>({
    queryKey: ["/api/stats/live-listings"],
  });

  if (!data?.isDev || data.liveCount > 0) {
    return null;
  }

  return (
    <div 
      className="bg-amber-100 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 px-4 py-3"
      data-testid="banner-no-live-listings"
    >
      <div className="container mx-auto flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <div className="text-sm text-amber-800 dark:text-amber-200">
          <span className="font-medium">No live listings yet.</span>{" "}
          <span className="text-amber-700 dark:text-amber-300">
            Run <code className="bg-amber-200 dark:bg-amber-800 px-1.5 py-0.5 rounded text-xs font-mono">tsx scripts/ingest-ckan.ts</code> then{" "}
            <code className="bg-amber-200 dark:bg-amber-800 px-1.5 py-0.5 rounded text-xs font-mono">tsx scripts/sync-listings.ts</code> to populate listings from CKAN sources.
          </span>
        </div>
      </div>
    </div>
  );
}
