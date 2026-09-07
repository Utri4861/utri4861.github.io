# Static-site maintenance

The site remains plain HTML, CSS, and JavaScript on its existing GitHub Pages setup. No framework, analytics service, or new hosting account was added.

## Checks

Run `python scripts/prepare.py --check`, `node --check assets/js/site.js`, `node --check go/assets/go.js`, and `node --test scripts/site.test.cjs` before publishing. The GitHub workflow runs these on pushes and pull requests; it does not change the existing deployment configuration.

The checks cover local links and fragments, image assets/dimensions, repeated navigation, required interaction hooks, menu state, filtering, motion preferences, and drawing controls. They do not substitute for real-device or screen-reader testing.

## Shared markup

Edit `NAV` and `FOOTER` in `scripts/prepare.py`, then run `python scripts/prepare.py --sync`. This updates checked-in HTML, so navigation remains functional without JavaScript or a build step at hosting time. Citadel and the directory retain separate brand layouts. Portfolio cards receive explicit accessible names from their headings.

## Images

Run `python scripts/prepare.py --images` with Pillow installed after changing source images. The script keeps every original, generates WebP sizes in adjacent `web` folders, and adds `srcset`, dimensions, and loading priorities. `data-original` identifies the source and `data-fullsize` preserves the drawing viewer's original-resolution target. Commit the derivatives with the HTML. The QR SVG is unrelated and is not processed.

Do not treat the reduction in total image bytes as a measured page-speed score. Check actual pages on a phone and a slower connection after deployment.

## Content still requiring the owner's input

- Dedicated finished-product photos: complete object, scale, details, illuminated/unilluminated states.
- Verified product dimensions, materials, batteries, mounting, included parts, and lead times. Etsy remains authoritative meanwhile.
- Confirm each product photograph depicts the exact item currently sold.
- Gameplay screenshot/video for Bastion; the existing revolver YouTube animation is preserved.
- Specific build dates, lessons, measurements, original-versus-adapted contributions, and complete source credits where not already documented.
- Definitive finished Helldivers photograph; additional Leatherwork/half-chaps content when ready.
- A new workshop journal entry written or approved by Erik; old post dates are preserved.
- Genuine customer feedback and permission to reuse it.
- Whether to add analytics; no tracking or consent service was introduced.

Keep `/go/` permanent for printed QR codes. Review changes locally before publishing publicly. The pre-existing untracked QR asset should be handled separately from this improvement pass.
