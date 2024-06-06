import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { InvoiceLoading, Invoice } from "@/components/prebuilt/invoice";
import { createRunnableUI } from "@/utils/server";
import { DynamicStructuredTool } from "@langchain/core/tools";

const LineItemSchema = z.object({
  id: z
    .string()
    .default(uuidv4())
    .describe("Unique identifier for the line item"),
  name: z.string().describe("Name or description of the line item"),
  quantity: z.number().int().positive().describe("Quantity of the line item"),
  price: z.number().positive().describe("Price per unit of the line item"),
});

const ShippingAddressSchema = z.object({
  name: z.string().describe("Name of the recipient"),
  street: z.string().describe("Street address for shipping"),
  city: z.string().describe("City for shipping"),
  state: z.string().describe("State or province for shipping"),
  zip: z.string().describe("ZIP or postal code for shipping"),
});

const CustomerInfoSchema = z.object({
  name: z.string().describe("Name of the customer"),
  email: z.string().email().describe("Email address of the customer"),
  phone: z.string().optional().describe("Phone number of the customer"),
});

const PaymentInfoSchema = z.object({
  cardType: z.string().describe("Type of credit card used for payment"),
  cardNumberLastFour: z
    .string()
    .describe("Last four digits of the credit card number"),
});

export const InvoiceSchema = z.object({
  orderId: z.string().describe("The order ID"),
  lineItems: z
    .array(LineItemSchema)
    .describe("List of line items in the invoice"),
  shippingAddress: ShippingAddressSchema.optional().describe(
    "Shipping address for the order",
  ),
  customerInfo: CustomerInfoSchema.optional().describe(
    "Information about the customer",
  ),
  paymentInfo: PaymentInfoSchema.optional().describe(
    "Payment information for the order",
  ),
});

export const invoiceTool = new DynamicStructuredTool({
  name: "get_order_invoice",
  description:
    "A tool to fetch the invoice from an order. This should only be called if a user uploads an image/receipt of an order.",
  schema: InvoiceSchema,
  func: async (input, config) => {
    const stream = createRunnableUI(config, <InvoiceLoading />);
    stream.done(<Invoice {...input} />);
    return JSON.stringify(input, null);
  },
});
