# spacetraders_client.DataApi

All URIs are relative to *https://api.spacetraders.io/v2*

Method | HTTP request | Description
------------- | ------------- | -------------
[**get_supply_chain**](DataApi.md#get_supply_chain) | **GET** /market/supply-chain | Get Supply Chain


# **get_supply_chain**
> GetSupplyChain200Response get_supply_chain()

Get Supply Chain

Describes which import and exports map to each other.

### Example

* Bearer (JWT) Authentication (AgentToken):

```python
import spacetraders_client
from spacetraders_client.models.get_supply_chain200_response import GetSupplyChain200Response
from spacetraders_client.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.spacetraders.io/v2
# See configuration.py for a list of all supported configuration parameters.
configuration = spacetraders_client.Configuration(
    host = "https://api.spacetraders.io/v2"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization (JWT): AgentToken
configuration = spacetraders_client.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with spacetraders_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = spacetraders_client.DataApi(api_client)

    try:
        # Get Supply Chain
        api_response = api_instance.get_supply_chain()
        print("The response of DataApi->get_supply_chain:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DataApi->get_supply_chain: %s\n" % e)
```



### Parameters

This endpoint does not need any parameter.

### Return type

[**GetSupplyChain200Response**](GetSupplyChain200Response.md)

### Authorization

[AgentToken](../README.md#AgentToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully retrieved the supply chain information |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

