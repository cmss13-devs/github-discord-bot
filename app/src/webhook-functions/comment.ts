import { IssueCommentEvent, PullRequestReviewCommentEvent } from "@octokit/webhooks-types";
import { isBlacklisted } from "./helpers";
import { blacklist, adminToken } from "../../config/config.json";
import { graphql } from "@octokit/graphql";
import { GraphQlQueryResponse } from "@octokit/graphql/dist-types/types";

export const IssueComment = async (event: IssueCommentEvent, review: boolean) => {
    if (!isBlacklisted(null, null, event.comment.body, blacklist)) {
        return;
    }

    if (!adminToken?.length) return;

    const graphqlWithAuth = graphql.defaults({
        headers: {
            authorization: `Bearer ${adminToken}`,
        }
    })

    graphqlWithAuth(`
        mutation {
            ${review ? "deletePullRequestReviewComment" : "deleteIssueComment"}(input: {id: "${event.comment.node_id}", clientMutationId: "github-discord-bot"}) {
                clientMutationId
            }
        }
    `)
};