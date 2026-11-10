import { Module } from "@medusajs/framework/utils"
import HeroBannersModuleService from "./service"

export const HERO_BANNERS_MODULE = "hero_banners"

export default Module(HERO_BANNERS_MODULE, {
  service: HeroBannersModuleService,
})
