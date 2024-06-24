from datetime import datetime
from typing import List, Literal, Optional

from langchain.pydantic_v1 import BaseModel, Field, datetime, validator

ChartType = Literal["bar", "line", "pie"]


class Address(BaseModel):
    street: str = Field(..., description="The address street.", example="123 Main St")
    city: str = Field(
        ..., description="The city the order was shipped to.", example="San Francisco"
    )
    state: str = Field(
        ..., description="The state the order was shipped to.", example="California"
    )
    zip: str = Field(
        ..., description="The zip code the order was shipped to.", example="94105"
    )


class Order(BaseModel):
    id: str = Field(..., description="A UUID for the order.")
    product_name: str = Field(..., description="The name of the product purchased.")
    amount: float = Field(..., description="The amount of the order.")
    discount: Optional[float] = Field(
        None,
        description="The percentage of the discount applied to the order. This is between 0 and 100. Not defined if no discount was applied.",
    )
    address: Address = Field(..., description="The address the order was shipped to.")
    status: str = Field(
        ...,
        description="The current status of the order.",
        enum=["pending", "processing", "shipped", "delivered", "cancelled", "returned"],
    )
    ordered_at: datetime = Field(..., description="The date the order was placed.")


class Filter(BaseModel):
    product_names: Optional[List[str]] = Field(
        None, description="List of product names to filter by"
    )
    before_date: Optional[datetime] = Field(
        None, description="Filter orders before this date"
    )
    after_date: Optional[datetime] = Field(
        None, description="Filter orders after this date"
    )
    min_amount: Optional[float] = Field(None, description="Minimum order amount")
    max_amount: Optional[float] = Field(None, description="Maximum order amount")
    state: Optional[str] = Field(None, description="State to filter by")
    city: Optional[str] = Field(None, description="City to filter by")
    discount: Optional[bool] = Field(
        None, description="Filter for orders with discounts"
    )
    min_discount_percentage: Optional[float] = Field(
        None, description="Minimum discount percentage"
    )
    status: Optional[str] = Field(
        None,
        description="Order status to filter by",
        enum=["pending", "processing", "shipped", "delivered", "cancelled", "returned"],
    )


def filter_schema(product_names: List[str]):
    product_names_as_string = ", ".join(name.lower() for name in product_names)

    class FilterSchema(BaseModel):
        product_names: Optional[List[str]] = Field(
            None,
            description=f"Filter orders by the product name. Lowercase only. MUST only be a list of the following products: {product_names_as_string}",
        )
        before_date: Optional[datetime] = Field(
            None,
            description="Filter orders placed before this date. Must be a valid date in the format 'YYYY-MM-DD'",
        )
        after_date: Optional[datetime] = Field(
            None,
            description="Filter orders placed after this date. Must be a valid date in the format 'YYYY-MM-DD'",
        )
        min_amount: Optional[float] = Field(
            None, description="The minimum amount of the order to filter by."
        )
        max_amount: Optional[float] = Field(
            None, description="The maximum amount of the order to filter by."
        )
        state: Optional[str] = Field(
            None,
            description="Filter orders by the state the order was placed in. Example: 'California'",
        )
        discount: Optional[bool] = Field(
            None,
            description="Filter orders by whether or not it had a discount applied.",
        )
        min_discount_percentage: Optional[float] = Field(
            None,
            ge=0,
            le=100,
            description="Filter orders which had at least this amount discounted (in percentage)",
        )
        status: Optional[str] = Field(
            None,
            description="The current status of the order.",
            enum=[
                "pending",
                "processing",
                "shipped",
                "delivered",
                "cancelled",
                "returned",
            ],
        )

        @validator("product_names", each_item=True)
        def validate_product_names(cls, v, values, **kwargs):
            if v.lower() not in [name.lower() for name in product_names]:
                raise ValueError(f"Invalid product name: {v}")
            return v.lower()

        @validator("before_date", "after_date", pre=True)
        def parse_date(cls, v):
            if isinstance(v, str):
                return datetime.strptime(v, "%Y-%m-%d")
            return v

        class Config:
            schema_extra = {
                "description": "Available filters to apply to orders.",
                "name": "generate_filters",
            }

    return FilterSchema


class DataDisplayTypeAndDescription(BaseModel):
    name: str = Field(..., description="The name of the data display type.")
    chart_type: ChartType = Field(
        ..., description="The type of chart which this format can be displayed on."
    )
    description: str = Field(
        ..., description="The description of the data display type."
    )

    class Config:
        allow_population_by_field_name = True
