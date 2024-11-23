import { Client, TextChannel, EmbedBuilder, APIEmbed } from "discord.js";
import { PullRequestClosedEvent } from "@octokit/webhooks-types";
import { infoChannel, changelogChannel } from '../../config/config.json'

const validChangelogTags = { // Up to 25 (per embed), max length per is 256
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
    "ui": "User Interface",
    "mapadd": "Mapping",
    "maptweak": "Mapping"
}

export const ClosedMerged = async (client: Client, event: PullRequestClosedEvent) => {
    const channel = await client.channels.fetch(infoChannel) as TextChannel;
    channel.send(`Pull Request #${event.number} merged by ${event.pull_request.merged_by.login}\n${event.pull_request.user.login} - __**${event.pull_request.title}**__\n<${event.pull_request.html_url}>`);

    const TITLE_LENGTH = 256;
    const AUTHOR_LENGTH = 256;
    const VALUE_LENGTH = 1000; // Actually 1024
    const EMBED_LENGTH = 6000;

    // https://stackoverflow.com/a/57688223
    const truncateString = (string = '', maxLength = 256) => 
        string.length > maxLength 
          ? `${string.substring(0, maxLength - 3)}…`
          : string

    // Until discord.js version bumping is sorted to do EmbedBuilder.length:
    // https://github.com/discordjs/discord.js/blob/main/packages/builders/src/util/componentUtil.ts#L8
    const embedLength = (data: APIEmbed) =>
        (data.title?.length ?? 0) +
        (data.description?.length ?? 0) +
        (data.fields?.reduce((prev, curr) => prev + curr.name.length + curr.value.length, 0) ?? 0) +
        (data.footer?.text.length ?? 0) +
        (data.author?.name.length ?? 0)

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
                // Truncate each line to 1002-1003 chars (depends on \n later on)
                dataToPrint[fieldTitle].push(`- ${truncateString(data.replace(/(.*):/, "").trim(), VALUE_LENGTH)}`);
            }
        }

        if(Object.keys(dataToPrint).length >= 0) {
            const changelog = await client.channels.fetch(changelogChannel) as TextChannel;
            const allEmbeds: EmbedBuilder[] = [new EmbedBuilder()];
            allEmbeds[0].setTitle(truncateString(`${event.pull_request.title} (#${event.number})`, TITLE_LENGTH));
            allEmbeds[0].setURL(event.pull_request.html_url);
            allEmbeds[0].setAuthor({ name: truncateString(event.pull_request.user.login, AUTHOR_LENGTH), iconURL: event.pull_request.user.avatar_url, url: event.pull_request.user.html_url });
            for(const key of orderOfChangelog) {
                // Split category to new message when approaching limit
                if(embedLength(allEmbeds[allEmbeds.length-1].data) >= EMBED_LENGTH - VALUE_LENGTH * 2) {
                    allEmbeds.push(new EmbedBuilder());
                }
                
                let dataTitle = key;
                let dataSoFar = "";
                for(let i = 0; i < dataToPrint[key].length; i++) {
                    dataSoFar += dataToPrint[key][i]
                    if(i != dataToPrint[key].length - 1) {
                        // This isn't the last one for this category...
                        dataSoFar += "\n";
                        const peekedLength = dataSoFar.length + dataToPrint[key][i+1].length;

                        // Split data to new message when approaching limit
                        if(embedLength(allEmbeds[allEmbeds.length-1].data) + peekedLength >= EMBED_LENGTH || peekedLength >= VALUE_LENGTH) {
                            allEmbeds[allEmbeds.length-1].addFields({
                                name: dataTitle,
                                value: dataSoFar
                            });
                            dataTitle = "\u200b"; // Blank
                            dataSoFar = "";
                            allEmbeds.push(new EmbedBuilder());
                        }
                    }
                }
                allEmbeds[allEmbeds.length-1].addFields({
                    name: dataTitle,
                    value: dataSoFar
                });
            }
            
            // Now actually send the message(s)
            for(const embed of allEmbeds) {
                changelog.send({ embeds: [embed] });
            }
        }
    }
}