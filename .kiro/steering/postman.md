---
inclusion: always
---

# Postman collection upkeep

Every backend HTTP endpoint must have a matching request in the Postman collection at `postman/collections/SpaceTraders Agent Login/`, so it can be tested manually.

When you add, change, or remove a backend route (a `@router.*` or `@app.*` decorator under `backend/app`):

- Add or update a `<METHOD> <Name>.request.yaml` file. Use `API/` for `/api/...` routes and the collection root for health routes. Follow the layout and style of `API/POST Login.request.yaml`.
- Use `{{base_url}}` for the host. Put path values in environment variables (for example `{{system_symbol}}`) and add them with sensible defaults to `postman/environments/Local Development.environment.yaml`.
- Send no secrets inline. Use `{{agent_token}}` where a token is needed.
- Add `afterResponse` tests that check the status code and the response shape, including the error envelope for failure statuses.
- Add examples under `.resources/<Request Name>.resources/examples/` for each documented status (200 and each error status), and point the request at them with `examples:`.
- Do not use `$kind: http-request` order values already taken by another request in the same folder.
- Remove the request file when its route is removed.

Treat the Postman files as part of the same task as the endpoint. A backend route task is not complete until its Postman request exists.
