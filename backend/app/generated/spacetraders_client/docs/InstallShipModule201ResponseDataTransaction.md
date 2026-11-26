# InstallShipModule201ResponseDataTransaction


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**waypoint_symbol** | **str** |  | 
**ship_symbol** | **str** |  | 
**trade_symbol** | **str** |  | 
**total_price** | **int** |  | 
**timestamp** | **str** |  | 

## Example

```python
from spacetraders_client.models.install_ship_module201_response_data_transaction import InstallShipModule201ResponseDataTransaction

# TODO update the JSON string below
json = "{}"
# create an instance of InstallShipModule201ResponseDataTransaction from a JSON string
install_ship_module201_response_data_transaction_instance = InstallShipModule201ResponseDataTransaction.from_json(json)
# print the JSON string representation of the object
print(InstallShipModule201ResponseDataTransaction.to_json())

# convert the object into a dict
install_ship_module201_response_data_transaction_dict = install_ship_module201_response_data_transaction_instance.to_dict()
# create an instance of InstallShipModule201ResponseDataTransaction from a dict
install_ship_module201_response_data_transaction_from_dict = InstallShipModule201ResponseDataTransaction.from_dict(install_ship_module201_response_data_transaction_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


