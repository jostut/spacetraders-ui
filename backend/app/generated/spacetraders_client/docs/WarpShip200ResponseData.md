# WarpShip200ResponseData


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**fuel** | [**ShipFuel**](ShipFuel.md) |  | 
**nav** | [**ShipNav**](ShipNav.md) |  | 

## Example

```python
from spacetraders_client.models.warp_ship200_response_data import WarpShip200ResponseData

# TODO update the JSON string below
json = "{}"
# create an instance of WarpShip200ResponseData from a JSON string
warp_ship200_response_data_instance = WarpShip200ResponseData.from_json(json)
# print the JSON string representation of the object
print(WarpShip200ResponseData.to_json())

# convert the object into a dict
warp_ship200_response_data_dict = warp_ship200_response_data_instance.to_dict()
# create an instance of WarpShip200ResponseData from a dict
warp_ship200_response_data_from_dict = WarpShip200ResponseData.from_dict(warp_ship200_response_data_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


