# RemoveModule201Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**data** | [**InstallShipModule201ResponseData**](InstallShipModule201ResponseData.md) |  | 

## Example

```python
from spacetraders_client.models.remove_module201_response import RemoveModule201Response

# TODO update the JSON string below
json = "{}"
# create an instance of RemoveModule201Response from a JSON string
remove_module201_response_instance = RemoveModule201Response.from_json(json)
# print the JSON string representation of the object
print(RemoveModule201Response.to_json())

# convert the object into a dict
remove_module201_response_dict = remove_module201_response_instance.to_dict()
# create an instance of RemoveModule201Response from a dict
remove_module201_response_from_dict = RemoveModule201Response.from_dict(remove_module201_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


