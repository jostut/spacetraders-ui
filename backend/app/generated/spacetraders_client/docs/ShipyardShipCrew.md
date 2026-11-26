# ShipyardShipCrew


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**required** | **int** |  | 
**capacity** | **int** |  | 

## Example

```python
from spacetraders_client.models.shipyard_ship_crew import ShipyardShipCrew

# TODO update the JSON string below
json = "{}"
# create an instance of ShipyardShipCrew from a JSON string
shipyard_ship_crew_instance = ShipyardShipCrew.from_json(json)
# print the JSON string representation of the object
print(ShipyardShipCrew.to_json())

# convert the object into a dict
shipyard_ship_crew_dict = shipyard_ship_crew_instance.to_dict()
# create an instance of ShipyardShipCrew from a dict
shipyard_ship_crew_from_dict = ShipyardShipCrew.from_dict(shipyard_ship_crew_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


