import Medusa from "@medusajs/js-sdk"

// The admin is served by the backend itself, so "/" reaches the API.
export const sdk = new Medusa({
  baseUrl: import.meta.env.VITE_BACKEND_URL || "/",
  debug: import.meta.env.DEV,
  auth: { type: "session" },
})

export const uploadFile = async (file: File) => {
  const { files } = await sdk.admin.upload.create({ files: [file] })
  return files[0].url
}
