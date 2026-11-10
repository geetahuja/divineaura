/**
 * Store policy values kept in each region's `metadata`. The storefront renders
 * the shipping/returns pages and structured data from these keys, and merchants
 * can change them in Settings → Regions → Metadata.
 * Amounts are whole rupees (GST-inclusive).
 */
export type RegionStorePolicies = {
  return_window_days: number;
  free_returns: boolean;
  shipping_rate: number;
  free_shipping_threshold: number;
  handling_days_min: number;
  handling_days_max: number;
  transit_days_min: number;
  transit_days_max: number;
};

export const DEFAULT_REGION_STORE_POLICIES: RegionStorePolicies = {
  return_window_days: 7,
  free_returns: false,
  shipping_rate: 49,
  free_shipping_threshold: 499,
  handling_days_min: 1,
  handling_days_max: 2,
  transit_days_min: 3,
  transit_days_max: 7,
};
