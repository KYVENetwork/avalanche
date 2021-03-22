export default `
query(
  $uploader: String!
  $pool: String!
  $chain: String!
  $latest: Int
  $cursor: String
) {
  transactions(
    owners: [$uploader]
    tags: [
      { name: "Application", values: "KYVE - DEV" }
      { name: "Pool", values: [$pool] }
      { name: "Chain", values: [$chain] }
    ]
    block: { min: $latest }
    after: $cursor
  ) {
    pageInfo {
      hasNextPage
    }
    edges {
      cursor
      node {
        id
        tags {
          name
          value
        }
        block {
          height
        }
      }
    }
  }
}
`;
