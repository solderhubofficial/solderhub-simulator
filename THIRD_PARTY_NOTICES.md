# Third-party notices

This inventory covers third-party materials newly introduced by this branch. Re-audit all assets and dependency notices before release.

## Velxio board SVG artwork

- Project: [Velxio — Arduino & Embedded Board Emulator](https://github.com/davidmonterocrespo24/velxio)
- Upstream author/copyright: David Montero Crespo, 2025 (repository-level notice).
- Upstream repository license: GNU Affero General Public License v3 (AGPL-3.0); the upstream project also advertises a separate commercial license for proprietary/closed-source integrations.
- Upstream asset directory: [frontend/public/boards](https://github.com/davidmonterocrespo24/velxio/tree/master/frontend/public/boards)
- Local copies: `public/third-party/velxio/`
- Files copied in this branch: `arduino-uno.svg`, `arduino-mega.svg`, `arduino-nano.svg`, `esp32-devkit-v1.svg`, `esp32-c3.svg`, `stm32-bluepill.svg`, `stm32-blackpill.svg`, and `pi-pico.svg`.
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
