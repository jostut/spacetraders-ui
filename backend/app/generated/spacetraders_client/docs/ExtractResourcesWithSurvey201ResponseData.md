# ExtractResourcesWithSurvey201ResponseData


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**cooldown** | [**Cooldown**](Cooldown.md) |  | 
**extraction** | [**Extraction**](Extraction.md) |  | 
**cargo** | [**ShipCargo**](ShipCargo.md) |  | 
**events** | [**List[ShipConditionEvent]**](ShipConditionEvent.md) |  | 

## Example

```python
from spacetraders_client.models.extract_resources_with_survey201_response_data import ExtractResourcesWithSurvey201ResponseData

# TODO update the JSON string below
json = "{}"
# create an instance of ExtractResourcesWithSurvey201ResponseData from a JSON string
extract_resources_with_survey201_response_data_instance = ExtractResourcesWithSurvey201ResponseData.from_json(json)
# print the JSON string representation of the object
print(ExtractResourcesWithSurvey201ResponseData.to_json())

# convert the object into a dict
extract_resources_with_survey201_response_data_dict = extract_resources_with_survey201_response_data_instance.to_dict()
# create an instance of ExtractResourcesWithSurvey201ResponseData from a dict
extract_resources_with_survey201_response_data_from_dict = ExtractResourcesWithSurvey201ResponseData.from_dict(extract_resources_with_survey201_response_data_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


