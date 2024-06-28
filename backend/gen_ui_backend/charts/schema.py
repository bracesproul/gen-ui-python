from typing import List, Literal, Optional, Type

from langchain_core.pydantic_v1 import BaseModel, Field

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
    """CamelCase is used here to match the schema used in the frontend."""

    id: str = Field(..., description="A UUID for the order.")
    productName: str = Field(..., description="The name of the product purchased.")
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
    orderedAt: str = Field(
        ..., description="The date the order was placed. Must be a valid date string."
    )


class Filter(BaseModel):
    product_names: Optional[List[str]] = Field(
        None, description="List of product names to filter by"
    )
    before_date: Optional[str] = Field(
        None, description="Filter orders before this date. Must be a valid date string."
    )
    after_date: Optional[str] = Field(
        None, description="Filter orders after this date. Must be a valid date string."
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


def filter_schema(product_names: List[str]) -> Type[BaseModel]:
    product_names_as_string = ", ".join(name.lower() for name in product_names)

    class FilterSchema(BaseModel):
        """Available filters to apply to orders."""

        product_names: Optional[List[str]] = Field(
            None,
            description=f"Filter orders by the product name. Lowercase only. MUST only be a list of the following products: {product_names_as_string}",
        )
        before_date: Optional[str] = Field(
            None,
            description="Filter orders placed before this date. Must be a valid date in the format 'YYYY-MM-DD'",
        )
        after_date: Optional[str] = Field(
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

    return FilterSchema


class DataDisplayTypeAndDescription(BaseModel):
    title: str = Field(..., description="The title of the data display type.")
    chartType: ChartType = Field(
        ..., description="The type of chart which this format can be displayed on."
    )
    description: str = Field(
        ..., description="The description of the data display type."
    )

    class Config:
        allow_population_by_field_name = True
