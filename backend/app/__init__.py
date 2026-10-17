"""SpaceTraders agent-login backend package.

A deliberately stateless Python backend: it accepts a login request carrying a
SpaceTraders API token, calls the SpaceTraders API through the generated client
using that token as a per-request bearer credential, and returns a compact
``Agent_Details`` shape. Nothing is persisted.
"""
