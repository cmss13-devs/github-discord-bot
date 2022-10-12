import { Client, ForumChannel, TextChannel } from "discord.js";
import { PullRequestEvent } from "@octokit/webhooks-types";
import { forumChannel, infoChannel, changelogTagsToSearchFor } from '../../config/config.json'
import { writeFileSync, readFileSync, existsSync } from 'fs'

export const Opened = async (client: Client, event: PullRequestEvent) => {
    const channel = await client.channels.fetch(infoChannel) as TextChannel;
    const pullRequest = event.pull_request
    channel.send(`Pull Request #${event.number} opened by ${pullRequest.user.login}\n${pullRequest.user.login} - __**${pullRequest.title}**__\n<${pullRequest.html_url}>`);

    const forum = await client.channels.fetch(forumChannel) as ForumChannel;

    const body = pullRequest.body

    if(!body) {
        return;
    }

    let regex = /🆑(.*)\/🆑/ms
    let changelog_match = regex.exec(body);
	if(changelog_match === null) {
        regex = /:cl:(.*)\/:cl:/ms
		changelog_match = regex.exec(body);
		if(changelog_match === null) {
			return
        }
    }

    const changelog = changelog_match[0].trim().split("\n").map(val => val.replace(/:(.*)/, "").trim());

    let containedLabels = [];
    for(const label of changelog) {
        if(changelogTagsToSearchFor[label] !== undefined) {
            containedLabels.push(changelogTagsToSearchFor[label]);
        }
    }

    if(containedLabels.length === 0) {
        return;
    }

    const tagsToApply = forum.availableTags.filter(tag => containedLabels.includes(tag.name)).map(tag => tag.id)

    const thread = await forum.threads.create({
        name: `PR #${event.number} - ${pullRequest.title}`,
        message: {
            content: `Pull Request #${event.number} opened by ${pullRequest.user.login}!\n${pullRequest.user.login} - __**${pullRequest.title}**__\n<${pullRequest.html_url}>\n\nDiscuss feedback in here.`,
        },
        reason: "New Pull Request Opened",
        appliedTags: tagsToApply
    });

    let data = {};
    if(existsSync("data/data.json")) {
        data = JSON.parse(readFileSync("data/data.json", "utf8"));
    }
    data[event.number] = thread.id;
    writeFileSync("data/data.json", JSON.stringify(data));
}