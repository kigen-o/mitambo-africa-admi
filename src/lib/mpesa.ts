
export interface MpesaConfig {
    paybill: string;
    consumerKey: string;
    consumerSecret: string;
    passkey: string;
}

export const initiateSTKPush = async ({
    phoneNumber,
    amount,
    invoiceId,
}: {
    phoneNumber: string,
    amount: number,
    invoiceId: string,
}): Promise<{ success: boolean; message: string; data?: unknown }> => {
    console.log("Initiating M-Pesa STK Push", { phoneNumber, amount, invoiceId });

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simulation logic
    if (phoneNumber.length < 10) {
        return { success: false, message: "Invalid phone number." };
    }

    return {
        success: true,
        message: "STK Push sent successfully. Please enter your PIN to complete the transaction.",
        data: {
            CheckoutRequestID: "ws_CO_DMZ_1234567890",
            ResponseCode: "0",
            ResponseDescription: "Success. Request accepted for processing",
            CustomerMessage: "Success. Request accepted for processing",
        },
    };
};
