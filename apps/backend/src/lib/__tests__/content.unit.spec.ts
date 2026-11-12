import { fillPlaceholders, markdownToHtml } from "../markdown"

describe("content markdown", () => {
  it("escapes HTML so admin text can't inject scripts", () => {
    const html = markdownToHtml('Hello <script>alert(1)</script> & "you"')
    expect(html).toBe("<p>Hello &lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;you&quot;</p>")
  })
  it("renders headings (never H1), lists, bold, italic, notes and rules", () => {
    expect(markdownToHtml("# Title\n## Section\n### Sub")).toBe("<h2>Title</h2>\n<h2>Section</h2>\n<h3>Sub</h3>")
    expect(markdownToHtml("- one\n- **two**\n\n1. a\n2. *b*")).toBe("<ul><li>one</li><li><strong>two</strong></li></ul>\n<ol><li>a</li><li><em>b</em></li></ol>")
    expect(markdownToHtml("> DRAFT – owner to review\n\n---")).toBe('<aside class="note">DRAFT – owner to review</aside>\n<hr>')
  })
  it("allows only safe links", () => {
    expect(markdownToHtml("[Shipping](/policies/shipping)")).toBe('<p><a href="/policies/shipping">Shipping</a></p>')
    expect(markdownToHtml("[Mail](mailto:support@divinesanatani.com)")).toContain('href="mailto:support@divinesanatani.com"')
    expect(markdownToHtml("[Site](https://example.com)")).toContain('rel="noopener" target="_blank"')
    expect(markdownToHtml("[x](javascript:alert%281%29)")).toBe("<p>x</p>")
    expect(markdownToHtml("[x](//evil.com)")).toBe("<p>x</p>")
  })
  it("joins wrapped lines into one paragraph", () => {
    expect(markdownToHtml("line one\nline two\n\nnext")).toBe("<p>line one line two</p>\n<p>next</p>")
  })
})

describe("email safety", () => {
  it("escapes customer-provided values in email HTML but keeps template markup", () => {
    const { renderEmail } = require("../../modules/messaging/email-layout")
    const e = renderEmail(
      { subject: "Contact: {name}", heading: "From {name}", lines: ["<strong>Message:</strong> {message}"] },
      { name: "Eve\nBcc: x@y.z", message: '<img src=x onerror="alert(1)"> & hi' },
      "https://divinesanatani.com"
    )
    expect(e.html).toContain("<strong>Message:</strong> &lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; hi")
    expect(e.html).not.toContain("<img src=x")
    expect(e.subject).toBe("Contact: Eve Bcc: x@y.z")
    expect(e.text).toContain('<img src=x onerror="alert(1)"> & hi'.replace(/<[^>]+>/g, ""))
  })
})

describe("placeholders", () => {
  it("fills live values and leaves unknown names visible", () => {
    expect(fillPlaceholders("COD fee {{cod_fee}}, free above {{ free_shipping_threshold }}, {{oops}}", { cod_fee: "₹49", free_shipping_threshold: "₹499" })).toBe(
      "COD fee ₹49, free above ₹499, {{oops}}"
    )
  })
})
