import gql from "graphql-tag";

export const addLabelsToWorkItemMutation = gql`
  mutation AddLabelsToWorkItem($id: ID!, $labels: [ID!]!) {
    addLabelsToWorkItem(input: { id: $id, labelIds: $labels }) {
      workItem {
        id
        labels {
          id
        }
      }
    }
  }
`;

export const addLabelsToThemeMutation = gql`
  mutation AddLabelsToTheme($id: ID!, $labels: [ID!]!) {
    addLabelsToTheme(input: { id: $id, labelIds: $labels }) {
      theme {
        id
        labels {
          id
        }
      }
    }
  }
`;
