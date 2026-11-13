import { Module } from "@medusajs/framework/utils"
import JournalModuleService from "./service"

export const JOURNAL_MODULE = "journal"

export default Module(JOURNAL_MODULE, {
  service: JournalModuleService,
})
