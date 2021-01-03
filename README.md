# Narwallet-compatible Web App for the [Diversifying Staking Pool](https://github.com/Narwallets/diversifying-staking-pool.git)

## Overview
What this is? and other non-Technical Documentation
[CLICK HERE](https://narwallets.github.io/diversifying-staking-pool/)

### Repositories 

This is the Web App repository. The Smart contract and main documentation is at https://github.com/Narwallets/diversifying-staking-pool.git

## Web App Dev Tooling (v0.1)
* No browser frameworks are used, this is plain typescript and a main index.html

## Dev Flow (v0.1)
* `npm run build` in one terminal to start `tsc -w` (continuous typescript compilation)
* `npm run serve` in another terminal to run a simple web server (`python3 -m http.server`)
* With chrome navigate to: http://localhost:8000/DApp/
* You'll need Narwallets chrome-extension installed https://github.com/Narwallets/narwallets-extension
* Chrome Dev Tools: Map folder to /repos/diversifying-staking-pool
* Use Chrome Dev Tools as a quick-and-dirty IDE with Edit & Continue
* Use VSCode as the main IDE

### TO DO

#### Bounties
There are Bounties!!!! check https://github.com/Narwallets/bounties

#### Web App
 - [x] Wallet API - Chain-agnostic DApp - Connection is started from the wallet
 - [x] Deposit/withdraw
 - [x] Buy Skash/Stake
 - [x] Trip-meter, measure rewards
 - [x] Sell SKASH/immediate unstake
 - [x] NEAR/SKASH Liquidity Pool, Add/Remove liquidity
 - [x] Classic unstake-wait-finish-unstake
 - [ ] Complete redesign of the UI. models: https://mith.cash | https://yam.finance/
 - [ ] Trip-meter reset



