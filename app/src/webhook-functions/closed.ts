import { Client, ForumChannel } from "discord.js";
import { PullRequestClosedEvent } from "@octokit/webhooks-types";
import { forumChannel } from '../../config/config.json'
import { readFileSync, existsSync } from 'fs'

export const Closed = async (client: Client, event: PullRequestClosedEvent) => {
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

    await thread.send(`Pull Request #${event.number} closed by ${event.sender.login}`);
    thread.setArchived(true);
}