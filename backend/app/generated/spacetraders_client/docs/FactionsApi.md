# spacetraders_client.FactionsApi

All URIs are relative to *https://api.spacetraders.io/v2*

Method | HTTP request | Description
------------- | ------------- | -------------
[**get_faction**](FactionsApi.md#get_faction) | **GET** /factions/{factionSymbol} | Get Faction
[**get_factions**](FactionsApi.md#get_factions) | **GET** /factions | List Factions


# **get_faction**
> GetFaction200Response get_faction(faction_symbol)

Get Faction

View the details of a faction.

### Example

* Bearer (JWT) Authentication (AccountToken):
* Bearer (JWT) Authentication (AgentToken):

```python
import spacetraders_client
from spacetraders_client.models.get_faction200_response import GetFaction200Response
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

# Configure Bearer authorization (JWT): AccountToken
configuration = spacetraders_client.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Configure Bearer authorization (JWT): AgentToken
configuration = spacetraders_client.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with spacetraders_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = spacetraders_client.FactionsApi(api_client)
    faction_symbol = 'COSMIC' # str | The faction symbol

    try:
        # Get Faction
        api_response = api_instance.get_faction(faction_symbol)
        print("The response of FactionsApi->get_faction:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling FactionsApi->get_faction: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **faction_symbol** | **str**| The faction symbol | 

### Return type

[**GetFaction200Response**](GetFaction200Response.md)

### Authorization

[AccountToken](../README.md#AccountToken), [AgentToken](../README.md#AgentToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully fetched a faction. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_factions**
> GetFactions200Response get_factions(page=page, limit=limit)

List Factions

Return a paginated list of all the factions in the game.

### Example

* Bearer (JWT) Authentication (AgentToken):

```python
import spacetraders_client
from spacetraders_client.models.get_factions200_response import GetFactions200Response
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
    api_instance = spacetraders_client.FactionsApi(api_client)
    page = 1 # int | What entry offset to request (optional) (default to 1)
    limit = 10 # int | How many entries to return per page (optional) (default to 10)

    try:
        # List Factions
        api_response = api_instance.get_factions(page=page, limit=limit)
        print("The response of FactionsApi->get_factions:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling FactionsApi->get_factions: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **page** | **int**| What entry offset to request | [optional] [default to 1]
 **limit** | **int**| How many entries to return per page | [optional] [default to 10]

### Return type

[**GetFactions200Response**](GetFactions200Response.md)

### Authorization

[AgentToken](../README.md#AgentToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Successfully fetched factions. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

