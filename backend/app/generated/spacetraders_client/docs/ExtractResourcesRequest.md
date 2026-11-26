# ExtractResourcesRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**survey** | [**Survey**](Survey.md) |  | [optional] 

## Example

```python
from spacetraders_client.models.extract_resources_request import ExtractResourcesRequest

# TODO update the JSON string below
json = "{}"
# create an instance of ExtractResourcesRequest from a JSON string
extract_resources_request_instance = ExtractResourcesRequest.from_json(json)
# print the JSON string representation of the object
print(ExtractResourcesRequest.to_json())

# convert the object into a dict
extract_resources_request_dict = extract_resources_request_instance.to_dict()
# create an instance of ExtractResourcesRequest from a dict
extract_resources_request_from_dict = ExtractResourcesRequest.from_dict(extract_resources_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


