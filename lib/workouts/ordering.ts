// Deleting a middle item leaves gaps; count is not the next append position.
export function nextOrder(orders: readonly number[]): number {
  return orders.length ? Math.max(...orders) + 1 : 0;
}
