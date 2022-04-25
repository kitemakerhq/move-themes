# move-themes

A script for moving themes (with their work items) to a new space. If you want to ensure work
items end up in the exact same status in the new space, make sure the statuses already exist
before moving.

Labels will be created for themes and work items in the new space if needed.

Members will be preseved.

## Usage

Use the `move-themes` script to move your themes. In this example, we're
moving two thees (with numbers ABC-123 and ABC-456) to the space with the
key DEF.

```bash
yarn
export KITEMAKER_TOKEN=<your-kitemaker-api-token>
yarn move-themes --themes=123,456 --from=ABC --to=DEF
```
