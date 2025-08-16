import { IssueCommentEvent, PullRequestReviewCommentEvent } from "@octokit/webhooks-types";
import { blockUser, isBlacklisted, isBlocklisted } from "./helpers.js";
import config from "../../config/config.json" with {type: "json"};
const { blacklist, adminToken } = config;
import { graphql } from "@octokit/graphql";

export const IssueComment = async (event: IssueCommentEvent, review: boolean) => {
    if (!isBlacklisted(null, event.comment.user.login, event.comment.body, blacklist)) {
        return;
    }

    if (!adminToken?.length) return;

    const graphqlWithAuth = graphql.defaults({
        headers: {
            authorization: `Bearer ${adminToken}`,
        }
    })
    console.log(`Deleting ${review ? "pull request review" : "issue"} comment by "${event.comment.user.login}" (id: ${event.comment.node_id}) due to blacklisted content: "${event.comment.body}"`);
    graphqlWithAuth(`
        mutation {
            ${review ? "deletePullRequestReviewComment" : "deleteIssueComment"}(input: {id: "${event.comment.node_id}", clientMutationId: "github-discord-bot"}) {
                clientMutationId
            }
        }
    `)

    if (!isBlocklisted(event.comment.body, event.comment.user.login)) {
        return;
    }

    console.log(`Blocking user "${event.comment.user.login}" from organization "${event.repository.owner.login}" due to blocklisted comment: "${event.comment.body}"`);
    blockUser(event.comment.user.login, event.repository.owner.login);
};