# ShipyardShip



## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | [**ShipType**](ShipType.md) |  | 
**name** | **str** |  | 
**description** | **str** |  | 
**supply** | [**SupplyLevel**](SupplyLevel.md) |  | 
**activity** | [**ActivityLevel**](ActivityLevel.md) |  | [optional] 
**purchase_price** | **int** |  | 
**frame** | [**ShipFrame**](ShipFrame.md) |  | 
**reactor** | [**ShipReactor**](ShipReactor.md) |  | 
**engine** | [**ShipEngine**](ShipEngine.md) |  | 
**modules** | [**List[ShipModule]**](ShipModule.md) |  | 
**mounts** | [**List[ShipMount]**](ShipMount.md) |  | 
**crew** | [**ShipyardShipCrew**](ShipyardShipCrew.md) |  | 

## Example

```python
from spacetraders_client.models.shipyard_ship import ShipyardShip

# TODO update the JSON string below
json = "{}"
# create an instance of ShipyardShip from a JSON string
shipyard_ship_instance = ShipyardShip.from_json(json)
# print the JSON string representation of the object
print(ShipyardShip.to_json())

# convert the object into a dict
shipyard_ship_dict = shipyard_ship_instance.to_dict()
# create an instance of ShipyardShip from a dict
shipyard_ship_from_dict = ShipyardShip.from_dict(shipyard_ship_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


