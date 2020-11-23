# NEAR DApp for the [Diversifying Staking Pool](https://github.com/Narwallets/diversifying-staking-pool.git)

## Objectives
* Allows users to reduce risk of missing rewards (by automating not putting all your eggs in one basket)
* Distributes funds to keep a healthy descentralized validator community
* Automated Market for SKASH token. 1 SKASH = 1 Staked NEAR
* Allows users to unstake immediately at a discount price (Sell SKASH instead of unstaking)
* Allows users to stake at a discount price (Buy SKASH instead of staking)

## Road Map to v0.2

* TBD

## Future versions

* TBD

## Dev Tooling (v0.1)
* This project uses ES2020 modules import/export
* No frameworks are used, this is plain typescript ES2020 modules and a single index.html

## Dev Flow (v0.1)
* `npm run build` in one terminal to start `tsc -w` (continuous typescript compilation)
* `npm run serve` to run a simple web server `python3 -m http.server`
* With chrome navigate to: http://localhost:8000/DApp/
* Chrome Dev Tools: Map folder to /repos/diversifying-staking-pool
* Use VSCode as the main IDE - Ctrl-Shift-B to build with typescript
* Use Chrome Dev Tools as an quick-and-dirty IDE with Edit & Continue

## Low-level Technical debt

* We're using base crypto libs as a bundle (The ideal solution would be to have typescript versions of each lib and compile to ES2020 modules) 

We need to reduce the bundle's size. Bundle is at https://github.com/Narwallets/bundled-crypto-libs.git

Bundle includes:

* globalThis.Buffer = SafeBuffer.Buffer
* globalThis.BN = BN
* globalThis.bip39 = bip39
* globalThis.pbkdf2 = pbkdf2
* globalThis.createHmacPackage = {createHmac:createHmac} 

