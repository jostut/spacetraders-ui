# NegotiateContract200Response



## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**data** | [**NegotiateContract200ResponseData**](NegotiateContract200ResponseData.md) |  | 

## Example

```python
from spacetraders_client.models.negotiate_contract200_response import NegotiateContract200Response

# TODO update the JSON string below
json = "{}"
# create an instance of NegotiateContract200Response from a JSON string
negotiate_contract200_response_instance = NegotiateContract200Response.from_json(json)
# print the JSON string representation of the object
print(NegotiateContract200Response.to_json())

# convert the object into a dict
negotiate_contract200_response_dict = negotiate_contract200_response_instance.to_dict()
# create an instance of NegotiateContract200Response from a dict
negotiate_contract200_response_from_dict = NegotiateContract200Response.from_dict(negotiate_contract200_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


