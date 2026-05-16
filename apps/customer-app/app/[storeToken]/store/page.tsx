import HomeClient from "./HomeClient";
import { headers } from "next/headers";

async function getProducts(storeToken: string) {
  const headersList = await headers();

  const host = headersList.get("host"); // localhost:3000
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";

  const baseUrl = `${protocol}://${host}`;

  const res = await fetch(
    `${baseUrl}/user/api/products/public-products?token=${storeToken}`,
    { cache: "no-store" }
  );

  const data = await res.json();

  return Array.isArray(data)
    ? data
    : data.data || data.products || [];
}

export default async function Page({
  params,
}: {
  params: Promise<{ storeToken: string }>;
}) {
  const { storeToken } = await params; // ✅ IMPORTANT

  const products = await getProducts(storeToken);

  return (
    <HomeClient
      products={products}
      storeToken={storeToken}
    />
  );
}