import fs from "fs";
import * as OTPAUTH from "otpauth";
import { randomUUID } from "node:crypto";

async function sleep(t) {
    await new Promise(resolve => setTimeout(resolve, t));
}

const configFormat = `{\n\t"ROBLOSECURITY": "INSERT ROBLOSECURITY HERE",\n\t"AUTH_KEY": "INSERT AUTH KEY/SECRET HERE"\n\t"SCAN_INTERVAL": number\n}`;

(async () => {
    const configText = fs.readFileSync('config.json');
    const config = await JSON.parse(configText);
    const roblosecurity = config.ROBLOSECURITY;
    if (!roblosecurity) throw new Error(`No ROBLOSECURITY passed into config, looking for: ${configFormat}`);

    const authkey = config.AUTH_KEY;
    if (!authkey) throw new Error(`No AUTH_KEY passed into config, looking for: ${configFormat}`);
    const cookies = ".ROBLOSECURITY=" + config.ROBLOSECURITY;
    const scanInterval = config.SCAN_INTERVAL ?? 5000;
    const buyCollectibles = config.BUY_COLLECTIBLES ?? false;

    const defaultHeaders = {
        Cookie: cookies,
        "Content-Type": "application/json"    
    };

    const userInfo = await fetch("https://users.roblox.com/v1/users/authenticated", {headers: defaultHeaders})

    if (!userInfo.ok) throw new Error("Error occurred while fetching userinfo");
    const userId = (await userInfo.json()).id;
    if (!userId) throw new Error("Error occurred while retreiving user id");

    const totp = new OTPAUTH.TOTP({
        secret: OTPAUTH.Secret.fromBase32(authkey),
        digits: 6,
        period: 30
    })
    const MAX_ROBLOX_REQUESTS_PER_MINUTE = 30;
    const RATELIMIT_DELAY_IN_SECONDS = 5;
    let robloxRequests = 0;

    function decodeBase64(base64String) {
        return Buffer.from(base64String, "base64").toString("utf8");
    }

    async function makeHeaders() {
        return {
                Cookie: cookies,
                "Content-Type": "application/json",
                "X-CSRF-TOKEN": await getCSRFToken()
            }
    }

    async function addRobloxReq() {
		async function addr() {
			if (robloxRequests >= MAX_ROBLOX_REQUESTS_PER_MINUTE) return false;
			robloxRequests++;
			setTimeout(() => { robloxRequests-- }, 60000);
			return true;
		}
		while (!(await addr())) {  // over set ratelimit
			await sleep(RATELIMIT_DELAY_IN_SECONDS * 1000);
		}
	}

    async function getCSRFToken() {
		await addRobloxReq();
		const res = await fetch("https://auth.roblox.com/v1/authentication-ticket", {
			method: "POST",
			headers: {
				Cookie: cookies
			}
		});

		return res.headers.get("x-csrf-token");
	}

    async function handleAuth(authMetaData) {
        const data = await JSON.parse(decodeBase64(authMetaData));
        const challengeId = data.challengeId;
        const actionType = data.actionType;

        await addRobloxReq();
        const res = await fetch(`https://twostepverification.roblox.com/v1/users/${userId}/challenges/authenticator/verify`, {
            method: "POST",
            headers: await makeHeaders(),
            body: JSON.stringify({
                challengeId: challengeId,
                actionType: actionType,
                code: totp.generate()
            })
        })
        if (!res.ok) throw new Error("handleAuth: Unknown error 1");
        const verificationToken = (await res.json()).verificationToken;

        const sharedParameters = data.sharedParameters;
        const genericChallengeId = sharedParameters.genericChallengeId;

        await addRobloxReq();
        const res2 = await fetch(`https://apis.roblox.com/challenge/v1/continue`, {
            method: "POST",
            headers: await makeHeaders(),
            body: JSON.stringify({
                challengeId: genericChallengeId,
                challengeType: "twostepverification",
                challengeMetadata: JSON.stringify({
                    verificationToken: verificationToken,
                    rememberDevice: false,
                    challengeId: challengeId,
                    actionType: actionType
                })
            })
        })
        if (!res2.ok) throw new Error("handleAuth: Unknown error 2");
    }

    function checkItem(data) {
        if ((data.expectedSellerId !== null && data.expectedSellerId != 1) || data.creatorTargetId != 1 || data.creatorType != "User" || data.creatorName != "Roblox" || !data.creatorHasVerifiedBadge) {
            return false; // not roblox selling
        }
        if (data.hasResellers) {
            return false; // is not a new item  
        }
        if (data.isPurchasable !== null && !data.isPurchasable) {
            return false; // cant purchase
        }
        if (data.owned) {
            return false; // already own the item
        }
        let isSellable = false;
        for (const rest of data.itemRestrictions) {
            if (rest == "Limited" || rest == "LimitedUnique" || rest == "Collectible" && buyCollectibles) {
                isSellable = true;
                break;
            }
        }
        return isSellable 
    }

    async function buy(itemId) {
        await addRobloxReq();
        const res = await fetch(`https://catalog.roblox.com/v1/catalog/items/${itemId}/details?itemType=Asset`, {
            headers: defaultHeaders
        });
        if (!res.ok) throw new Error("buy: Unknown error 1");
        const data = await res.json();
        if (!checkItem(data)) throw new Error("buy: Doesn't meet the requirements to purchase item");
        const collectibleItemId = data.collectibleItemId;
        const price = data.price;
        const name = data.name;

        await addRobloxReq();
        const res2 = await fetch(`https://apis.roblox.com/marketplace-items/v1/items/details`, {
            method: "POST",
            headers: await makeHeaders(),
            body: JSON.stringify({itemIds: [collectibleItemId]})
        });
        if (!res2.ok) throw new Error("buy: Unknown error 2");
        const data2 = await res2.json();
        const collectibleProductId = data2.collectibleProductId;

        await addRobloxReq();
        const res3 = await fetch(`https://apis.roblox.com/marketplace-sales/v1/item/${collectibleItemId}/purchase-item`, {
            method: "POST",
            headers: await makeHeaders(),
            body: JSON.stringify({
                collectibleItemId: collectibleItemId,
                expectedCurrency: 1,
                expectedPrice: price,
                expectedPurchaserId: userId,
                expectedPurchaserType: "User",
                rentalOptionDays: null,
                expectedSellerId: 1,
                expectedSellerType: "User",
                idempotencyKey: randomUUID(),
                collectibleProductId: collectibleProductId
            })
        });

        if (!res3.ok) {
            const challengeType = res3.headers.get("rblx-challenge-type");
            if (!challengeType || challengeType != "twostepverification") throw new Error("buy: Unknown error 4");
            const challengeMetadata = res3.headers.get("rblx-challenge-metadata");
            try {
                await handleAuth(challengeMetadata);
            } catch (err) {
                console.error(err);
            }
            await buy(itemId);
        }
        const data3 = await res3.json();
        if (data3.purchased) {
            console.log(`PURCHASED ITEM!!!! ${name} for ${price}`);
        }
    }
    async function scan() {
        try {
            await addRobloxReq();
            const res = await fetch(`https://catalog.roblox.com/v2/search/items/details?taxonomy=tZsUsd2BqGViQrJ9Vs3Wah&creatorName=roblox&salesTypeFilter=1&sortType=3&limit=10`, {
                headers: defaultHeaders
            });
            if (!res.ok) throw new Error("scan: Unknown error 1");
            const data = (await res.json()).data;
            for (const item of data) {
                if (!checkItem(item)) continue;
                console.log(`Found potential item to purchase: ${item.name}`);
                await buy(item.id);
            }
        } catch (err) {
            console.error(err);
        }
    }
    console.log(`Running item sniper on userid=${String(userId)}`);
    await scan();
    setInterval(scan, scanInterval);
})()