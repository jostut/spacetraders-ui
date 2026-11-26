# NegotiateContract200ResponseData


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**contract** | [**Contract**](Contract.md) |  | 

## Example

```python
from spacetraders_client.models.negotiate_contract200_response_data import NegotiateContract200ResponseData

# TODO update the JSON string below
json = "{}"
# create an instance of NegotiateContract200ResponseData from a JSON string
negotiate_contract200_response_data_instance = NegotiateContract200ResponseData.from_json(json)
# print the JSON string representation of the object
print(NegotiateContract200ResponseData.to_json())

# convert the object into a dict
negotiate_contract200_response_data_dict = negotiate_contract200_response_data_instance.to_dict()
# create an instance of NegotiateContract200ResponseData from a dict
negotiate_contract200_response_data_from_dict = NegotiateContract200ResponseData.from_dict(negotiate_contract200_response_data_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


