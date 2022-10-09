import { Client, ForumChannel, TextChannel } from "discord.js";
import { PullRequestClosedEvent } from "@octokit/webhooks-types";
import { forumChannel, infoChannel } from '../../config/config.json'
import { readFileSync, existsSync } from 'fs'

export const ClosedMerged = async (client: Client, event: PullRequestClosedEvent) => {
    const channel = await client.channels.fetch(infoChannel) as TextChannel;
    channel.send(`Pull Request #${event.number} merged by ${event.pull_request.merged_by.login}\n${event.pull_request.user.login} - __**${event.pull_request.title}**__\n${event.pull_request.html_url}`);

    let data = {};
    if(existsSync("data/data.json")) {
        data = JSON.parse(readFileSync("data/data.json", "utf8"));
    }
    const threadId = data[event.number];

    if(!threadId) {
        return;
    }

    const forum = await client.channels.fetch(forumChannel) as ForumChannel;
    const thread = await forum.threads.fetch(threadId);

    if(!thread) {
        return;
    }

    await thread.send(`Pull Request #${event.number} merged by ${event.pull_request.merged_by.login}`);
    thread.setArchived(true);
}