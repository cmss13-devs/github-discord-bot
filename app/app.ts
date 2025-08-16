import { Client, GatewayIntentBits } from 'discord.js';
import { IssueCommentEditedEvent, IssueCommentEvent, WebhookEvent } from "@octokit/webhooks-types";
import config from "./config/config.json" with { type: "json" };
import express from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { ClosedMergedPullRequest, ClosedIssue } from './src/webhook-functions/closed-merged.js';
import { OpenedPullRequest, OpenedIssue } from './src/webhook-functions/opened.js';
import { IssueComment } from './src/webhook-functions/comment.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] })
const app = express();

app.use(express.json({
    verify: (req, res, buf) => {
        const signature = req.headers['x-hub-signature-256'] as string;
        if (!signature) {
            res.status(400).send("Missing signature");
            return;
        }
        const hmac = createHmac('sha256', config.githubWebhookAuthorizationToken);
        const digest = Buffer.from('sha256=' + hmac.update(buf).digest('hex'), 'utf8');
        const checksum = Buffer.from(signature, 'utf8');
        if (!timingSafeEqual(digest as any, checksum as any)) {
            res.status(400).send("Invalid signature");
            return;
        }
    }
}));

app.post("/", async (req, res) => {
    const data: WebhookEvent = req.body;

    if ("action" in data) {
        if ("comment" in data && data.action != "deleted") {
            IssueComment(data as IssueCommentEvent, "pull_request" in data);
            return res.send("OK");
        }


        if ("pull_request" in data) {
            if (data.action === "opened") {
                OpenedPullRequest(client, data);
                return res.send("OK");
            }

            if (data.action === "closed") {
                if (data.pull_request.merged) {
                    ClosedMergedPullRequest(client, data);
                    return res.send("OK");
                }
            }
        }
        else if ("issue" in data) {
            if (data.action === "opened") {
                OpenedIssue(client, data);
                return res.send("OK");
            }

            if (data.action === "closed") {
                ClosedIssue(client, data);
                return res.send("OK");
            }
        }
    }

    return res.send("OK")
})

client.once('ready', () => {
    console.log("Ready!")
})

app.listen(3000)

client.login(config.accessToken);