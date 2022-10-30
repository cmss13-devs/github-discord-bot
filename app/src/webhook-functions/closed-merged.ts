import { Client, ForumChannel, TextChannel, EmbedBuilder } from "discord.js";
import { PullRequestClosedEvent } from "@octokit/webhooks-types";
import { forumChannel, infoChannel, changelogChannel } from '../../config/config.json'
import { readFileSync, existsSync } from 'fs'

const validChangelogTags = {
    "add": "Feature",
    "del": "Removal",
    "qol": "Quality of Life",
    "balance": "Balance",
    "fix": "Bugfixes",
    "soundadd": "Sound",
    "sounddel": "Sound",
    "imageadd": "Image",
    "imagedel": "Image",
    "spellcheck": "Grammar",
    "code": "Backend",
    "refactor": "Backend",
    "config": "Config",
    "admin": "Admin",
    "server": "Backend",
}

export const ClosedMerged = async (client: Client, event: PullRequestClosedEvent) => {
    const channel = await client.channels.fetch(infoChannel) as TextChannel;
    channel.send(`Pull Request #${event.number} merged by ${event.pull_request.merged_by.login}\n${event.pull_request.user.login} - __**${event.pull_request.title}**__\n<${event.pull_request.html_url}>`);


    const body = event.pull_request.body
    let regex = /🆑(.*)\/🆑/ms
    let changelog_match = regex.exec(body);
	if(changelog_match === null) {
        regex = /:cl:(.*)\/:cl:/ms
		changelog_match = regex.exec(body);
    }

    if(changelog_match) {
        const changelogList = changelog_match[0].trim().split("\n");
        let dataToPrint: Record<string, string[]> = {};
        const orderOfChangelog = [];
        for(const data of changelogList) {
            const label = data.replace(/:(.*)/, "").trim()
            if(label in validChangelogTags) {
                const fieldTitle = validChangelogTags[label]
                if(dataToPrint[fieldTitle] === undefined) {
                    dataToPrint[fieldTitle] = [];
                    orderOfChangelog.push(fieldTitle);
                }   
                dataToPrint[fieldTitle].push(`- ${data.replace(/(.*):/, "").trim()}`);
            }
        }

        if(Object.keys(dataToPrint).length >= 0) {
            const changelog = await client.channels.fetch(changelogChannel) as TextChannel;
            const embed = new EmbedBuilder()
                .setTitle(`${event.pull_request.title} (#${event.number})`);
            embed.setURL(event.pull_request.html_url);
            for(const key of orderOfChangelog) {
                const data = dataToPrint[key];
                embed.addFields({
                    name: key, 
                    value: data.join("\n")
                });
            }
            embed.setAuthor({ name: event.pull_request.user.login, iconURL: event.pull_request.user.avatar_url, url: event.pull_request.user.html_url });
            changelog.send({ embeds: [embed] });
        }
    }

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