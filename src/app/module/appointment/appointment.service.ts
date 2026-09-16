import config from "../../config"
import { getBkashIdToken } from "../../lib/bkash"

const bookAppoinmentService = async () =>{

// business logic here
   const BkashIdToken = await getBkashIdToken();   

   if(!BkashIdToken){
     throw new Error("No Bkash Access Token found")
   }

    const BkashCreatePaymentResponse = await fetch(`${config.BKASH_BASE_URL}/tokenized/checkout/create`,{
         method:"POST",
         headers:{
            "Content-Type": "application/json",
            Accept: "application/json",
            authorization:BkashIdToken,
            "x-app-key": config.BKASH_APP_KEY,
            },
        body : JSON.stringify({
            agreementID:"TokenizedMerchant01L3IKB6H1565072174986",
            mode: "0011",
            payerReference: "01770618575",
            callbackURL: `${config.BKASH_CALLBACK_URL}/appointment/book-appointment/payment/callback`,
            merchantAssociationInfo: "MI05MID54RF09123456One",
            amount: "12",
            currency: "BDT",
            intent: "sale",
            merchantInvoiceNumber: "Inv0124"
        })
    })

    const BkashCreatePaymentResult = await BkashCreatePaymentResponse.json()

    if (!BkashCreatePaymentResponse.ok) {
    throw new Error( BkashCreatePaymentResult.statusMessage || "bKash payment creation failed");
   }
    return BkashCreatePaymentResult;

}

const bookAppoinmentCallbackService = async () => {

}

export const AppoinmentServices = {
    bookAppoinmentService,
    bookAppoinmentCallbackService
}