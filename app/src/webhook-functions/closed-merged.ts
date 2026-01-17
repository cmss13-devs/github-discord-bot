import { Client, TextChannel, EmbedBuilder, APIEmbed } from "discord.js";
import { IssuesClosedEvent, PullRequestClosedEvent } from "@octokit/webhooks-types";
import config from '../../config/config.json' with { type: "json" };
const { prChannel, issueChannel, changelogChannel, blacklist } = config;
import { truncateString, isBlacklisted } from "./helpers.js";

const validChangelogTags = { // Up to 25 (per embed), max length per is 256
    "add": "Feature",
    "del": "Removal",
    "qol": "Quality of Life",
    "balance": "Balance",
    "fix": "Bugfixes",
    "soundadd": "Sound",
    "sounddel": "Sound",
    "soundtweak": "Sound",
    "imageadd": "Image",
    "imagedel": "Image",
    "imagetweak": "Image",
    "spellcheck": "Grammar",
    "code": "Backend",
    "refactor": "Backend",
    "config": "Config",
    "admin": "Admin",
    "server": "Backend",
    "ui": "User Interface",
    "mapadd": "Mapping",
    "maptweak": "Mapping"
}

export const ClosedMergedPullRequest = async (client: Client, event: PullRequestClosedEvent) => {
    const pullRequest = event.pull_request;

    if (prChannel) {
        const channel = await client.channels.fetch(prChannel) as TextChannel;
        channel.send(`Pull Request #${event.number} merged by ${pullRequest.merged_by?.login}\n${pullRequest.user.login} - __**${pullRequest.title}**__\n<${pullRequest.html_url}>`);
    }

    if (!changelogChannel) {
        return;
    }

    const TITLE_LENGTH = 256;
    const AUTHOR_LENGTH = 256;
    const VALUE_LENGTH = 1000; // Actually 1024
    const EMBED_LENGTH = 6000;

    // Until discord.js version bumping is sorted to do EmbedBuilder.length:
    // https://github.com/discordjs/discord.js/blob/main/packages/builders/src/util/componentUtil.ts#L8
    const embedLength = (data: APIEmbed) =>
        (data.title?.length ?? 0) +
        (data.description?.length ?? 0) +
        (data.fields?.reduce((prev, curr) => prev + curr.name.length + curr.value.length, 0) ?? 0) +
        (data.footer?.text.length ?? 0) +
        (data.author?.name.length ?? 0)

    const body = pullRequest.body
    let regex = /(?:🆑|:cl:)(.*)\/(?:🆑|:cl:)/ms
    let changelog_match = regex.exec(body!);

    if (changelog_match) {
        const changelogList = changelog_match[0].trim().split("\n");
        let dataToPrint: Record<string, string[]> = {};
        const orderOfChangelog: string[] = [];
        for (const data of changelogList) {
            const label = data.replace(/:(.*)/, "").trim()
            if (label in validChangelogTags) {
                const fieldTitle: string = validChangelogTags[label]
                if (dataToPrint[fieldTitle] === undefined) {
                    dataToPrint[fieldTitle] = [];
                    orderOfChangelog.push(fieldTitle);
                }
                // Truncate each line to 1002-1003 chars (depends on \n later on)
                dataToPrint[fieldTitle].push(`- ${truncateString(data.replace(/^(.*?):/, "").trim(), VALUE_LENGTH)}`);
            }
        }

        if (Object.keys(dataToPrint).length >= 0) {
            const changelog = await client.channels.fetch(changelogChannel) as TextChannel;
            const allEmbeds: EmbedBuilder[] = [new EmbedBuilder()];
            allEmbeds[0].setTitle(truncateString(`${pullRequest.title} (#${event.number})`, TITLE_LENGTH));
            allEmbeds[0].setURL(pullRequest.html_url);
            allEmbeds[0].setAuthor({
                name: truncateString(pullRequest.user.login, AUTHOR_LENGTH),
                iconURL: pullRequest.user.avatar_url,
                url: pullRequest.user.html_url
            });
            for (const key of orderOfChangelog) {
                // Split category to new message when approaching limit
                if (embedLength(allEmbeds[allEmbeds.length - 1].data) >= EMBED_LENGTH - VALUE_LENGTH * 2) {
                    allEmbeds.push(new EmbedBuilder());
                }

                let dataTitle = key;
                let dataSoFar = "";
                for (let i = 0; i < dataToPrint[key].length; i++) {
                    dataSoFar += dataToPrint[key][i]
                    if (i != dataToPrint[key].length - 1) {
                        // This isn't the last one for this category...
                        dataSoFar += "\n";
                        const peekedLength = dataSoFar.length + dataToPrint[key][i + 1].length;

                        // Split data to new message when approaching limit
                        if (embedLength(allEmbeds[allEmbeds.length - 1].data) + peekedLength >= EMBED_LENGTH || peekedLength >= VALUE_LENGTH) {
                            allEmbeds[allEmbeds.length - 1].addFields({
                                name: dataTitle,
                                value: dataSoFar
                            });
                            dataTitle = "\u200b"; // Blank
                            dataSoFar = "";
                            allEmbeds.push(new EmbedBuilder());
                        }
                    }
                }
                allEmbeds[allEmbeds.length - 1].addFields({
                    name: dataTitle,
                    value: dataSoFar
                });
            }

            // Now actually send the message(s)
            for (const embed of allEmbeds) {
                changelog.send({ embeds: [embed] });
            }
        }
    }
}

export const ClosedIssue = async (client: Client, event: IssuesClosedEvent) => {
    const issue = event.issue;

    const TITLE_LENGTH = 256;
    const AUTHOR_LENGTH = 256;

    if (isBlacklisted(issue.title, issue.user.login, issue.body, blacklist)) {
        console.log(`Skipping Issue close "${issue.title}" (#${issue.number}) by ${issue.user.login} for matching blacklist!`)
        return;
    }

    if (!issueChannel) {
        return;
    }

    const channel = await client.channels.fetch(issueChannel) as TextChannel;
    let embed = new EmbedBuilder();
    embed.setTitle(truncateString(`Issue closed: #${issue.number} ${issue.title}`, TITLE_LENGTH));
    embed.setURL(issue.html_url);
    embed.setAuthor({ name: truncateString(event.sender.login, AUTHOR_LENGTH), iconURL: event.sender.avatar_url, url: event.sender.html_url });

    channel.send({ embeds: [embed] })
}
