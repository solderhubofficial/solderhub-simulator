# AGPLv3 compliance notes

This project is licensed under GNU AGPLv3 or later. These notes are an engineering checklist, not legal advice.

## Before deploying a modified version

- Keep the full AGPL license text and copyright/license notices with the source.
- Clearly mark substantial modifications and the date in release notes or a repository notice.
- Offer every user who interacts with the running modified version remotely a clear, no-charge way to obtain the Corresponding Source for that exact deployed version. A source link should be visible in the application and lead to the matching source/revision, not merely the latest default branch.
- Ensure the published source includes the preferred form for making modifications, build/configuration scripts needed to build and run it, and source for covered components. Do not publish only compiled bundles.
- Do not add terms, access restrictions, or closed-source modules that conflict with AGPL rights for a combined covered work.
- Preserve third-party copyright and license notices. Track each package, copied source file, image, SVG, and board/component asset separately.
- Re-check the license obligations whenever adding code from another project or changing the deployment architecture.

## Velxio integration scope

The intended integration source is [Velxio](https://github.com/davidmonterocrespo24/velxio), whose repository declares AGPLv3-or-later for its own code and advertises a separate commercial-license route. This branch establishes SolderHub's AGPL licensing and compliance surface; it does **not** yet copy Velxio source files. Before importing any source or assets, review Velxio's current LICENSE, COMMERCIAL_LICENSE.md, docs/THIRD_PARTY.md, each copied file's notices, and the licenses of transitive dependencies/assets.

## Deployment-specific checks

- Configure the app's License link to point to the exact public source revision currently deployed.
- If backend/server code from Velxio is adopted, include that covered server-side code and its corresponding source in the source offer too.
- Keep source available for each version still offered to users; document release tags or immutable commit links.
- Confirm whether any externally hosted emulators, APIs, build services, or proprietary components are outside the source offer and legally separable. Do not assume a service is exempt simply because it runs in another process or repository.

## Scope and caution

Whether separately written modules form one combined/derivative work is fact-specific. This checklist intentionally takes the conservative route for the planned integrated simulator. Obtain qualified legal advice before commercial distribution or relying on an architectural separation.