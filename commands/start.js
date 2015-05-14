var path = require('path');
var child = require('child_process');
var url = require('url');
var colors = require('colors');
var docker = require('../lib/docker');
var directory = require('../lib/directory');
var cli = require('heroku-cli-util');
var safely = require('../lib/safely');

var TEMPLATE_PATH = path.resolve(__dirname, '../templates/start-Dockerfile');

module.exports = function(topic) {
  return {
    topic: topic,
    command: 'start',
    description: 'start Docker app container',
    help: 'Start local Docker app container running Procfile-defined process. Default is `web` Procfile entry.',
    variableArgs: true,
    run: safely(start)
  };
};

function start(context) {
  var procfile = directory.readProcfile(context.cwd);
  if (!procfile) throw new Error('Procfile required. Aborting');

  var procName = context.args[0] || 'web';
  var command = procfile[procName];
  if (!command) throw new Error(`No '${procName}' process type declared in Procfile. Aborting`);

  var startImageId = docker.ensureStartImage(context.cwd);
  if (!startImageId) throw new Error('Unable to find or create docker image');

  try{
    var port = context.args.port.split(':');
    var ports = {
        to:port[1],
        from:port[2]
      };
  }catch(e){
    var ports = {
      to: 30000,
      from: 3000
    }
  }

  if(!ports.to) ports.to = ports.from;
  if(!ports.from) ports.from = ports.to;
  if(!ports.to) ports.from = ports.to = 3000;
  cli.log('\nstarting container...');
  if (procName === 'web') {
    cli.log('web process will be available at', colors.yellow.underline(getURL(port.to)));
  }
  return docker.runImage(startImageId, context.cwd, command, false, ports);
}

function getURL(port) {
  var host = url.parse(process.env.DOCKER_HOST || 'tcp://localhost').hostname;
  return `http://${host}:${port}/`;
}
