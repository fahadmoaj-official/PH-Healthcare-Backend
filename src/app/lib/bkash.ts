import config from "../config"
import {RedisClient} from "../lib/redis"



export const getBkashIdToken = async () => {

    try {

    const idTokenkey = "bkash:idToken"
    const refreshTokenKey = "Bkash:refreshToken"

    let Bkashidtoken = await RedisClient.get(idTokenkey);
    let RefreshIdToken = await RedisClient.get(refreshTokenKey);
    const BkashTokenTTL = await RedisClient.ttl(idTokenkey) // get the Token experion time
    const RefreshIdTokenTTL = await RedisClient.ttl(refreshTokenKey) // get the Refresh Token experion time

// experiton time less then 10 minute and have refresh token then 
    if((BkashTokenTTL <= 600 || !Bkashidtoken) && RefreshIdToken && RefreshIdTokenTTL > 600){

        const RefreshTokenResponse = await fetch(`${config.BKASH_BASE_URL}/tokenized/checkout/token/refresh`,{
                method:"POST",
                headers:{
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    username: config.BKASH_USERNAME,
                    password: config.BKASH_PASSWORD
                },
                body : JSON.stringify({
                    app_key : config.BKASH_APP_KEY,
                    app_secret : config.BKASH_APP_SECRET,
                    refresh_token : RefreshIdToken
                })
        })

        if(!RefreshTokenResponse.ok){
        throw new Error("Bkash refreshToken Grant failed");
        }

          const BkashRefreshTokenResult = await RefreshTokenResponse.json()
        
          Bkashidtoken = BkashRefreshTokenResult.id_token as string;

          await RedisClient.set(idTokenkey,Bkashidtoken) // again set id token in redis

        return Bkashidtoken;
    }


    if(BkashTokenTTL > 600){
        return Bkashidtoken;
    }

    const response = await fetch(`${config.BKASH_BASE_URL}/tokenized/checkout/token/grant`,{
        method:"POST",
        headers:{
            "Content-Type": "application/json",
            Accept: "application/json",
            username: config.BKASH_USERNAME,
            password: config.BKASH_PASSWORD
        },
        body : JSON.stringify({
            app_key : config.BKASH_APP_KEY,
            app_secret : config.BKASH_APP_SECRET
        })
    })

    if(!response.ok){
        throw new Error("Bkash AccessToken Grant failed");
    }
    const result = await response.json()

    // bkash id token set
    await RedisClient.set(idTokenkey,result.id_token,{
        expiration:{
            type: "EX",
            // value: 60*60 // 1 hour
            value:620
        }
    })

    // bkash refreshToken Set
    await RedisClient.set(refreshTokenKey,result.refresh_token,{
        expiration:{
            type : "EX",
            value : 60 * 60 * 24 * 28  // 28 days
        }
    })

    Bkashidtoken = result.id_token;

    return Bkashidtoken;
        
    } catch (error:any) {
        throw new Error(error.message)
    }

   
}