import { Client, EmbedBuilder, TextChannel } from "discord.js";
import { IssuesOpenedEvent, PullRequestOpenedEvent } from "@octokit/webhooks-types";
import { prChannel, issueChannel, blacklist } from '../../config/config.json'
import { truncateString, isBlacklisted } from "./helpers";

export const OpenedPullRequest = async (client: Client, event: PullRequestOpenedEvent) => {
    const pullRequest = event.pull_request;

    if(isBlacklisted(pullRequest.title, pullRequest.user.login, pullRequest.body, blacklist)) {
        console.log(`Skipping PR "${pullRequest.title}" (#${pullRequest.number}) by ${pullRequest.user.login} for matching blacklist!`)
        return;
    }

    if(!prChannel) {
        return;
    }

    const channel = await client.channels.fetch(prChannel) as TextChannel;

    channel.send(`Pull Request #${event.number} opened by ${pullRequest.user.login}\n${pullRequest.user.login} - __**${pullRequest.title}**__\n<${pullRequest.html_url}>`);
}

export const OpenedIssue = async (client: Client, event: IssuesOpenedEvent) => {
    const issue = event.issue;

    const TITLE_LENGTH = 256;
    const AUTHOR_LENGTH = 256;
    const DESC_LENGTH = 500;

    if(isBlacklisted(issue.title, issue.user.login, issue.body, blacklist)) {
        console.log(`Skipping Issue "${issue.title}" (#${issue.number}) by ${issue.user.login} for matching blacklist!`)
        return;
    }

    if(!issueChannel) {
        return;
    }

    const channel = await client.channels.fetch(issueChannel) as TextChannel;
    let regex = /## Description of the bug(.*?)##/ms
    let match = issue.body?.match(regex);
    let snippet = "No description found.";

    if(match && match.length > 0) {
        snippet = truncateString(match[1], DESC_LENGTH).trim();
    }

    let embed = new EmbedBuilder();
    embed.setTitle(truncateString(`Issue opened: #${issue.number} ${issue.title}`, TITLE_LENGTH));
    embed.setURL(issue.html_url);
    embed.setAuthor({ name: truncateString(issue.user.login, AUTHOR_LENGTH), iconURL: issue.user.avatar_url, url: issue.user.html_url });
    embed.setDescription(snippet);

    channel.send({ embeds: [embed] })
}