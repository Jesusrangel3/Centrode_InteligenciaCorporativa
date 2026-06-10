import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

interface SamsaraVehicleStat {
  id: string;
  name: string;
  gps?: any;
  obdOdometerMeters?: any;
  engineStates?: any;
}

interface SamsaraApiResponse {
  data: SamsaraVehicleStat[];
}

export const syncSamsaraTelemetry = createServerFn({ method: "POST" })
  .inputValidator(z.string())
  .handler(async ({ data: apiKey }: { data: string }) => {
    try {
      // Fetch latest point-in-time statistics for all vehicles
      const response = await fetch(
        "https://api.samsara.com/fleet/vehicles/stats?types=gps,obdOdometerMeters,engineStates",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Samsara API Error (${response.status}): ${errText || response.statusText}`);
      }

      const result = (await response.json()) as SamsaraApiResponse;

      // Try to fetch vehicle metadata (make, model, licensePlate) in parallel
      let vehicleMeta: Record<string, { make?: string; model?: string; licensePlate?: string; driverName?: string | null }> = {};
      try {
        const metaRes = await fetch(
          "https://api.samsara.com/fleet/vehicles",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              Accept: "application/json",
            },
          }
        );
        if (metaRes.ok) {
          const metaJson = await metaRes.json() as any;
          if (metaJson.data && Array.isArray(metaJson.data)) {
            metaJson.data.forEach((v: any) => {
              vehicleMeta[v.id] = {
                make: v.make,
                model: v.model,
                licensePlate: v.licensePlate,
                driverName: v.staticAssignedDriver?.name || null,
              };
            });
          }
        }
      } catch (metaErr) {
        console.warn("Failed to fetch vehicle metadata from Samsara, falling back:", metaErr);
      }
      
      // Clean and normalize the data
      const cleanedData = result.data.map((vehicle) => {
        const getFirstOrObj = (field: any) => {
          if (!field) return null;
          if (Array.isArray(field)) return field[0];
          return field;
        };

        const gps = getFirstOrObj(vehicle.gps);
        const odometer = getFirstOrObj(vehicle.obdOdometerMeters);
        const engineState = getFirstOrObj(vehicle.engineStates);
        const meta = vehicleMeta[vehicle.id];

        return {
          id: vehicle.id,
          name: vehicle.name,
          speedMph: gps ? gps.speedMilesPerHour : 0,
          latitude: gps ? gps.latitude : null,
          longitude: gps ? gps.longitude : null,
          odometerKm: odometer ? Math.round(odometer.value / 1000) : null,
          engineState: engineState ? engineState.value : null,
          make: meta?.make || null,
          model: meta?.model || null,
          licensePlate: meta?.licensePlate || null,
          driverName: meta?.driverName || null,
        };
      });

      return { success: true, data: cleanedData };
    } catch (err: any) {
      console.error("Error in syncSamsaraTelemetry server function:", err);
      return { success: false, error: err.message || "Unknown server error" };
    }
  });
