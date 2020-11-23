# NEAR DApp for the [Diversifying Statking Pool](https://github.com/Narwallets/diversifying-staking-pool.git)

## Objectives
* Allows users to reduce risk of missing rewards
* Distributes funds to keep a healthy descentralized validator community
* Allows users to unstake immediately at a discount price
* AMM fro SKASH token. 1 SKASH = 1 Staked NEAR

## Road Map to v0.2

## Future versions

## Dev Tooling (v0.1)
* This project uses ES2020 modules import/export
* No frameworks are used, this is plain ts/javascript

## Dev Flow (v0.1)
* Chrome Dev Tools: Map folder to /repos/diversifying-staking-pool
* Use VSCode as the main IDE - Ctrl-Shift-B to build with typescript
* `npm run dev` to run a simple web server
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

