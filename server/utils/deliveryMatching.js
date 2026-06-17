import DeliveryPartner from "../models/DeliveryPartner.js";
import Order from "../models/Order.js";

export const NEARBY_RADIUS_KM = 5;
export const NEARBY_ORDER_TTL_MINUTES = 15;

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const isValidCoordinatePair = (latitude, longitude) => {
  const lat = toNumber(latitude);
  const lng = toNumber(longitude);
  return (
    lat !== null &&
    lng !== null &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};

export const haversineDistanceKm = (from, to) => {
  const fromLat = toNumber(from?.latitude);
  const fromLng = toNumber(from?.longitude);
  const toLat = toNumber(to?.latitude);
  const toLng = toNumber(to?.longitude);

  if (!isValidCoordinatePair(fromLat, fromLng) || !isValidCoordinatePair(toLat, toLng)) {
    return null;
  }

  const earthRadiusKm = 6371;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const lat1 = toRadians(fromLat);
  const lat2 = toRadians(toLat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

export const estimateDeliveryMinutes = (distanceKm) => {
  const distance = Number(distanceKm);
  if (!Number.isFinite(distance)) return null;
  return Math.max(8, Math.ceil(distance * 5 + 6));
};

const stripDeliveryOtpFields = (orderLike) => {
  const plain =
    typeof orderLike?.toObject === "function" ? orderLike.toObject() : orderLike;
  if (!plain || typeof plain !== "object") return plain;
  const clone = { ...plain };
  delete clone.deliveryOtp;
  delete clone.deliveryOtpExpiresAt;
  return clone;
};

const hasFreshLocation = (partner) => {
  const updatedAt = partner?.liveLocation?.updatedAt
    ? new Date(partner.liveLocation.updatedAt).getTime()
    : 0;
  const location = isValidCoordinatePair(
    partner?.liveLocation?.latitude,
    partner?.liveLocation?.longitude
  )
    ? partner.liveLocation
    : partner?.location;
  return (
    partner?.isOnline &&
    isValidCoordinatePair(location?.latitude, location?.longitude) &&
    updatedAt > Date.now() - 10 * 60 * 1000
  );
};

const getPartnerLocation = (partner) => {
  if (
    isValidCoordinatePair(
      partner?.liveLocation?.latitude,
      partner?.liveLocation?.longitude
    )
  ) {
    return partner.liveLocation;
  }

  if (isValidCoordinatePair(partner?.location?.latitude, partner?.location?.longitude)) {
    return partner.location;
  }

  return null;
};

export const enrichNearbyOrder = (order, partnerLocation) => {
  const plain = stripDeliveryOtpFields(order);
  const distanceKm = haversineDistanceKm(partnerLocation, plain?.deliveryLocation);
  if (distanceKm === null) return null;

  return {
    ...plain,
    nearby: {
      distanceKm: Number(distanceKm.toFixed(2)),
      estimatedMinutes: estimateDeliveryMinutes(distanceKm),
      expiresAt: plain.nearbyOfferExpiresAt,
    },
  };
};

const getOpenNearbyOrderQuery = (partnerId) => ({
  deliveryPartner: null,
  currentDeliveryOfferPartner: partnerId,
  status: { $nin: ["Cancelled", "Delivered", "Out for Delivery"] },
  "deliveryLocation.latitude": { $type: "number" },
  "deliveryLocation.longitude": { $type: "number" },
  nearbyRejectedBy: { $ne: partnerId },
  $or: [
    { nearbyOfferExpiresAt: null },
    { nearbyOfferExpiresAt: { $gt: new Date() } },
  ],
});

export const getNearbyOrdersForPartner = async (
  partnerId,
  { radiusKm = NEARBY_RADIUS_KM, limit = 20 } = {}
) => {
  const partner = await DeliveryPartner.findById(partnerId).select(
    "isOnline liveLocation location fullName"
  );
  if (!partner || !hasFreshLocation(partner)) return [];

  const partnerLocation = getPartnerLocation(partner);
  if (!partnerLocation) return [];

  const location = {
    latitude: partnerLocation.latitude,
    longitude: partnerLocation.longitude,
  };
  const orders = await Order.find(getOpenNearbyOrderQuery(partner._id))
    .populate("user", "name email phone")
    .sort({ createdAt: -1 })
    .limit(100);

  return orders
    .map((order) => enrichNearbyOrder(order, location))
    .filter((order) => order && order.nearby.distanceKm <= radiusKm)
    .sort((a, b) => a.nearby.distanceKm - b.nearby.distanceKm)
    .slice(0, limit);
};

export const assignNearestDeliveryPartnerOffer = async (
  app,
  orderId,
  { radiusKm = NEARBY_RADIUS_KM } = {}
) => {
  const order = await Order.findById(orderId).populate("user", "name email phone");
  if (!order || order.deliveryPartner || order.status === "Cancelled") return null;

  if (!isValidCoordinatePair(order?.deliveryLocation?.latitude, order?.deliveryLocation?.longitude)) {
    console.warn("[delivery-match] order has invalid delivery coordinates", orderId);
    return null;
  }

  const rejectedIds = new Set(
    (Array.isArray(order.nearbyRejectedBy) ? order.nearbyRejectedBy : []).map((id) =>
      String(id)
    )
  );

  const partners = await DeliveryPartner.find({
    _id: { $nin: Array.from(rejectedIds) },
    isOnline: true,
    "liveLocation.updatedAt": { $gt: new Date(Date.now() - 10 * 60 * 1000) },
    $or: [
      {
        "liveLocation.latitude": { $type: "number" },
        "liveLocation.longitude": { $type: "number" },
      },
      {
        "location.latitude": { $type: "number" },
        "location.longitude": { $type: "number" },
      },
    ],
  }).select("_id fullName liveLocation location");

  const rankedPartners = partners
    .map((partner) => {
      const location = getPartnerLocation(partner);
      const distanceKm = haversineDistanceKm(location, order.deliveryLocation);
      if (distanceKm === null || distanceKm > radiusKm) return null;
      return { partner, location, distanceKm };
    })
    .filter(Boolean)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const nearest = rankedPartners[0];
  if (!nearest) {
    order.currentDeliveryOfferPartner = null;
    order.currentDeliveryOfferDistanceKm = null;
    await order.save();
    console.warn("[delivery-match] no online delivery partner within radius", {
      orderId: String(order._id),
      radiusKm,
    });
    return null;
  }

  order.currentDeliveryOfferPartner = nearest.partner._id;
  order.currentDeliveryOfferDistanceKm = Number(nearest.distanceKm.toFixed(2));
  order.nearbyOfferExpiresAt = new Date(Date.now() + NEARBY_ORDER_TTL_MINUTES * 60 * 1000);
  await order.save();

  const updatedOrder = await Order.findById(order._id).populate("user", "name email phone");
  const enriched = enrichNearbyOrder(updatedOrder, nearest.location);
  if (!enriched) return null;

  const publish = app?.get?.("wsPublish");
  if (typeof publish === "function") {
    publish(`delivery_partner:${nearest.partner._id.toString()}`, {
      type: "nearby_order_available",
      order: enriched,
      deliveryPartnerId: nearest.partner._id.toString(),
      distanceKm: enriched.nearby.distanceKm,
      timestamp: new Date().toISOString(),
    });
  }

  console.log("[delivery-match] nearest partner offered order", {
    orderId: String(order._id),
    deliveryPartnerId: nearest.partner._id.toString(),
    distanceKm: Number(nearest.distanceKm.toFixed(2)),
  });

  return {
    order: enriched,
    partnerId: nearest.partner._id,
    distanceKm: Number(nearest.distanceKm.toFixed(2)),
  };
};

export const assignOpenOrdersToNearestDeliveryPartners = async (
  app,
  { limit = 20 } = {}
) => {
  const orders = await Order.find({
    deliveryPartner: null,
    currentDeliveryOfferPartner: null,
    status: { $nin: ["Cancelled", "Delivered", "Out for Delivery"] },
    "deliveryLocation.latitude": { $type: "number" },
    "deliveryLocation.longitude": { $type: "number" },
    $or: [
      { nearbyOfferExpiresAt: null },
      { nearbyOfferExpiresAt: { $gt: new Date() } },
    ],
  })
    .sort({ createdAt: 1 })
    .limit(limit)
    .select("_id");

  const results = [];
  for (const order of orders) {
    const result = await assignNearestDeliveryPartnerOffer(app, order._id);
    if (result) results.push(result);
  }

  return results;
};

export const publishNearbyOrdersForPartner = async (app, partnerId) => {
  const publish = app?.get?.("wsPublish");
  if (typeof publish !== "function") return;

  const orders = await getNearbyOrdersForPartner(partnerId);
  publish(`delivery_partner:${partnerId}`, {
    type: "nearby_orders_snapshot",
    orders,
    timestamp: new Date().toISOString(),
  });
};

export const publishNearbyOrderToEligiblePartners = async (app, orderId) => {
  return assignNearestDeliveryPartnerOffer(app, orderId);
};
