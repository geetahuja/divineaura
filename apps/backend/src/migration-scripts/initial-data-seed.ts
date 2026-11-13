import { MedusaContainer } from "@medusajs/framework";
import { DEFAULT_REGION_STORE_POLICIES } from "../lib/region-store-policies";
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductOptionsWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createStoresWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows";

// India-only store. Prices are in whole rupees and include GST.
const CURRENCY = "inr";
const COUNTRY = "in";
// Default GST until per-product rates arrive with product specs (milestone 3).
const DEFAULT_GST_RATE = 3;

export default async function initial_data_seed({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(
    ModuleRegistrationName.FULFILLMENT
  );
  const policies = DEFAULT_REGION_STORE_POLICIES;

  logger.info("Seeding store data...");
  const {
    result: [defaultSalesChannel],
  } = await createSalesChannelsWorkflow(container).run({
    input: {
      salesChannelsData: [{ name: "Anant Sanatan Web", description: "divinesanatani.com storefront" }],
    },
  });

  const {
    result: [publishableApiKey],
  } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [{ title: "Storefront", type: "publishable", created_by: "" }],
    },
  });

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: { id: publishableApiKey.id, add: [defaultSalesChannel.id] },
  });

  await createStoresWorkflow(container).run({
    input: {
      stores: [
        {
          name: "Anant Sanatan",
          supported_currencies: [{ currency_code: CURRENCY, is_default: true, is_tax_inclusive: true }],
          default_sales_channel_id: defaultSalesChannel.id,
        },
      ],
    },
  });

  logger.info("Seeding region data...");
  const {
    result: [region],
  } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "India",
          currency_code: CURRENCY,
          countries: [COUNTRY],
          is_tax_inclusive: true,
          payment_providers: ["pp_system_default"],
          metadata: policies,
        },
      ],
    },
  });

  await createTaxRegionsWorkflow(container).run({
    input: [
      {
        country_code: COUNTRY,
        provider_id: "tp_system",
        default_tax_rate: { rate: DEFAULT_GST_RATE, code: "GST", name: "GST" },
      },
    ],
  });

  logger.info("Seeding stock location data...");
  const {
    result: [stockLocation],
  } = await createStockLocationsWorkflow(container).run({
    input: {
      locations: [
        {
          name: "Anant Sanatan Warehouse",
          address: { city: "", country_code: "IN", address_1: "" },
        },
      ],
    },
  });

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
  });

  logger.info("Seeding fulfillment data...");
  // Created by a migration script in core.
  const {
    data: [shippingProfile],
  } = await query.graph({ entity: "shipping_profile", fields: ["id"] });

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "India delivery",
    type: "shipping",
    service_zones: [{ name: "India", geo_zones: [{ country_code: COUNTRY, type: "country" }] }],
  });

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
  });

  // Flat fee, free from the threshold up. Real rates come from Shiprocket (milestone 8).
  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standard",
          description: `Delivered in ${policies.transit_days_min}-${policies.transit_days_max} days.`,
          code: "standard",
        },
        prices: [
          { currency_code: CURRENCY, amount: policies.shipping_rate },
          {
            currency_code: CURRENCY,
            amount: 0,
            rules: [{ attribute: "item_total", operator: "gte", value: policies.free_shipping_threshold }],
          },
          { region_id: region.id, amount: policies.shipping_rate },
          {
            region_id: region.id,
            amount: 0,
            rules: [{ attribute: "item_total", operator: "gte", value: policies.free_shipping_threshold }],
          },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
    ],
  });

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: { id: stockLocation.id, add: [defaultSalesChannel.id] },
  });

  // Catalogue defaults (categories, tags, samples…) come from seed-catalogue-defaults.ts.
  logger.info("Finished seeding India store.");
}
