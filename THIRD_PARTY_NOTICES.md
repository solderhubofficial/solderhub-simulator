# Third-party notices

This inventory covers third-party materials newly introduced by this branch. Re-audit all assets and dependency notices before release.

## Velxio board SVG artwork

- Project: [Velxio — Arduino & Embedded Board Emulator](https://github.com/davidmonterocrespo24/velxio)
- Upstream author/copyright: David Montero Crespo, 2025 (repository-level notice).
- Upstream repository license: GNU Affero General Public License v3 (AGPL-3.0); the upstream project also advertises a separate commercial license for proprietary/closed-source integrations.
- Upstream asset directory: [frontend/public/boards](https://github.com/davidmonterocrespo24/velxio/tree/master/frontend/public/boards)
- Local copies: `public/third-party/velxio/`
- Files copied earlier: `arduino-uno.svg`, `arduino-mega.svg`, `arduino-nano.svg`, `esp32-devkit-v1.svg`, `esp32-c3.svg`, `stm32-bluepill.svg`, `stm32-blackpill.svg`, and `pi-pico.svg`.
- Additional artwork copied on 2026-10-13 from upstream commit `a5ab392d45757f35d44fd6fc06aee5a501129e84`: `frontend/public/component-svgs/servo.svg` → `public/third-party/velxio/sg90.svg`; `frontend/public/component-svgs/hc-sr04.svg` → `public/third-party/velxio/hc-sr04.svg`; and `frontend/src/assets/raspberry-pi-5-board.png` → `public/third-party/velxio/raspberry-pi-5-board.png`.
- These three files were copied byte-for-byte. SolderHub's component definitions and hit areas remain separate integration code; the Raspberry Pi 5 GPIO names and source-pixel coordinates follow Velxio's `RaspberryPi5Element.ts`.
- The upstream repository's AGPL-3.0 license text is preserved at `public/third-party/velxio/LICENSE-AGPL-3.0-VELXIO`. The upstream project also advertises a separate commercial license for proprietary/closed-source integrations; SolderHub's current AGPL license is retained.
- **Asset-specific rights caveat:** no individual license was found adjacent to these component assets. Velxio's source comments describe the Pi 5 PNG as a processed product-board photo; the repository-level AGPL notice alone does not conclusively establish rights in that embedded photo. Verify the photo's origin/permission before relying on it in a public or proprietary release.
- Attribution: “Board artwork from Velxio by David Montero Crespo; reused under the upstream repository's AGPL-3.0 license.” Link to the upstream project and license in product documentation and source distributions.
- License text: see [LICENSE-AGPL-3.0-VELXIO](./public/third-party/velxio/LICENSE-AGPL-3.0-VELXIO).
- Important limitation: the upstream repository's root license is not proof that every board drawing is exclusively owned by the repository author. The SVGs should be reviewed for embedded source/attribution comments and asset-specific licenses before public release. This notice is not legal advice or a substitute for obtaining permission where required.

### License implications

SolderHub Simulator is already licensed under AGPL-3.0-or-later. Keeping the combined simulator open under a compatible AGPL license generally avoids the need to change its main license merely to use AGPL-covered material, subject to checking each asset's actual rights and meeting the license conditions. If SolderHub later intends to keep a derivative/integrated version closed-source or distribute it under a proprietary license, contact the upstream copyright holder about a written commercial license first. Do not assume the commercial license for Velxio software automatically covers third-party artwork embedded in it.

## Original SolderHub license notice

The project was previously distributed under the MIT License. Its original notice is preserved in [LICENSE-MIT-ORIGINAL](./LICENSE-MIT-ORIGINAL) to satisfy notice-retention requirements for pre-existing MIT-licensed portions. This migration does not purport to withdraw rights already granted under earlier releases.

## Existing dependencies and assets

The project already uses third-party packages and component artwork. Their licenses remain governed by their own license files and notices; the repository's AGPL license does not erase those obligations. Audit exact installed versions in package-lock.json, package licenses, font licenses, and all SVG/board/component assets before release.

## Attribution policy

For every newly introduced third-party item, record its name, upstream URL, exact version or commit, license, copyright notice, local path(s), and any required attribution/share-alike conditions. Keep source notices alongside copied files where practical.


## NodeMCU ESP8266 board artwork (MIT)

- Original artwork: `NodeMCUBreadboard.svg` from [squix78/esp8266-fritzing-parts](https://github.com/squix78/esp8266-fritzing-parts).
- License: MIT; copyright notice identifies 2015. The MIT license text is preserved at [LICENSE-MIT-squix78.txt](./public/third-party/solderhub/LICENSE-MIT-squix78.txt).
- Local file: `public/third-party/solderhub/nodemcu-esp8266.svg`.
- The copied packaging's third-party pin-anchor group has been removed; SolderHub's own pin coordinates are calibrated to the source SVG's 72×141 viewBox. Board art remains attributed to squix78.
- Reference packaging inspected: [HelpmeSolder NodeMCU SVG](https://github.com/vincentperezzz/helpmeSolder/blob/3cdaf2443ba10051c9465aa15cee35bbaa690d24/public/assets/boards/esp8266-nodemcu.svg). SolderHub does not retain its custom pin-anchor group.
