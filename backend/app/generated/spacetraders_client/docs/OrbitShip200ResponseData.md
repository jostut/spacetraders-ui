# OrbitShip200ResponseData


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**nav** | [**ShipNav**](ShipNav.md) |  | 

## Example

```python
from spacetraders_client.models.orbit_ship200_response_data import OrbitShip200ResponseData

# TODO update the JSON string below
json = "{}"
# create an instance of OrbitShip200ResponseData from a JSON string
orbit_ship200_response_data_instance = OrbitShip200ResponseData.from_json(json)
# print the JSON string representation of the object
print(OrbitShip200ResponseData.to_json())

# convert the object into a dict
orbit_ship200_response_data_dict = orbit_ship200_response_data_instance.to_dict()
# create an instance of OrbitShip200ResponseData from a dict
orbit_ship200_response_data_from_dict = OrbitShip200ResponseData.from_dict(orbit_ship200_response_data_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


