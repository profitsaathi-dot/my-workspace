import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * React Query hooks for cart operations with automatic caching and deduplication.
 * 
 * Benefits:
 * - Cart data cached for 5 minutes (customers browse slowly)
 * - Multiple components showing cart = 1 API request
 * - Optimistic updates for instant UI feedback
 * - Automatic retry on network failures
 */

interface CartItem {
  id: number;
  name: string;
  qty: number;
  productDetails: {
    id: number;
    sellingPrice: number;
    mainImageUrl: string | null;
  };
}

/**
 * Fetch cart items for the current customer.
 * Cached for 5 minutes, deduplicated across components.
 */
export function useCart() {
  return useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const response = await fetch('/api/cart', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch cart');
      }
      return response.json() as Promise<CartItem[]>;
    },
  });
}

/**
 * Add item to cart with optimistic updates.
 * Automatically invalidates cart cache.
 */
export function useAddToCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: { productId: number; name: string; qty: number }) => {
      const response = await fetch('/api/cart', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (!response.ok) {
        throw new Error('Failed to add to cart');
      }
      return response.json();
    },
    // Optimistic update: immediately update UI before server responds
    onMutate: async (newItem) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['cart'] });

      // Snapshot previous value
      const previousCart = queryClient.getQueryData<CartItem[]>(['cart']);

      // Optimistically update cart
      if (previousCart) {
        queryClient.setQueryData<CartItem[]>(['cart'], (old) => {
          if (!old) return old;
          const existing = old.find((item) => item.productDetails.id === newItem.productId);
          if (existing) {
            // Update quantity
            return old.map((item) =>
              item.productDetails.id === newItem.productId
                ? { ...item, qty: newItem.qty }
                : item
            );
          } else {
            // Add new item (with placeholder data)
            return [
              ...old,
              {
                id: Date.now(), // Temporary ID
                name: newItem.name,
                qty: newItem.qty,
                productDetails: {
                  id: newItem.productId,
                  sellingPrice: 0, // Will be updated on success
                  mainImageUrl: null,
                },
              },
            ];
          }
        });
      }

      return { previousCart };
    },
    // On error, rollback to previous value
    onError: (err, newItem, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(['cart'], context.previousCart);
      }
    },
    // Always refetch after success or error
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

/**
 * Remove item from cart with optimistic updates.
 */
export function useRemoveFromCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: number) => {
      const response = await fetch(`/api/cart/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to remove from cart');
      }
      return response.json();
    },
    // Optimistic update
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previousCart = queryClient.getQueryData<CartItem[]>(['cart']);

      // Remove item immediately
      if (previousCart) {
        queryClient.setQueryData<CartItem[]>(['cart'], (old) =>
          old ? old.filter((item) => item.id !== itemId) : old
        );
      }

      return { previousCart };
    },
    onError: (err, itemId, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(['cart'], context.previousCart);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}
