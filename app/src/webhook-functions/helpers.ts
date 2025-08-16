import { Octokit } from "octokit";
import config from "../../config/config.json" with { type: "json" };
const { adminToken, blocklist } = config;

// https://stackoverflow.com/a/57688223
export const truncateString = (string = '', maxLength = 256) =>
    string.length > maxLength
        ? `${string.substring(0, maxLength - 3)}…`
        : string

export const isBlacklisted = (title: string | null, author: string | null, body: string | null, blacklist: string[]) => {
    if (blacklist.length == 0) {
        return false;
    }

    var regex = new RegExp(blacklist.join("|"), "i");

    if (title && regex.test(title)) {
        return true;
    }
    if (author && regex.test(author)) {
        return true;
    }
    if (body && regex.test(body)) {
        return true;
    }

    return false;
}

const BLOCKLIST = new RegExp(blocklist.join("|"), "i");

export const isBlocklisted = (...toTest: (string | null)[]) => {
    if (!blocklist || !blocklist.length) {
        return false;
    }

    for (const element of toTest) {
        if (element && BLOCKLIST.test(element)) {
            return true;
        }
    }

    return false;
}

const OCTOKIT = new Octokit({ auth: adminToken });

export const blockUser = async (user: string, org: string) => {
    try {
        await OCTOKIT.rest.orgs.blockUser({ org: org, username: user });
    } catch (error) {
        console.error(`Failed to block user ${user} in org ${org}:`, error);
    }
}