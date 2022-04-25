import gql from "graphql-tag";

export const addWorkItemsToThemeMutation = gql`
  mutation AddWorkItemsToTheme($id: ID!, $workItems: [ID!]!) {
    addWorkItemsToTheme(input: { id: $id, workItemIds: $workItems }) {
      theme {
        id
        workItems {
          id
        }
      }
    }
  }
`;
