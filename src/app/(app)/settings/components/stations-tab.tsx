"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import StationsTable from "../../stations/components/stations-table";
import { getStations } from "../../stations/actions";
import type { Station } from "../../stations/actions";

export function StationsTab() {
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshStations = async () => {
    const data = await getStations();
    setStations(data);
  };

  useEffect(() => {
    getStations()
      .then(setStations)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return <StationsTable stations={stations} onRefresh={refreshStations} />;
}
