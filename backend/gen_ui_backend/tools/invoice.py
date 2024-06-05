from langchain.pydantic_v1 import BaseModel, Field, EmailStr
from typing import List, Optional
from uuid import uuid4
from langchain_core.tools import tool

class LineItem(BaseModel):
    id: str = Field(default_factory=uuid4, description="Unique identifier for the line item")
    name: str = Field(..., description="Name or description of the line item")
    quantity: int = Field(..., gt=0, description="Quantity of the line item")
    price: float = Field(..., gt=0, description="Price per unit of the line item")

class ShippingAddress(BaseModel):
    name: str = Field(..., description="Name of the recipient")
    street: str = Field(..., description="Street address for shipping")
    city: str = Field(..., description="City for shipping")
    state: str = Field(..., description="State or province for shipping")
    zip: str = Field(..., description="ZIP or postal code for shipping")

class CustomerInfo(BaseModel):
    name: str = Field(..., description="Name of the customer")
    email: EmailStr = Field(..., description="Email address of the customer")
    phone: Optional[str] = Field(None, description="Phone number of the customer")

class PaymentInfo(BaseModel):
    cardType: str = Field(..., description="Type of credit card used for payment")
    cardNumberLastFour: str = Field(..., description="Last four digits of the credit card number")

class Invoice(BaseModel):
    orderId: str = Field(..., description="The order ID")
    lineItems: List[LineItem] = Field(..., description="List of line items in the invoice")
    shippingAddress: Optional[ShippingAddress] = Field(None, description="Shipping address for the order")
    customerInfo: Optional[CustomerInfo] = Field(None, description="Information about the customer")
    paymentInfo: Optional[PaymentInfo] = Field(None, description="Payment information for the order")


@tool("invoice-parser", args_schema=Invoice, return_direct=True)
def invoice_parser(invoice: Invoice) -> Invoice:
    """Parse an invoice and return it without modification."""
    return invoice
