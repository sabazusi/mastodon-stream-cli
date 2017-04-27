#!/usr/bin/env node

const Mastodon = require('mastodon-api');
const openurl = require('openurl');
const inquirer = require('inquirer');
const striptags = require('striptags');
const chalk = require('chalk');

const nameColors = [
  chalk.styles.black,
  chalk.styles.red,
  chalk.styles.green,
  chalk.styles.yellow,
  chalk.styles.blue,
  chalk.styles.magenta,
  chalk.styles.cyan,
  chalk.styles.white
];

const emptyValidator = (name) => name ? true : 'Input something..';
const streamTypeMap = {
  'User': 'streaming/user',
  'Federated Timeline': 'streaming/public',
  'Local Timeline': 'streaming/public/local'
};

inquirer.prompt([
  {
    type: 'input',
    name: 'baseUrl',
    message: 'Input target mastodon base url',
    default: 'https://friends.nico',
    validator: emptyValidator
  },
  {
    type: 'list',
    name: 'streamType',
    message: 'Select target to subscribe',
    choices: ['User', 'Local Timeline', 'Federated Timeline']
  }
])
  .then((answers) => {
    const {
      baseUrl,
      streamType
    } = answers;

    Mastodon.createOAuthApp(
      `${baseUrl}/api/v1/apps`,
      'mastodon-api-stream'
    )
      .then((oauth) => {
        const {
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri
        } = oauth;
        Mastodon.getAuthorizationUrl(
          clientId,
          clientSecret,
          'https://friends.nico',
          'read',
          redirectUri
        ).then((url) => {
          openurl.open(url);
          inquirer.prompt([{
            type: 'input',
            name: 'authCode',
            message: 'Paste authorization code displaying after you logged in',
            validator: emptyValidator
          }])
            .then((authCodeAnswer) => {
              const { authCode } = authCodeAnswer;
              Mastodon.getAccessToken(clientId, clientSecret, authCode, baseUrl)
                .then((accessToken) => {
                  const mstdnClient = new Mastodon({
                    access_token: accessToken,
                    timeout_ms: 60 * 1000,
                    api_url: `${baseUrl}/api/v1/`
                  });
                  const stream = mstdnClient.stream(streamTypeMap[streamType]);
                  stream.on('message', (msg) => {
                    const { account, content } = msg.data;
                    if (!content || !account) return;
                    const screenName = account['display_name'];
                    const nameChalk = nameColors[ parseInt(account.id) % nameColors.length ];
                    console.log(nameChalk.open + screenName + nameChalk.close + ': ' + chalk.gray(striptags(content)));
                  });
                })
                .catch(e => console.log(e));
            });
        });
      });
  });
