import { isEmpty } from "./isEmpty"

type ConvertToLocaleParams = {
  amount: number
  currency_code: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  locale?: string
}

// ₹1,299 for whole rupees, ₹14.53 when there are paise (e.g. tax lines).
export const convertToLocale = ({
  amount,
  currency_code,
  minimumFractionDigits = 0,
  maximumFractionDigits = Number.isInteger(amount) ? 0 : 2,
  locale = "en-IN",
}: ConvertToLocaleParams) => {
  return currency_code && !isEmpty(currency_code)
    ? new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency_code,
        minimumFractionDigits,
        maximumFractionDigits,
      }).format(amount)
    : amount.toString()
}
