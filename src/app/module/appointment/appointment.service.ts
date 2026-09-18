import {
	AppointmentStatus,
	PaymentStatus,
} from "../../../generated/prisma/browser";
import config from "../../config";
import { getBkashIdToken } from "../../lib/bkash";
import { prisma } from "../../lib/prisma";
import type { RequestUser } from "../../middleware/checkAuth";

const bookAppoinmentService = async (payload: any, user: RequestUser) => {
	const TransactionResult = await prisma.$transaction(async (tx) => {
		const appointment = await tx.appointment.create({
			data: {
				// Add your appointment data here
				status: AppointmentStatus.PENDING,
			},
		});

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
					payerReference: user.email,
					callbackURL: `${config.BKASH_CALLBACK_URL}/appointment/book-appointment/payment/callback`,
					merchantAssociationInfo: "MI05MID54RF09123456One",
					amount: "1200",
					currency: "BDT",
					intent: "sale",
					merchantInvoiceNumber: `Inv${appointment.id}`, //appointment id as invoice number
					// merchantInvoiceNumber: "Inv01243",
				}),
			},
		);

		const BkashCreatePaymentResult = await BkashCreatePaymentResponse.json();

		if (!BkashCreatePaymentResponse.ok) {
			throw new Error(
				BkashCreatePaymentResult.statusMessage ||
					"bKash payment creation failed",
			);
		}

		// payment creation successful, update appointment with payment details
		const payment = await tx.payment.create({
			data: {
				merchantInvoiceNumber: BkashCreatePaymentResult.merchantInvoiceNumber,
				appointmentId: appointment.id,
				amount: "1200",
				gatewayResponse: BkashCreatePaymentResult,
				bkashPaymentId: BkashCreatePaymentResult.paymentID,
				payerReference: user.email,
			},
		});

		return BkashCreatePaymentResult.bkashURL;
	});

	return TransactionResult;
};

const bookAppoinmentCallbackService = async (query: Record<string, any>) => {
	const transactionResult = await prisma.$transaction(async (tx) => {
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

		if (status === "success") {
			await tx.appointment.update({
				where: {
					id: BkashExecutePaymentResult.merchantInvoiceNumber,
				},
				data: {
					status: AppointmentStatus.CONFIRMED,
				},
			});

			await tx.payment.update({
				where: {
					bkashPaymentId: paymentID,
				},
				data: {
					status: PaymentStatus.PAID,
					bkashTrxId: BkashExecutePaymentResult.trxID,
					paidAt: BkashExecutePaymentResult.paymentExecuteTime,
					gatewayResponse: BkashExecutePaymentResult,
				},
			});

			return {
				message: "Payment executed successfully",
				redirectUrl: `${config.FRONTEND_URL}/dashboard/my-appointments?status=success`,
			};
		} else if (status === "failure") {
			await tx.payment.update({
				where: {
					bkashPaymentId: paymentID,
				},
				data: {
					status: PaymentStatus.FAILED,
					gatewayResponse: BkashExecutePaymentResult,
				},
			});

			return {
				message: "Payment failed",
				redirectUrl: `${config.FRONTEND_URL}/dashboard/my-appointments?status=failure`,
			};
		} else if (status === "cancel") {
			await tx.payment.update({
				where: {
					bkashPaymentId: paymentID,
				},
				data: {
					status: PaymentStatus.CANCELED,
					gatewayResponse: BkashExecutePaymentResult,
				},
			});

			return {
				message: "Payment cancelled",
				redirectUrl: `${config.FRONTEND_URL}/dashboard/my-appointments?status=cancel`,
			};
		} else {
			return {
				BkashExecutePaymentResult,
				message: "Payment status unknown",
				redirectUrl: `${config.FRONTEND_URL}/dashboard/my-appointments?status=payment_failed`,
			};
		}
	});

	return transactionResult;
};

export const AppoinmentServices = {
	bookAppoinmentService,
	bookAppoinmentCallbackService,
};
