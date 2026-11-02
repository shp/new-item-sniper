# New Item Sniper for Roblox
## run
This was made using Node and NPM so it is recommended to use that to run and package manage.
> npm start\n
> node index.js

## dependencies
The only one not preinstalled is otpauth
> npm i otpauth

## config
{\n\t"ROBLOSECURITY": string,\n\t"AUTH_KEY": string,\n\t"SCAN_INTERVAL: number\n}

### ROLBOSECURITY
> Type: string\n
> Description: Put your .ROBLOSECURITY cookie from roblox as the value\n

### AUTH_KEY
> Type: string\n
> Description: You need to setup 2FA so you get a code from an auth app, then put the key there, it should be like a 26 letter alphanumeric string\n

### SCAN_INTERVAL
> Type: number\n
> Default: 5000\n
> Description: How long between scans in milliseconds, don't put too low then you will get ratelimited\n

## misc
1. i cant confirm if it does or doesn't work as most of it is expected behavior instead of actually tested
2. this was just something quickly put together, there is no proxy support and you can change code around if you want to add/change features
3. if you use any code from this i would like some form of credit (to my github)