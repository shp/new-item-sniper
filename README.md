# New Item Sniper for Roblox

## install
> git clone https://github.com/shp/new-item-sniper

## run
This was made using Node and NPM so it is recommended to use that to run and package manage. You can use either of the ways below to start if you just git clone this.
- npm start
- node index.js

## dependencies
The only one not preinstalled with Node is otpauth
> npm i otpauth

## config
```json
{
    "ROBLOSECURITY": string,
    "AUTH_KEY": string,
    "SCAN_INTERVAL": number
}
```

### ROBLOSECURITY
- Type: string
- Description: Put your .ROBLOSECURITY cookie from roblox as the value

### AUTH_KEY
- Type: string
- Description: You need to setup 2FA so you get a code from an auth app, then put the key there, it should be like a 26 letter alphanumeric string

### SCAN_INTERVAL
- Type: number
- Default: 5000
- Description: How long between scans in milliseconds, don't put too low then you will get ratelimited

### BUY_COLLECTIBLES
- Type: boolean
- Default: false
- Description: Collectibles are the limitedv2 items that are offsale + not tradable but are shown as limited. I made this an option because of the recent Dowager of the Federation changing item restrictions to become LimitedUnique and therefore it becomes sellable. If this is enabled you could buy something and it doesn't end up going fully limited so beware.

## misc
- i cant confirm if it does or doesn't work as most of it is expected behavior instead of actually tested
- this was just something quickly put together, there is no proxy support and you can change code around if you want to add/change features
- if you use any code from this i would like some form of credit (to my github)