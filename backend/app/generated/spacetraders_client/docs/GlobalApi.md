# spacetraders_client.GlobalApi

All URIs are relative to *https://api.spacetraders.io/v2*

Method | HTTP request | Description
------------- | ------------- | -------------
[**get_status**](GlobalApi.md#get_status) | **GET** / | Get Status
[**register**](GlobalApi.md#register) | **POST** /register | Register New Agent


# **get_status**
> GetStatus200Response get_status()

Get Status

Return the status of the game server. This also includes a few global elements, such as announcements, server reset dates and leaderboards.

### Example

* Bearer (JWT) Authentication (AgentToken):

```python
import spacetraders_client
from spacetraders_client.models.get_status200_response import GetStatus200Response
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
    api_instance = spacetraders_client.GlobalApi(api_client)

    try:
        # Get Status
        api_response = api_instance.get_status()
        print("The response of GlobalApi->get_status:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling GlobalApi->get_status: %s\n" % e)
```



### Parameters

This endpoint does not need any parameter.

### Return type

[**GetStatus200Response**](GetStatus200Response.md)

### Authorization

[AgentToken](../README.md#AgentToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Fetched status successfully. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **register**
> Register201Response register(register_request=register_request)

Register New Agent

Creates a new agent and ties it to an account.  The agent symbol must consist of a 3-14 character string, and will be used to represent your agent. This symbol will prefix the symbol of every ship you own. Agent symbols will be cast to all uppercase characters.  This new agent will be tied to a starting faction of your choice, which determines your starting location, and will be granted an authorization token, a contract with their starting faction, a command ship that can fly across space with advanced capabilities, a small probe ship that can be used for reconnaissance, and 175,000 credits.  > #### Keep your token safe and secure > > Keep careful track of where you store your token. You can generate a new token from our account dashboard, but if someone else gains access to your token they will be able to use it to make API requests on your behalf until the end of the reset.  If you are new to SpaceTraders, It is recommended to register with the COSMIC faction, a faction that is well connected to the rest of the universe. After registering, you should try our interactive [quickstart guide](https://docs.spacetraders.io/quickstart/new-game) which will walk you through a few basic API requests in just a few minutes.

### Example

* Bearer (JWT) Authentication (AccountToken):

```python
import spacetraders_client
from spacetraders_client.models.register201_response import Register201Response
from spacetraders_client.models.register_request import RegisterRequest
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

# Enter a context with an instance of the API client
with spacetraders_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = spacetraders_client.GlobalApi(api_client)
    register_request = spacetraders_client.RegisterRequest() # RegisterRequest |  (optional)

    try:
        # Register New Agent
        api_response = api_instance.register(register_request=register_request)
        print("The response of GlobalApi->register:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling GlobalApi->register: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **register_request** | [**RegisterRequest**](RegisterRequest.md)|  | [optional] 

### Return type

[**Register201Response**](Register201Response.md)

### Authorization

[AccountToken](../README.md#AccountToken)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**201** | Successfully registered. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

