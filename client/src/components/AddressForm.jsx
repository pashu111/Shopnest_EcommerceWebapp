import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { CheckCircle2, LocateFixed, MapPin, PencilLine, Search } from "lucide-react";

const initialTouched = {
  fullAddress: false,
};

const validateAddress = (address) => {
  const value = String(address || "").trim();

  if (!value) return "Delivery address is required.";
  if (value.length < 12) return "Enter a more complete delivery address.";
  if (!/[a-zA-Z]/.test(value)) return "Address must include a readable area or street name.";
  if (!/\d|road|street|nagar|colony|sector|lane|apartment|flat|house|near/i.test(value)) {
    return "Add a house, street, landmark, or area detail.";
  }

  return "";
};

export default function AddressForm({ value, onChange, disabled = false }) {
  const [isLocating, setIsLocating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [status, setStatus] = useState("");
  const [touched, setTouched] = useState(initialTouched);

  const address = value || {};
  const fullAddress = address.fullAddress || "";
  const latitude = address.latitude ?? "";
  const longitude = address.longitude ?? "";

  const addressError = useMemo(() => validateAddress(fullAddress), [fullAddress]);
  const hasCoordinates =
    Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
  const isValid = !addressError && hasCoordinates;

  const updateAddress = (patch) => {
    onChange({
      fullAddress,
      latitude: latitude === "" ? null : Number(latitude),
      longitude: longitude === "" ? null : Number(longitude),
      ...patch,
    });
  };

  const reverseGeocode = async (lat, lng) => {
    const response = await axios.get("https://nominatim.openstreetmap.org/reverse", {
      params: {
        format: "jsonv2",
        lat,
        lon: lng,
      },
      timeout: 9000,
    });

    return response?.data?.display_name || "";
  };

  const geocodeAddress = async () => {
    const error = validateAddress(fullAddress);
    setTouched({ fullAddress: true });
    if (error) {
      setStatus(error);
      return;
    }

    setIsValidating(true);
    setStatus("Validating address...");
    try {
      const response = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: {
          format: "jsonv2",
          limit: 1,
          q: fullAddress,
        },
        timeout: 9000,
      });

      const match = Array.isArray(response.data) ? response.data[0] : null;
      if (!match?.lat || !match?.lon) {
        setStatus("We could not find coordinates for this address. Use current location or add more detail.");
        return;
      }

      updateAddress({
        latitude: Number(match.lat),
        longitude: Number(match.lon),
      });
      setStatus("Address validated and pinned.");
    } catch {
      setStatus("Address lookup failed. You can still use current location and edit the address.");
    } finally {
      setIsValidating(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatus("Location services are not supported in this browser.");
      return;
    }

    setIsLocating(true);
    setStatus("Fetching your current location...");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = Number(position.coords.latitude);
        const lng = Number(position.coords.longitude);
        let nextAddress = fullAddress;

        try {
          const resolvedAddress = await reverseGeocode(lat, lng);
          if (resolvedAddress) nextAddress = resolvedAddress;
        } catch {
          setStatus("Location found. Add or edit the full address before placing the order.");
        }

        updateAddress({
          latitude: lat,
          longitude: lng,
          fullAddress: nextAddress,
        });
        setTouched({ fullAddress: true });
        setStatus("Location pinned. You can edit the address manually.");
        setIsLocating(false);
      },
      () => {
        setStatus("Location permission was denied or unavailable. Enter and validate your address manually.");
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      }
    );
  };

  useEffect(() => {
    if (!fullAddress && !latitude && !longitude) {
      setStatus("");
    }
  }, [fullAddress, latitude, longitude]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
            Delivery Location
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">
            Select where we should deliver
          </h2>
        </div>
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={disabled || isLocating}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LocateFixed size={16} />
          {isLocating ? "Locating..." : "Use Current Location"}
        </button>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <PencilLine size={15} />
            Full address
          </span>
          <textarea
            name="fullAddress"
            rows={4}
            value={fullAddress}
            disabled={disabled}
            onBlur={() => setTouched((prev) => ({ ...prev, fullAddress: true }))}
            onChange={(event) =>
              updateAddress({
                fullAddress: event.target.value,
              })
            }
            placeholder="Flat / house no, street, area, landmark, city, pincode"
            className="min-h-28 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-400/30"
          />
        </label>

        {touched.fullAddress && addressError && (
          <p className="text-sm font-medium text-rose-600">{addressError}</p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <MapPin size={15} />
              Latitude
            </span>
            <input
              type="number"
              step="any"
              value={latitude}
              disabled={disabled}
              onChange={(event) =>
                updateAddress({
                  latitude: event.target.value === "" ? null : Number(event.target.value),
                })
              }
              placeholder="Auto or manual"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-400/30"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <MapPin size={15} />
              Longitude
            </span>
            <input
              type="number"
              step="any"
              value={longitude}
              disabled={disabled}
              onChange={(event) =>
                updateAddress({
                  longitude: event.target.value === "" ? null : Number(event.target.value),
                })
              }
              placeholder="Auto or manual"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-400/30"
            />
          </label>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={geocodeAddress}
            disabled={disabled || isValidating}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Search size={16} />
            {isValidating ? "Validating..." : "Validate Address"}
          </button>

          {isValid && (
            <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 size={16} />
              Address ready
            </span>
          )}
        </div>

        {status && (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {status}
          </p>
        )}
      </div>
    </section>
  );
}
