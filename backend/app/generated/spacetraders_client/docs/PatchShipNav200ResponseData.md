# PatchShipNav200ResponseData


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**nav** | [**ShipNav**](ShipNav.md) |  | 
**fuel** | [**ShipFuel**](ShipFuel.md) |  | 
**events** | [**List[ShipConditionEvent]**](ShipConditionEvent.md) |  | 

## Example

```python
from spacetraders_client.models.patch_ship_nav200_response_data import PatchShipNav200ResponseData

# TODO update the JSON string below
json = "{}"
# create an instance of PatchShipNav200ResponseData from a JSON string
patch_ship_nav200_response_data_instance = PatchShipNav200ResponseData.from_json(json)
# print the JSON string representation of the object
print(PatchShipNav200ResponseData.to_json())

# convert the object into a dict
patch_ship_nav200_response_data_dict = patch_ship_nav200_response_data_instance.to_dict()
# create an instance of PatchShipNav200ResponseData from a dict
patch_ship_nav200_response_data_from_dict = PatchShipNav200ResponseData.from_dict(patch_ship_nav200_response_data_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


