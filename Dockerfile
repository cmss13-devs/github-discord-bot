FROM node:alpine

WORKDIR /home/discord_bot
COPY ./app/src/ /home/discord_bot/src/
COPY ./app/app.ts /home/discord_bot/app.ts
COPY package.json /home/discord_bot/package.json
COPY package-lock.json /home/discord_bot/package-lock.json
COPY tsconfig.json /home/discord_bot/tsconfig.json
COPY ./app/config/ /home/discord_bot/config/
COPY ./app/data/ /home/discord_bot/data/
RUN npm install
RUN npm run build

CMD ["npm", "start"]