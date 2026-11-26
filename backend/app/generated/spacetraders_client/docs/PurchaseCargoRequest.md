# PurchaseCargoRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**symbol** | [**TradeSymbol**](TradeSymbol.md) |  | 
**units** | **int** | Amounts of units to purchase. | 

## Example

```python
from spacetraders_client.models.purchase_cargo_request import PurchaseCargoRequest

# TODO update the JSON string below
json = "{}"
# create an instance of PurchaseCargoRequest from a JSON string
purchase_cargo_request_instance = PurchaseCargoRequest.from_json(json)
# print the JSON string representation of the object
print(PurchaseCargoRequest.to_json())

# convert the object into a dict
purchase_cargo_request_dict = purchase_cargo_request_instance.to_dict()
# create an instance of PurchaseCargoRequest from a dict
purchase_cargo_request_from_dict = PurchaseCargoRequest.from_dict(purchase_cargo_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


