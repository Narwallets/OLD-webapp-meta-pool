# Narwallet-compatible Web App for the [Meta Pool](https://github.com/Narwallets/meta-pool.git)

## Overview
What is the META-POOL and other non-Technical Documentation
[CLICK HERE](https://narwallets.github.io/meta-pool/)

### Repositories 

This is the Web App repository. The rust Smart contract and main documentation is at https://github.com/Narwallets/meta-pool.git

## Web App Dev Tooling (v0.1)
* No browser frameworks are used, this is plain typescript and a main index.html

## Dev Flow (v0.1)
* `npm run build` in one terminal to start `tsc -w` (continuous typescript compilation)
* `npm run serve` in another terminal to run a simple web server (`python3 -m http.server`)
* With chrome navigate to: http://localhost:8000/DApp/
* You'll need Narwallets chrome-extension installed https://github.com/Narwallets/narwallets-extension
* Chrome Dev Tools: Map folder to `/repos/meta-pool` where the source is
* Use Chrome Dev Tools as a quick-and-dirty IDE with Edit & Continue
* Use VSCode as the main IDE

### TO DO

#### Beta test & rewards
There are rewards!!!! check https://github.com/Narwallets/beta-testing

#### Web App
 - [x] Wallet API - Chain-agnostic DApp - Connection is started from the wallet
 - [x] Deposit/withdraw
 - [x] Buy stNEAR/Stake
 - [x] Trip-meter, measure rewards
 - [x] Sell stNEAR/immediate unstake
 - [x] NEAR/stNEAR Liquidity Pool, Add/Remove liquidity
 - [x] Classic unstake-wait-finish-unstake
 - [ ] Complete redesign of the UI. models: https://mith.cash | https://yam.finance/
 - [ ] Trip-meter reset
