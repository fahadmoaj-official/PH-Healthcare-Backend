import config from "../../config";
import { getBkashIdToken } from "../../lib/bkash";

const bookAppoinmentService = async () => {
	// business logic here
	const BkashIdToken = await getBkashIdToken();

	if (!BkashIdToken) {
		throw new Error("No Bkash Access Token found");
	}

	const BkashCreatePaymentResponse = await fetch(
		`${config.BKASH_BASE_URL}/tokenized/checkout/create`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				authorization: BkashIdToken,
				"x-app-key": config.BKASH_APP_KEY,
			},
			body: JSON.stringify({
				agreementID: "TokenizedMerchant01L3IKB6H1565072174986",
				mode: "0011",
				payerReference: "01770618575",
				callbackURL: `${config.BKASH_CALLBACK_URL}/appointment/book-appointment/payment/callback`,
				merchantAssociationInfo: "MI05MID54RF09123456One",
				amount: "1200",
				currency: "BDT",
				intent: "sale",
				merchantInvoiceNumber: "Inv0124",
			}),
		},
	);

	const BkashCreatePaymentResult = await BkashCreatePaymentResponse.json();

	if (!BkashCreatePaymentResponse.ok) {
		throw new Error(
			BkashCreatePaymentResult.statusMessage || "bKash payment creation failed",
		);
	}
	return BkashCreatePaymentResult;
};

const bookAppoinmentCallbackService = async (query: Record<string, any>) => {
	const paymentID = query.paymentID;

	if (!paymentID) {
		throw new Error("Payment ID not found in the callback query");
	}

	const status = query.status;
	if (!status) {
		throw new Error(`Payment status not found in the callback query `);
	}

	const BkashIdToken = await getBkashIdToken();

	if (!BkashIdToken) {
		throw new Error("No Bkash Access Token found");
	}

	const BkashExecutePaymentResponse = await fetch(
		`${config.BKASH_BASE_URL}/tokenized/checkout/execute`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				authorization: BkashIdToken,
				"x-app-key": config.BKASH_APP_KEY,
			},
			body: JSON.stringify({
				paymentID: paymentID,
			}),
		},
	);

	const BkashExecutePaymentResult = await BkashExecutePaymentResponse.json();

	if (!BkashExecutePaymentResponse.ok) {
		throw new Error(
			BkashExecutePaymentResult.statusMessage ||
				"bKash payment execution failed",
		);
	}
	return BkashExecutePaymentResult;
};

export const AppoinmentServices = {
	bookAppoinmentService,
	bookAppoinmentCallbackService,
};
