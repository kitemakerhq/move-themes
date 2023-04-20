import gql from "graphql-tag";

export const moveWorkItemMutation = gql`
  mutation MoveWorkItem($id: ID!, $space: ID!, $status: ID!) {
    editWorkItem(input: { id: $id, spaceId: $space, statusId: $status }) {
      workItem {
        number
        space {
          id
          key
        }
        status {
          id
        }
      }
    }
  }
`;
