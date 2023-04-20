import {
  InMemoryCache,
  IntrospectionFragmentMatcher,
} from "apollo-cache-inmemory";
import { ApolloClient } from "apollo-client";
import { setContext } from "apollo-link-context";
import { HttpLink } from "apollo-link-http";
import commandLineArgs from "command-line-args";
import "cross-fetch/polyfill";
import { sortBy, uniqBy } from "lodash";
import {
  addLabelsToThemeMutation,
  addLabelsToWorkItemMutation,
} from "./mutations/addLabels";
import { addWorkItemsToThemeMutation } from "./mutations/addWorkItems";
import { createLabelMutation } from "./mutations/createLabel";
import { moveThemeMutation } from "./mutations/moveTheme";
import { moveWorkItemMutation } from "./mutations/moveWorkItem";
import { spacesQuery } from "./queries/spaces";
import { themesQuery } from "./queries/themes";

if (!process.env.KITEMAKER_TOKEN) {
  console.error(
    "Could not find Kitemaker token. Make sure the KITEMAKER_TOKEN environment variable is set."
  );
  process.exit(-1);
}

const opts = commandLineArgs([
  { name: "from", alias: "f", type: String },
  { name: "to", alias: "d", type: String },
  { name: "themes", alias: "t", type: String },
]);

if (!opts.from) {
  console.log("Source space not specified");
  process.exit(-1);
}

if (!opts.to) {
  console.log("Destination space not specified");
  process.exit(-1);
}

if (!opts.themes) {
  console.log("Themes to move not specified");
  process.exit(-1);
}

const host = process.env.KITEMAKER_HOST ?? "https://toil.kitemaker.co";

const httpLink = new HttpLink({
  uri: `${host}/developers/graphql`,
});
const authLink = setContext((_, { headers }) => {
  return {
    headers: {
      ...headers,
      authorization: `Bearer ${process.env.KITEMAKER_TOKEN}`,
    },
  };
});

const fragmentMatcher = new IntrospectionFragmentMatcher({
  introspectionQueryResultData: { __schema: { types: [] } },
});
const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache({ fragmentMatcher }),
});

async function fetchSpaces(): Promise<any[]> {
  const spacesResult: any = await client.query({
    query: spacesQuery,
  });

  const spaces = spacesResult.data.organization.spaces;
  return spaces;
}

async function fetchThemes(space: any) {
  const themes: any[] = [];
  let hasMore = true;
  let cursor: string | null = null;

  while (hasMore) {
    const result: any = await client.query({
      query: themesQuery,
      variables: {
        space: space.id,
        cursor,
      },
    });

    if (result.errors) {
      console.error(
        "Unable to fetch themes",
        JSON.stringify(result.errors, null, "  ")
      );
      process.exit(-1);
    }

    cursor = result.data.themes.cursor;
    hasMore = result.data.themes.hasMore;

    for (const theme of result.data.themes.themes) {
      themes.push(theme);
    }
  }

  return sortBy(themes, (t) => t.sort);
}

async function createLabelsIfNeeded(to: any, labels: any[]): Promise<any> {
  const result = to.labels.reduce(
    (result: Record<string, string>, label: any) => {
      result[label.name] = label.id;
      return result;
    },
    {}
  );

  for (const label of labels) {
    const labelName = label.name;
    if (!result[labelName]) {
      const newLabel = await client.mutate({
        mutation: createLabelMutation,
        variables: {
          space: to.id,
          name: labelName,
          color: labels.find((l: any) => l.name === labelName)!.color,
        },
      });
      result[labelName] = newLabel.data.createLabel.label.id;
    }
  }

  return result;
}

async function moveThemes(themes: any, from: any, to: any) {
  const labels = await createLabelsIfNeeded(
    to,
    themes.flatMap((t: any) => t.labels)
  );

  console.log("THEMES:");

  for (const theme of themes) {
    const labelNames: string[] = theme.labels.map((l: any) => l.name);
    const labelIds = labelNames.map((name) => labels[name]);

    const result = await client.mutate({
      mutation: moveThemeMutation,
      variables: {
        id: theme.id,
        space: to.id,
      },
    });

    console.log(
      `${from.key}-${theme.number} -> ${to.key}-${result.data.editTheme.theme.number}`
    );

    if (labelIds.length) {
      await client.mutate({
        mutation: addLabelsToThemeMutation,
        variables: {
          id: theme.id,
          labels: labelIds,
        },
      });
    }
  }
}

async function moveWorkItems(workItems: any, from: any, to: any) {
  const labels = await createLabelsIfNeeded(
    to,
    workItems.flatMap((w: any) => w.labels)
  );

  console.log("WORK ITEMS:");

  for (const workItem of workItems) {
    const labelNames: string[] = workItem.labels.map((l: any) => l.name);
    const labelIds = labelNames.map((name) => labels[name]);
    const statusName = workItem.status.name;
    const statusType = workItem.status.type;

    const result = await client.mutate({
      mutation: moveWorkItemMutation,
      variables: {
        id: workItem.id,
        space: to.id,
        status:
          to.statuses.find(
            (status: any) =>
              status.name === statusName && status.type === statusType
          )?.id ??
          to.statuses.find((status: any) => status.type === statusType)?.id ??
          to.statuses.find((status: any) => status.type === "BACKLOG") ??
          to.statuses.find((status: any) => status.type === "TODO"),
      },
    });

    console.log(
      `${from.key}-${workItem.number} -> ${to.key}-${result.data.editWorkItem.workItem.number}`
    );

    if (labelIds.length) {
      await client.mutate({
        mutation: addLabelsToWorkItemMutation,
        variables: {
          id: workItem.id,
          labels: labelIds,
        },
      });
    }
  }
}

async function run() {
  const spaces = await fetchSpaces();
  const fromSpace = spaces.find(
    (space) => space.key.toLowerCase() === opts.from.toLowerCase()
  );
  if (!fromSpace) {
    console.error("Unable to find space with key", opts.from);
    process.exit(-1);
  }

  const toSpace = spaces.find(
    (space) => space.key.toLowerCase() === opts.to.toLowerCase()
  );
  if (!toSpace) {
    console.error("Unable to find space with key", opts.to);
    process.exit(-1);
  }

  const themes = await fetchThemes(fromSpace);
  const themeIdsToMove: string[] = opts.themes
    .split(",")
    .map((s: string) => s.trim());
  const themesToMove = themes.filter((t: any) =>
    themeIdsToMove.includes(t.number)
  );

  console.log(
    "Will move",
    themesToMove.length,
    "themes from",
    fromSpace.name,
    "to",
    toSpace.name
  );

  const workItemsByTheme = themesToMove.reduce(
    (result: Record<string, string>, theme: any) => {
      result[theme.id] = theme.workItems.map((w: any) => w.id);
      return result;
    },
    {}
  );
  await moveThemes(themesToMove, fromSpace, toSpace);

  const workItemsToMove = sortBy(
    uniqBy(
      themesToMove.flatMap((t: any) => t.workItems),
      (w: any) => w.id
    ),
    (w) => w.sort
  );

  await moveWorkItems(workItemsToMove, fromSpace, toSpace);

  for (const themeId in workItemsByTheme) {
    await client.mutate({
      mutation: addWorkItemsToThemeMutation,
      variables: {
        id: themeId,
        workItems: workItemsByTheme[themeId],
      },
    });
  }

  process.exit(0);
}

run();
