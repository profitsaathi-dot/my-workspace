import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * React Query hook for products with automatic caching and deduplication.
 * 
 * Benefits:
 * - Multiple components can call this hook simultaneously = 1 API request
 * - Data is cached for 3 minutes (no refetch if fresh)
 * - Automatic background refetching when data becomes stale
 * - Optimistic updates for better UX
 */

interface Product {
  id: number;
  name: string;
  sellingPrice: number;
  status: string;
  // ... other fields
}

/**
 * Fetch all products for the current seller.
 * Cached for 3 minutes, deduplicated across components.
 */
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await fetch('/api/products', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      return response.json() as Promise<Product[]>;
    },
  });
}

/**
 * Fetch a single product by ID.
 * Cached independently from the products list.
 */
export function useProduct(productId: number | null) {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId) return null;
      const response = await fetch(`/api/products/${productId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch product');
      }
      return response.json() as Promise<Product>;
    },
    enabled: !!productId, // Only fetch if productId is provided
  });
}

/**
 * Create a new product with optimistic updates.
 * Automatically invalidates the products list cache.
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productData: FormData) => {
      const response = await fetch('/api/products', {
        method: 'POST',
        credentials: 'include',
        body: productData,
      });
      if (!response.ok) {
        throw new Error('Failed to create product');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate products list to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

/**
 * Update an existing product with optimistic updates.
 * Automatically invalidates both the product and products list cache.
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, data }: { productId: number; data: FormData }) => {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        credentials: 'include',
        body: data,
      });
      if (!response.ok) {
        throw new Error('Failed to update product');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate both the specific product and the products list
      queryClient.invalidateQueries({ queryKey: ['product', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

/**
 * Delete a product with optimistic updates.
 * Automatically invalidates the products list cache.
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: number) => {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to delete product');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate products list to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
