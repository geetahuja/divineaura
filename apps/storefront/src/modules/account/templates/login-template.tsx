import OtpLogin from "@modules/account/components/otp-login"

// Customers sign in with a mobile (or email) OTP — ARCHITECTURE.md §11.
const LoginTemplate = ({ next }: { next?: string }) => (
  <div className="flex w-full justify-center px-4 py-10 small:py-16">
    <OtpLogin next={next} />
  </div>
)

export default LoginTemplate
