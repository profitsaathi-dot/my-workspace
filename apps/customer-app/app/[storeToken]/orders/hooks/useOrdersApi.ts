"use client";

import { useEffect, useState } from "react";
import { useUserNumbers } from "./useUserNumbers";
import { useSearch } from "../../context/search-context";

interface Order {
  id: string;
  orderNo: string;
  total: number;
  // mapStatus also returns the labelled states "Orders Created" /
  // "Ready to Ship"; keep the union honest so consumers don't lie to TS.
  orderStatus:
    | "pending"
    | "shipped"
    | "delivered"
    | "Orders Created"
    | "Ready to Ship";
  paymentStatus: string;
  date: string;
  productName: string;
  productId: number;
  unitPrice: number;
  quantity: number;
  costPrice: number;
  offerApplied: boolean;
  customerName: string;
  customerEmail: string;
  phoneNumber: string;
  address: string;
  comments: string;
}

export function useOrdersApi(filter: string) {
  const { numbers, loading: numbersLoading } = useUserNumbers();
  const { search } = useSearch();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (numbersLoading) return;
    if (!numbers.length) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const fetchOrders = async () => {
      try {
        setLoading(true);

        const requests = numbers.map((number) => {
          const params = new URLSearchParams({
            page: "0",
            size: "50",
            number,
            ...(filter !== "all" && { status: filter }),
            ...(search && { search }),
          });

          return fetch(`/user/api/orders?${params.toString()}`)
            .then((res) => res.json())
            .catch(() => []);
        });

        const results = await Promise.all(requests);

         

        // flatten all responses
        const merged = results.flatMap((r, i) => {
  if (!r) return [];

  if (Array.isArray(r)) return r;

  if (Array.isArray(r.content)) return r.content;

  if (Array.isArray(r.data)) return r.data;

  if (Array.isArray(r.orders)) return r.orders;

  console.warn("Unknown API response format:", r);
  return [];
});

function mapStatus(
  orderStatus: string,
  paymentStatus: string
): Order["orderStatus"] {

  // 💰 Payment not completed → always pending
  if (paymentStatus !== "PAID") {
    return "pending";
  }

  switch (orderStatus) {
    case "PENDING":
      return "pending";
    case "CREATED":
      return "Orders Created";
    case "CONFIRMED":
      return "Ready to Ship";
    case "SHIPPED":
      return "shipped";
    case "DELIVERED":
      return "delivered";
    default:
      return "pending";
  }
}

const mapped = merged.map((o: any) => ({
  id: String(o.id),
  orderNo: o.orderNo,
  total: o.totalCost,
  orderStatus: mapStatus(o.orderStatus, o.paymentStatus),
  paymentStatus: o.paymentStatus,
  date: o.createdAt,
  productName: o.product?.Name || "Unknown Product",
  productId: o.product?.Id || 0,
  unitPrice: o.unitPrice,
  quantity: o.quantity || 1,
  costPrice: o.costPrice,
  offerApplied: o.offerApplied,
  customerName: o.customerName || "Unknown Customer",
  customerEmail: o.customer?.email || "Unknown Email",
  phoneNumber: o.phoneNumber || "Unknown Phone",
  address: o.address || "Unknown Address",
  comments: o.comments || "No Comments",
}));
        setOrders(mapped);
      } catch (err) {
        console.error("Orders fetch failed", err);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [numbers, filter, search, numbersLoading]);

  return { orders, loading };
}