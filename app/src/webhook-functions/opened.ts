import { Client, TextChannel } from "discord.js";
import { PullRequestEvent } from "@octokit/webhooks-types";
import { infoChannel } from '../../config/config.json'

export const Opened = async (client: Client, event: PullRequestEvent) => {
    const channel = await client.channels.fetch(infoChannel) as TextChannel;
    const pullRequest = event.pull_request
    channel.send(`Pull Request #${event.number} opened by ${pullRequest.user.login}\n${pullRequest.user.login} - __**${pullRequest.title}**__\n<${pullRequest.html_url}>`);
}