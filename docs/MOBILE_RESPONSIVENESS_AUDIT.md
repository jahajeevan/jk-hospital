# Mobile Responsiveness Audit

Date: 2026-06-04
Scope: frontend route inventory, standalone HTML pages, JSX layout review, responsive CSS review, and production build verification.

## Page Inventory

React routes are declared in `frontend/src/App.jsx`:

- `/` - Home
- `/login` - patient sign in
- `/signup` - patient sign up
- `/admin/login` - admin sign in
- `/services` - services
- `/ai` - smart AI assistant
- `/doctors` - doctors directory
- `/contact` - contact/reception
- `/complete-profile` - protected profile completion
- `/book` - protected appointment booking
- `/payment` - protected payment checkout
- `/payment-success` - protected payment success
- `/appointments` - protected patient dashboard alias
- `/dashboard` - protected patient dashboard
- `/profile/*` - protected Clerk profile settings
- `/admin` - protected admin dashboard

Standalone HTML files also present:

- `frontend/forms.html` - student registration form stub
- `frontend/end.html` - student management stub

## Overall Assessment

The public marketing and patient booking surfaces are mostly mobile-aware. The codebase uses `container-pad`, responsive Tailwind grids, mobile nav, and CSS media queries for the hero, booking summary, profile completion, and AI console.

The main mobile risk is concentrated in dense operational workflows: admin dashboard tables, doctor/slot management, modal forms, long emails/transaction IDs, and third-party Clerk profile/account UI. These areas are usable in principle but need stronger small-screen rules to avoid horizontal scrolling, cramped buttons, and text overflow.

Build status: `npm run build` in `frontend/` passes.

## Global Findings

### High Priority

1. Admin booking table relies on horizontal scroll.
   `AdminDashboard.jsx` uses `overflow-x-auto` and a `min-w-[680px]` table. This prevents layout breakage, but it creates a poor phone workflow for reception tasks. Convert bookings to stacked cards below `md`, or provide a mobile-specific compact row layout.

2. Admin doctor slot editor is too dense for phones.
   Slot controls collapse from 7 columns to 1 column only below `sm`, but the card still contains many date/time/number fields and inline action buttons. Add section grouping, sticky save state, full-width mobile actions, and shorter helper text.

3. Shared modal has no vertical overflow handling.
   `Modal.jsx` centers `max-w-lg` content but does not cap height or allow internal scrolling. Long slot forms can exceed small viewport height. Add `max-h-[calc(100dvh-2rem)] overflow-y-auto` to the modal panel and make the footer sticky or visible.

4. Long unbroken values can overflow.
   Emails, transaction IDs, image URLs, appointment IDs, and generated AI text appear in patient/admin cards without consistent `break-words`, `overflow-wrap:anywhere`, or truncation. This affects dashboard, admin refunds, payment success, profile, and saved AI records.

### Medium Priority

5. Hero typography is mostly responsive but still aggressive.
   Home and cinematic pages use mobile clamps, but services/contact pass `text-5xl` hero titles through the hero component. CSS later forces `.cinematic-hero h1` to a mobile clamp, which works, but the source markup is not self-documenting. Prefer explicit `text-3xl sm:text-5xl` in page JSX.

6. Several mobile action groups remain merely wrapped, not optimized.
   Wrapped buttons can produce uneven rows and variable tap target alignment in dashboards and admin controls. Mobile actions should become full-width stacked controls where workflows are task-oriented.

7. Chart panels may be cramped on phones.
   Recharts are inside fixed-height `h-72` and `h-64` containers. They will render, but axis labels and tooltips may be hard to read. Add mobile-specific smaller margins, fewer ticks, or summary-first cards.

8. Auth/Profile depend on Clerk internals.
   Auth styling constrains many Clerk elements, but Clerk profile settings are embedded with minimal mobile-specific overrides. Test actual Clerk screens at 320, 375, and 414 px.

### Low Priority

9. Standalone HTML files are not product-aligned and only minimally styled.
   `forms.html` and `end.html` include viewport meta tags but have no responsive layout system. If they are unused exercises, remove or archive them. If they are needed, rebuild them to match the React app.

10. Some mobile sections are visually heavy.
   Glass effects, shadows, and animated backgrounds are extensive. This is not a layout bug, but on low-end phones it can affect scroll smoothness. Consider reduced effects under mobile or `prefers-reduced-motion`.

## Page-by-Page Audit

### `/` Home

Status: Good.

Strengths:
- Hero actions stack full-width below `md`.
- Stats become a 3-column mobile grid.
- Trust strip becomes single-column on mobile.
- Main content grids collapse cleanly.

Risks:
- Gallery marquee is animated and image-heavy.
- CTA buttons wrap, but could become full-width below `sm` for consistency.

Recommended fixes:
- Add reduced-motion behavior for marquee.
- Make CTA links full-width below `sm`.

### `/login`, `/signup`, `/admin/login`

Status: Good with third-party risk.

Strengths:
- Visual panel hides on smaller screens.
- Auth form has a constrained max width and mobile padding.
- Clerk elements receive custom sizing.

Risks:
- Clerk may add nested rows, badges, or legal/footer elements that do not honor current overrides.
- OTP fields and identity preview need real-device checks.

Recommended fixes:
- Test Clerk sign-in, sign-up, OTP, password reset, and admin-denied states at 320 px.
- Add overflow wrapping for identity/email preview text.

### `/services`

Status: Good.

Strengths:
- Service cards collapse from `md:grid-cols-3` to single column.
- Cinematic hero has mobile CSS override.

Risks:
- Negative top margin cards can crowd the hero on very small screens.

Recommended fixes:
- Reduce `-mt-12` to `-mt-6` below `sm`, or add more hero bottom padding.

### `/contact`

Status: Good with minor spacing risk.

Strengths:
- Two-column contact/image section collapses to one column.
- Contact image has fixed minimum height.

Risks:
- `min-h-[420px]` image is tall on small phones.
- Long contact rows could wrap awkwardly.

Recommended fixes:
- Use `min-h-[260px] sm:min-h-[420px]`.
- Add `break-words` to contact text rows.

### `/ai`

Status: Good.

Strengths:
- AI hero and shell collapse below `lg`.
- Tool rail changes to two columns below `lg`, then one column below `sm`.
- Composer stacks on small screens.
- Status/radar panel hides below `sm`.

Risks:
- Long AI responses can overflow if markdown contains long URLs or code.
- Chat stage height/scroll behavior should be visually tested on short phones.

Recommended fixes:
- Ensure `.ai-message-bubble` and markdown output use `overflow-wrap:anywhere`.
- Add mobile max-height based on `100dvh` so composer remains reachable.

### `/doctors`

Status: Good.

Strengths:
- Hero content and stats wrap.
- Filter layout stacks before large screens.
- Doctor cards collapse from 3 to 2 to 1 column.

Risks:
- Specialty filter pills can create many rows if many specialties exist.

Recommended fixes:
- Convert specialty filters to a horizontally scrollable segmented control below `sm`, or use a select when count is high.

### `/complete-profile`

Status: Good.

Strengths:
- Profile card has max width.
- Benefits and form grid become one column below `md`.

Risks:
- Benefit chips can be dense at 320 px.

Recommended fixes:
- Keep current collapse, but shorten chip labels or allow wrapping with `min-w-0`.

### `/book`

Status: Good with content-density risks.

Strengths:
- Booking hero stacks below `md`.
- Summary sidebar becomes static below `md`.
- Doctor and patient form grids collapse to one column.
- Stepper is single-column below `sm`.

Risks:
- Slot cards contain long availability text that can overflow or become noisy.
- Review rows use horizontal label/value layout and can squeeze long names.
- AI strip button/input should become full-width on narrow phones.

Recommended fixes:
- Add `break-words` to slot metadata and review values.
- Make review rows stack below `sm`.
- Make AI strip action button full-width below `sm`.

### `/payment`

Status: Mostly good.

Strengths:
- Checkout grid collapses from two columns to one.
- Gateway selector and payment mode grids collapse to one column below `sm`.

Risks:
- Amount and checkout CTA use large type/long labels.
- Booking summary may overflow on long patient/doctor names.

Recommended fixes:
- Add responsive heading/amount sizes.
- Add `break-words` to summary values and checkout error messages.

### `/payment-success`

Status: Mostly good.

Strengths:
- Main confirmation card is centered and constrained.
- Detail grid collapses from two columns to one.
- Actions stack below `sm`.

Risks:
- Token number, invoice number, and transaction ID can overflow.
- Token card `text-5xl` can be too large if token format grows.

Recommended fixes:
- Add `break-all` or `overflow-wrap:anywhere` to transaction/invoice fields.
- Use `text-4xl sm:text-5xl` for token number.

### `/dashboard` and `/appointments`

Status: Good with long-content risk.

Strengths:
- Metrics collapse from 4 columns to 1 column.
- Appointments are cards, not tables.
- Records/refunds grids collapse.

Risks:
- Active token card uses large token text and horizontal action group.
- User name/email and AI summary content can overflow.
- Refund cards use `justify-between`; long reason text can squeeze status badges.

Recommended fixes:
- Stack token card actions below `sm`.
- Add `min-w-0` and `break-words` to user identity, appointment metadata, refund reasons, and AI output.
- Use full-width action buttons on appointment cards below `sm`.

### `/profile/*`

Status: Needs visual verification.

Strengths:
- Outer shell and panel are responsive.

Risks:
- Clerk `UserProfile` has its own internal navigation and page layouts.
- No explicit mobile overrides for Clerk profile navbar/content.

Recommended fixes:
- Test account, security, connected accounts, and sessions pages at 320 px.
- Add CSS overrides for Clerk profile sidebar/navbar if it causes horizontal scroll.

### `/admin`

Status: Highest mobile risk.

Strengths:
- Admin unlock form is constrained.
- Metrics collapse from 4 columns to 1.
- Bookings table is protected by horizontal scroll.
- Doctor forms and slot forms use responsive grids.

Risks:
- Bookings table is not phone-friendly for frequent operations.
- Doctor/slot management has many fields and inline controls.
- Slot helper text and active/hidden button share a single horizontal row.
- Modal forms can exceed viewport height.
- Chart labels and tooltips may be cramped.
- Refund cards can overflow with long emails/reasons.

Recommended fixes:
- Replace booking table with mobile cards below `md`.
- Turn doctor slot rows into accordion sections on mobile.
- Stack slot footer text and active toggle below `sm`.
- Add modal max-height and scroll.
- Add `break-words` to emails, URLs, transaction IDs, and reasons.
- Simplify chart presentation on phones with summary cards first.

### `frontend/forms.html`

Status: Minimal, not production responsive.

Risks:
- No layout container, spacing system, labels, or touch-friendly controls.
- Appears unrelated to JK Hospital app.

Recommended fixes:
- Remove if unused.
- If needed, rebuild with a responsive form layout and app branding.

### `frontend/end.html`

Status: Minimal, not production responsive.

Risks:
- Empty links, no layout container, no accessible navigation.
- Appears unrelated to JK Hospital app.

Recommended fixes:
- Remove if unused.
- If needed, rebuild as a responsive navigation page with real links.

## Recommended Fix Order

1. Admin mobile cards for bookings and refund rows.
2. Modal height/scroll behavior.
3. Break-word utilities for long dynamic values across admin, payment success, dashboard, and AI output.
4. Mobile stacking for booking review rows, token card actions, and appointment action buttons.
5. Clerk profile/auth visual QA and targeted overrides.
6. Chart mobile simplification.
7. Remove or rebuild standalone HTML stubs.

## Verification Checklist

Run these after fixes:

- `npm run build`
- Manual mobile widths: 320, 375, 390, 414, 768 px
- Routes: `/`, `/services`, `/contact`, `/doctors`, `/ai`, `/book`, `/payment`, `/payment-success`, `/dashboard`, `/profile`, `/admin`
- States: empty appointments, active token, many doctors, many slots, long email, long transaction ID, long AI response, modal open, admin table populated
- Confirm no horizontal body scroll except intentional internal scroll areas

