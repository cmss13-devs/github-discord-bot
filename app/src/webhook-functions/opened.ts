import { Client, TextChannel } from "discord.js";
import { IssuesOpenedEvent, PullRequestOpenedEvent } from "@octokit/webhooks-types";
import { prChannel, issueChannel, blacklist } from '../../config/config.json'
import { truncateString, isBlacklisted } from "./helpers";

export const OpenedPullRequest = async (client: Client, event: PullRequestOpenedEvent) => {
    const pullRequest = event.pull_request;

    if(isBlacklisted(pullRequest.title, pullRequest.user.login, pullRequest.body, blacklist)) {
        return;
    }

    const channel = await client.channels.fetch(prChannel) as TextChannel;
    
    channel.send(`Pull Request #${event.number} opened by ${pullRequest.user.login}\n${pullRequest.user.login} - __**${pullRequest.title}**__\n<${pullRequest.html_url}>`);
}

export const OpenedIssue = async (client: Client, event: IssuesOpenedEvent) => {
    const issue = event.issue;
    const body = issue.body;
    const DESC_LENGTH = 500;

    if(isBlacklisted(issue.title, issue.user.login, issue.body, blacklist)) {
        return;
    }

    const channel = await client.channels.fetch(issueChannel) as TextChannel;
    let regex = /## Description of the bug(.*?)##/ms
    let match = body?.match(regex);
    let snippet = "";

    if(match && match.length > 0) {
        snippet = "\n> " + truncateString(match[1], DESC_LENGTH).trim();
    }

    channel.send(`Issue #${issue.number} opened by ${issue.user.login}\n__**${issue.title}**__\n<${issue.html_url}>${snippet}`)
}