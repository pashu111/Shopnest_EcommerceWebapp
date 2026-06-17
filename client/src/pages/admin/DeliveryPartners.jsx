import React, { useEffect, useMemo, useState } from "react";
import { Mail, MapPin, Search, Star, Users } from "lucide-react";
import { getDeliveryPartners } from "../../services/deliveryPartnerService";
import { resolveAssetUrl } from "../../utils/assetUrl";

const getApiErrorMessage = (error) => {
  const status = error?.response?.status;
  const data = error?.response?.data;
  const message =
    (typeof data?.message === "string" && data.message) ||
    (typeof data?.error === "string" && data.error) ||
    (typeof error?.message === "string" && error.message) ||
    "";

  if (status === 401) return message || "Unauthorized. Please sign in again.";
  if (status) return message || `Request failed (${status}).`;
  return message || "Network error. Check if your backend is running.";
};

const formatAvailability = (value) => {
  if (!value) return "-";
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("-");
};

const formatJoinedDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
};

const DeliveryPartners = () => {
  const [partners, setPartners] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("All");

  useEffect(() => {
    let active = true;
    const loadPartners = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const data = await getDeliveryPartners();
        if (active) setPartners(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Load delivery partners error:", error);
        if (active) setLoadError(getApiErrorMessage(error));
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadPartners();
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const fullTimeCount = partners.filter((p) => p.availability === "full-time").length;
    const partTimeCount = partners.filter((p) => p.availability === "part-time").length;
    return { total: partners.length, fullTimeCount, partTimeCount };
  }, [partners]);

  const filteredPartners = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return partners.filter((partner) => {
      if (availabilityFilter !== "All" && partner.availability !== availabilityFilter) return false;

      if (!term) return true;
      const name = partner.fullName || "";
      const email = partner.email || "";
      const city = partner.deliveryCity || "";
      const availability = partner.availability || "";
      const mobile = partner.mobileNumber || "";
      return [name, email, city, availability, mobile].join(" ").toLowerCase().includes(term);
    });
  }, [partners, searchTerm, availabilityFilter]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">
            Admin Console
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-1">
            Delivery Partners
          </h1>
          <p className="text-slate-600 mt-2">
            Browse delivery partners by city and availability to help assign orders faster.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Total Partners</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.total}</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Star size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Full-time</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.fullTimeCount}</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <Star size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Part-time</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.partTimeCount}</h3>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search partners..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none transition bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-slate-600">Availability</label>
          <select
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-semibold hover:bg-slate-50"
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
          >
            <option value="All">All</option>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-slate-500">Loading delivery partners...</div>
        ) : loadError ? (
          <div className="p-10 text-center text-rose-600 font-semibold">{loadError}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Partner</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">City</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Availability</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Rating</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPartners.map((partner) => {
                  const ratingValue = Number(partner.ratingsAverage) || 0;
                  const ratingCount = Number(partner.ratingsCount) || 0;
                  const availability = partner.availability || "";
                  const badgeClass =
                    availability === "full-time"
                      ? "bg-emerald-50 text-emerald-700"
                      : availability === "part-time"
                        ? "bg-amber-50 text-amber-800"
                        : "bg-slate-100 text-slate-600";

                  return (
                    <tr key={partner._id || partner.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {partner.profilePhotoJpg ? (
                            <img
                              src={resolveAssetUrl(partner.profilePhotoJpg)}
                              alt=""
                              className="h-10 w-10 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                              <Users size={16} />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-slate-900">{partner.fullName || "-"}</div>
                            <div className="flex flex-wrap items-center gap-3 mt-0.5 text-xs text-slate-500">
                              {partner.email && (
                                <span className="inline-flex items-center gap-1">
                                  <Mail size={12} /> {partner.email}
                                </span>
                              )}
                              {partner.mobileNumber && (
                                <span className="inline-flex items-center gap-1">
                                  +91 {partner.mobileNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-sm text-slate-700 font-semibold">
                          <MapPin size={16} className="text-slate-400" />
                          {partner.deliveryCity || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${badgeClass}`}>
                          {formatAvailability(partner.availability)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-sm font-bold text-slate-900">
                            <Star size={16} className="text-amber-500" />
                            {ratingValue.toFixed(1)}
                          </span>
                          <span className="text-xs text-slate-500">({ratingCount})</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                        {formatJoinedDate(partner.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredPartners.length === 0 && (
              <div className="p-12 text-center text-slate-400">No delivery partners found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryPartners;
