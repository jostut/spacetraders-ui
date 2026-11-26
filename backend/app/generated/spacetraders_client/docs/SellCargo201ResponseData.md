# SellCargo201ResponseData


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**agent** | [**Agent**](Agent.md) |  | 
**cargo** | [**ShipCargo**](ShipCargo.md) |  | 
**transaction** | [**MarketTransaction**](MarketTransaction.md) |  | 

## Example

```python
from spacetraders_client.models.sell_cargo201_response_data import SellCargo201ResponseData

# TODO update the JSON string below
json = "{}"
# create an instance of SellCargo201ResponseData from a JSON string
sell_cargo201_response_data_instance = SellCargo201ResponseData.from_json(json)
# print the JSON string representation of the object
print(SellCargo201ResponseData.to_json())

# convert the object into a dict
sell_cargo201_response_data_dict = sell_cargo201_response_data_instance.to_dict()
# create an instance of SellCargo201ResponseData from a dict
sell_cargo201_response_data_from_dict = SellCargo201ResponseData.from_dict(sell_cargo201_response_data_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


